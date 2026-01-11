import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const YOUTUBE_API_KEY = Deno.env.get('YOUTUBE_API_KEY')!;

// Parse channel URL (inline from working implementation)
function parseChannelUrl(url: string): { type: 'channel' | 'custom' | 'user' | 'handle'; id: string } | null {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;

    if (pathname.startsWith('/@')) {
      return { type: 'handle', id: pathname.substring(2).replace(/\/$/, '') };
    }
    if (pathname.startsWith('/channel/')) {
      return { type: 'channel', id: pathname.split('/')[2] };
    }
    if (pathname.startsWith('/c/')) {
      return { type: 'custom', id: pathname.split('/')[2] };
    }
    if (pathname.startsWith('/user/')) {
      return { type: 'user', id: pathname.split('/')[2] };
    }
    return null;
  } catch {
    return null;
  }
}

// Resolve channel ID using YouTube API (inline from working implementation)
async function resolveChannelId(parsedUrl: { type: string; id: string }, apiKey: string) {
  let endpoint = '';
  
  if (parsedUrl.type === 'channel') {
    endpoint = `https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails,statistics&id=${parsedUrl.id}&key=${apiKey}`;
  } else if (parsedUrl.type === 'handle') {
    endpoint = `https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails,statistics&forHandle=${parsedUrl.id}&key=${apiKey}`;
  } else if (parsedUrl.type === 'custom' || parsedUrl.type === 'user') {
    endpoint = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${parsedUrl.id}&key=${apiKey}`;
    const searchResponse = await fetch(endpoint);
    const searchData = await searchResponse.json();
    
    if (searchData.items && searchData.items.length > 0) {
      const channelId = searchData.items[0].id.channelId;
      endpoint = `https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails,statistics&id=${channelId}&key=${apiKey}`;
    } else {
      return null;
    }
  }

  const response = await fetch(endpoint);
  const data = await response.json();

  if (data.error) {
    console.error('YouTube API error:', data.error);
    if (data.error.errors?.[0]?.reason === 'quotaExceeded') {
      throw new Error('QUOTA_EXCEEDED');
    }
    throw new Error(data.error.message);
  }

  if (!data.items || data.items.length === 0) {
    return null;
  }

  const channel = data.items[0];
  return {
    channel_id: channel.id,
    channel_name: channel.snippet.title,
    avatar_url: channel.snippet.thumbnails?.high?.url || channel.snippet.thumbnails?.default?.url || '',
    subscriber_count: channel.statistics?.subscriberCount || '0',
    uploads_playlist_id: channel.contentDetails?.relatedPlaylists?.uploads || '',
  };
}

// Fetch video IDs from playlist (inline from working implementation)
async function fetchPlaylistVideoIds(playlistId: string, apiKey: string, maxVideos: number = 10): Promise<string[]> {
  const videoIds: string[] = [];
  let nextPageToken = '';
  
  while (videoIds.length < maxVideos) {
    const endpoint = `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails,snippet&playlistId=${playlistId}&maxResults=50&pageToken=${nextPageToken}&key=${apiKey}`;
    const response = await fetch(endpoint);
    const data = await response.json();

    if (data.error) {
      console.error('YouTube API error:', data.error);
      if (data.error.errors?.[0]?.reason === 'quotaExceeded') {
        throw new Error('QUOTA_EXCEEDED');
      }
      throw new Error(data.error.message);
    }

    if (!data.items || data.items.length === 0) break;

    for (const item of data.items) {
      if (!item.contentDetails?.videoId) continue;
      if (videoIds.length < maxVideos) {
        videoIds.push(item.contentDetails.videoId);
      }
    }

    nextPageToken = data.nextPageToken || '';
    if (!nextPageToken || videoIds.length >= maxVideos) break;
  }

  return videoIds;
}

// Parse duration helper
function parseDuration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);
  return hours * 3600 + minutes * 60 + seconds;
}

// Fetch video metadata (inline from working implementation)
async function fetchVideoMetadata(videoIds: string[], apiKey: string) {
  const videos: unknown[] = [];
  const batchSize = 50;

  for (let i = 0; i < videoIds.length; i += batchSize) {
    const batch = videoIds.slice(i, i + batchSize);
    const ids = batch.join(',');
    const endpoint = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics,liveStreamingDetails&id=${ids}&key=${apiKey}`;
    
    const response = await fetch(endpoint);
    const data = await response.json();

    if (data.error) {
      if (data.error.errors?.[0]?.reason === 'quotaExceeded') {
        throw new Error('QUOTA_EXCEEDED');
      }
      throw new Error(data.error.message);
    }

    if (data.items) {
      for (const item of data.items) {
        const durationSeconds = parseDuration(item.contentDetails?.duration || 'PT0S');
        const hasLiveStreamingDetails = item.liveStreamingDetails != null;
        videos.push({
          video_id: item.id,
          title: item.snippet?.title || '',
          description: item.snippet?.description || '',
          published_at: item.snippet?.publishedAt || '',
          duration: item.contentDetails?.duration || '',
          duration_seconds: durationSeconds,
          thumbnail_url: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.default?.url || '',
          view_count: parseInt(item.statistics?.viewCount || '0', 10),
          like_count: parseInt(item.statistics?.likeCount || '0', 10),
          live_broadcast_content: item.snippet?.liveBroadcastContent,
          has_live_streaming_details: hasLiveStreamingDetails,
        });
      }
    }
  }

  return videos;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Ingestion function called');
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({ error: 'Supabase configuration missing', success: false }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!YOUTUBE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'YouTube API key not configured', success: false }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    const body = await req.json();
    const { channelUrl, userId, videoLimit = 5 } = body;
    
    console.log('Request body:', { channelUrl, userId, videoLimit });

    if (!channelUrl) {
      return new Response(
        JSON.stringify({ error: 'Channel URL is required', success: false }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse channel URL
    const parsedUrl = parseChannelUrl(channelUrl);
    if (!parsedUrl) {
      return new Response(
        JSON.stringify({ error: 'Invalid YouTube channel URL', success: false }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Parsed channel URL:', parsedUrl);

    // Resolve channel information using YouTube API
    const channelInfo = await resolveChannelId(parsedUrl, YOUTUBE_API_KEY);
    if (!channelInfo) {
      return new Response(
        JSON.stringify({ error: 'Channel not found', success: false }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Resolved channel info:', channelInfo);

    // Check if channel already exists
    const { data: existingChannel, error: selectError } = await supabase
      .from('channels')
      .select('*')
      .eq('channel_id', channelInfo.channel_id)
      .single();

    console.log('Existing channel check:', { existingChannel, selectError });

    let channel;
    if (existingChannel) {
      console.log('Channel already exists, updating...');
      const { data: updatedChannel, error: updateError } = await supabase
        .from('channels')
        .update({
          channel_name: channelInfo.channel_name,
          avatar_url: channelInfo.avatar_url,
          subscriber_count: channelInfo.subscriber_count,
          uploads_playlist_id: channelInfo.uploads_playlist_id,
          ingestion_status: 'processing',
          ingestion_progress: 0,
          last_indexed_at: new Date().toISOString(),
        })
        .eq('channel_id', channelInfo.channel_id)
        .select()
        .single();
      
      if (updateError) {
        console.error('Update error:', updateError);
        throw updateError;
      }
      channel = updatedChannel;
    } else {
      console.log('Creating new channel...');
      const { data: newChannel, error: insertError } = await supabase
        .from('channels')
        .insert({
          channel_id: channelInfo.channel_id,
          channel_name: channelInfo.channel_name,
          channel_url: channelUrl,
          avatar_url: channelInfo.avatar_url,
          subscriber_count: channelInfo.subscriber_count,
          uploads_playlist_id: channelInfo.uploads_playlist_id,
          ingestion_status: 'processing',
          ingestion_progress: 0,
          indexed_videos: 0,
          total_videos: 0,
          last_indexed_at: new Date().toISOString(),
        })
        .select()
        .single();
      
      if (insertError) {
        console.error('Insert error:', insertError);
        throw insertError;
      }
      channel = newChannel;
    }

    console.log('Channel created/updated:', channel);

    // Link user to channel if userId provided
    if (userId) {
      console.log('Linking user to channel:', { userId, channelId: channel.id });
      const { error: linkError } = await supabase
        .from('user_creators')
        .upsert({
          user_id: userId,
          channel_id: channel.id,
          created_at: new Date().toISOString(),
        });
      
      if (linkError) {
        console.error('Link error:', linkError);
        // Don't throw, just log
      } else {
        // Increment creator count for successful user association
        console.log('Incrementing creator count for user:', userId);
        const { error: creatorCountError } = await supabase.rpc('increment_creator_count', { 
          p_user_id: userId 
        });
        if (creatorCountError) {
          console.error('Error incrementing creator count:', creatorCountError);
          // Don't throw, just log
        }
      }
    }

    // Fetch video IDs from uploads playlist
    if (!channelInfo.uploads_playlist_id) {
      return new Response(
        JSON.stringify({ error: 'Channel uploads playlist not found', success: false }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetching video IDs from playlist:', channelInfo.uploads_playlist_id);
    const videoIds = await fetchPlaylistVideoIds(channelInfo.uploads_playlist_id, YOUTUBE_API_KEY, videoLimit);
    console.log(`Fetched ${videoIds.length} video IDs`);

    if (videoIds.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Channel found but no videos available',
          channel: {
            id: channel.id,
            channel_id: channelInfo.channel_id,
            channel_name: channelInfo.channel_name,
            indexed_videos: 0,
            total_videos: 0,
            ingestion_status: 'completed',
            ingestion_progress: 100,
          },
          videos: [],
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch video metadata
    console.log('Fetching video metadata...');
    const videos = await fetchVideoMetadata(videoIds, YOUTUBE_API_KEY);
    console.log(`Fetched metadata for ${videos.length} videos`);

    // Insert videos into database
    const videosToInsert = videos.map(video => ({
      video_id: video.video_id,
      channel_id: channelInfo.channel_id,
      title: video.title,
      description: video.description,
      published_at: video.published_at,
      duration: video.duration,
      duration_seconds: video.duration_seconds,
      thumbnail_url: video.thumbnail_url,
      view_count: video.view_count,
      like_count: video.like_count,
      live_broadcast_content: video.live_broadcast_content,
      has_live_streaming_details: video.has_live_streaming_details,
    }));

    console.log('Inserting videos into database:', videosToInsert.length);

    const { error: videoError } = await supabase
      .from('videos')
      .upsert(videosToInsert, { onConflict: 'video_id' });
    
    if (videoError) {
      console.error('Video insert error:', videoError);
      throw videoError;
    }

    // Increment videos indexed count for user if userId provided
    if (userId && videos.length > 0) {
      console.log('Incrementing videos indexed for user:', userId, 'count:', videos.length);
      const { error: videosCountError } = await supabase.rpc('increment_videos_indexed', { 
        p_user_id: userId, 
        p_count: videos.length 
      });
      if (videosCountError) {
        console.error('Error incrementing videos count:', videosCountError);
        // Don't throw, just log
      }
    }

    // Update channel with completion status
    const { error: finalUpdateError } = await supabase
      .from('channels')
      .update({
        ingestion_status: 'completed',
        ingestion_progress: 100,
        indexed_videos: videos.length,
        total_videos: videos.length,
      })
      .eq('id', channel.id);

    if (finalUpdateError) {
      console.error('Final update error:', finalUpdateError);
      // Don't throw, just log
    }

    const response = {
      success: true,
      message: `Successfully ingested ${videos.length} videos from ${channelInfo.channel_name}`,
      channel: {
        id: channel.id,
        channel_id: channelInfo.channel_id,
        channel_name: channelInfo.channel_name,
        indexed_videos: videos.length,
        total_videos: videos.length,
        ingestion_status: 'completed',
        ingestion_progress: 100,
      },
      videos: videos.map(v => ({
        video_id: v.video_id,
        title: v.title,
        published_at: v.published_at,
        duration_seconds: v.duration_seconds,
      })),
    };

    // Trigger automatic pipeline processing
    if (videos.length > 0) {
      console.log('Triggering automatic pipeline processing for channel:', channelInfo.channel_id);
      
      try {
        // Step 1: Trigger transcript extraction
        console.log('Invoking extract-transcripts function...');
        const { error: extractError } = await supabase.functions.invoke('extract-transcripts', {
          body: { channelId: channelInfo.channel_id },
          headers: {
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (extractError) {
          console.error('Error triggering transcript extraction:', extractError);
        } else {
          console.log('Transcript extraction triggered successfully');
          
          // Step 2: Trigger embedding generation (run after transcript extraction)
          console.log('Invoking run-pipeline function...');
          const { error: pipelineError } = await supabase.functions.invoke('run-pipeline', {
            body: { 
              channel_id: channelInfo.channel_id,
              process_all: true 
            },
            headers: {
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (pipelineError) {
            console.error('Error triggering pipeline:', pipelineError);
          } else {
            console.log('Pipeline triggered successfully');
          }
        }
      } catch (pipelineError) {
        console.error('Pipeline trigger failed:', pipelineError);
        // Don't throw - ingestion was successful, pipeline is bonus
      }
    }

    console.log('Returning success response');

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Ingestion error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    console.error('Error JSON:', JSON.stringify(error, null, 2));
    
    let errorMessage = 'Unknown error';
    let errorDetails = {};
    
    if (error instanceof Error) {
      errorMessage = error.message;
      errorDetails = { stack: error.stack };
    } else if (typeof error === 'object' && error !== null) {
      errorMessage = error.message || error.error || JSON.stringify(error);
      errorDetails = error;
    } else {
      errorMessage = String(error);
    }
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        success: false,
        details: errorDetails,
        errorType: typeof error
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
