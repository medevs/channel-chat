import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const YOUTUBE_API_KEY = Deno.env.get('YOUTUBE_API_KEY')!;

// Parse channel URL
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

// Resolve channel ID using YouTube API
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
    total_video_count: parseInt(channel.statistics?.videoCount || '0', 10),
  };
}

// Fetch video IDs with optional date filter for refresh
async function fetchPlaylistVideoIds(
  playlistId: string, 
  apiKey: string, 
  maxVideos: number = 10, 
  publishedAfter?: string
): Promise<string[]> {
  const videoIds: string[] = [];
  let nextPageToken = '';
  
  while (videoIds.length < maxVideos) {
    let endpoint = `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails,snippet&playlistId=${playlistId}&maxResults=50&pageToken=${nextPageToken}&key=${apiKey}`;
    
    // Add date filter for refresh mode
    if (publishedAfter) {
      endpoint += `&publishedAfter=${publishedAfter}`;
    }
    
    const response = await fetch(endpoint);
    const data = await response.json();

    if (data.error) {
      console.error('YouTube API error:', data.error);
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

// Fetch video metadata
async function fetchVideoMetadata(videoIds: string[], apiKey: string) {
  const videos: any[] = [];
  const batchSize = 50;

  for (let i = 0; i < videoIds.length; i += batchSize) {
    const batch = videoIds.slice(i, i + batchSize);
    const ids = batch.join(',');
    const endpoint = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics,liveStreamingDetails&id=${ids}&key=${apiKey}`;
    
    const response = await fetch(endpoint);
    const data = await response.json();

    if (data.error) {
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
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !YOUTUBE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Configuration missing', success: false }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    const body = await req.json();
    const { 
      channelUrl, 
      userId, 
      refresh = false,
      channelId: existingChannelId,
      videoLimit = 20, // Increased default limit 
      importSettings, 
      returnImmediately = false
    } = body;
    
    const isRefresh = refresh === true && existingChannelId;
    
    // For existing channels, check their import limit setting
    let actualVideoLimit = importSettings?.limit || videoLimit;
    
    console.log('Request:', { channelUrl, userId, isRefresh, existingChannelId, actualVideoLimit });

    if (!channelUrl && !isRefresh) {
      return new Response(
        JSON.stringify({ error: 'Channel URL is required', success: false }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let channelInfo;
    let existingChannel;

    if (isRefresh) {
      // For refresh, get existing channel data
      const { data: channel, error: selectError } = await supabase
        .from('channels')
        .select('*')
        .eq('id', existingChannelId)
        .single();

      if (selectError || !channel) {
        return new Response(
          JSON.stringify({ error: 'Channel not found for refresh', success: false }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      existingChannel = channel;
      
      // Use channel's import limit if set
      if (channel.video_import_limit && !importSettings?.limit) {
        actualVideoLimit = channel.video_import_limit;
      }
      
      // Get updated channel info from YouTube API
      const parsedUrl = { type: 'channel', id: channel.channel_id };
      channelInfo = await resolveChannelId(parsedUrl, YOUTUBE_API_KEY);
      
      if (!channelInfo) {
        return new Response(
          JSON.stringify({ error: 'Channel not found on YouTube', success: false }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check for new videos since last_indexed_at
      let publishedAfter;
      if (channel.last_indexed_at) {
        publishedAfter = new Date(channel.last_indexed_at).toISOString();
        console.log('Refresh mode: filtering videos published after', publishedAfter);
      }

      const videoIds = await fetchPlaylistVideoIds(
        channelInfo.uploads_playlist_id, 
        YOUTUBE_API_KEY, 
        actualVideoLimit,
        publishedAfter
      );

      // If refresh and no new videos, return up-to-date status
      if (videoIds.length === 0) {
        console.log('Channel is up to date, no new videos');
        return new Response(
          JSON.stringify({
            success: true,
            up_to_date: true,
            channel: {
              id: existingChannel.id,
              channel_id: existingChannel.channel_id,
              channel_name: existingChannel.channel_name,
              avatar_url: existingChannel.avatar_url,
              subscriber_count: existingChannel.subscriber_count,
              indexed_videos: existingChannel.indexed_videos,
              total_videos: existingChannel.total_videos,
              ingestion_status: existingChannel.ingestion_status,
              last_indexed_at: existingChannel.last_indexed_at,
            },
            message: 'Creator is up to date. No new videos found.',
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Process new videos
      const videos = await fetchVideoMetadata(videoIds, YOUTUBE_API_KEY);
      
      // Insert new videos
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

      await supabase
        .from('videos')
        .upsert(videosToInsert, { onConflict: 'video_id' });

      // Count actual videos in database after upsert
      const { count: actualVideoCount } = await supabase
        .from('videos')
        .select('*', { count: 'exact', head: true })
        .eq('channel_id', channelInfo.channel_id);

      // Update channel
      await supabase
        .from('channels')
        .update({
          last_indexed_at: new Date().toISOString(),
          indexed_videos: actualVideoCount || 0,
          total_videos: channelInfo.total_video_count,
        })
        .eq('id', existingChannel.id);

      // Return success with new video count
      return new Response(
        JSON.stringify({
          success: true,
          new_videos_count: videos.length,
          channel: {
            id: existingChannel.id,
            channel_id: existingChannel.channel_id,
            channel_name: existingChannel.channel_name,
            avatar_url: existingChannel.avatar_url,
            subscriber_count: existingChannel.subscriber_count,
            indexed_videos: actualVideoCount || 0,
            total_videos: channelInfo.total_video_count,
            ingestion_status: 'processing',
            last_indexed_at: new Date().toISOString(),
          },
          message: `Found ${videos.length} new videos. Processing transcripts...`,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Regular ingestion flow (non-refresh)
    const parsedUrl = parseChannelUrl(channelUrl);
    if (!parsedUrl) {
      return new Response(
        JSON.stringify({ error: 'Invalid YouTube channel URL', success: false }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    channelInfo = await resolveChannelId(parsedUrl, YOUTUBE_API_KEY);
    if (!channelInfo) {
      return new Response(
        JSON.stringify({ error: 'Channel not found', success: false }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if channel already exists
    const { data: existing, error: selectError } = await supabase
      .from('channels')
      .select('*')
      .eq('channel_id', channelInfo.channel_id)
      .single();

    let channel;
    if (existing) {
      // Update existing channel
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
      
      if (updateError) throw updateError;
      channel = updatedChannel;
    } else {
      // Create new channel
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
      
      if (insertError) throw insertError;
      channel = newChannel;
    }

    // Link user to channel if userId provided
    if (userId) {
      await supabase
        .from('user_creators')
        .upsert({
          user_id: userId,
          channel_id: channel.id,
          created_at: new Date().toISOString(),
        });
    }

    // Fetch and process videos
    const videoIds = await fetchPlaylistVideoIds(channelInfo.uploads_playlist_id, YOUTUBE_API_KEY, actualVideoLimit);
    
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
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const videos = await fetchVideoMetadata(videoIds, YOUTUBE_API_KEY);

    // Insert videos
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

    await supabase
      .from('videos')
      .upsert(videosToInsert, { onConflict: 'video_id' });

    // Count actual videos in database after upsert
    const { count: actualVideoCount } = await supabase
      .from('videos')
      .select('*', { count: 'exact', head: true })
      .eq('channel_id', channelInfo.channel_id);

    // Count videos with completed transcripts (ready for chat)
    const { count: readyVideoCount } = await supabase
      .from('videos')
      .select(`
        video_id,
        transcripts!inner(extraction_status)
      `, { count: 'exact', head: true })
      .eq('channel_id', channelInfo.channel_id)
      .eq('transcripts.extraction_status', 'completed');

    // Update channel completion status
    await supabase
      .from('channels')
      .update({
        ingestion_status: 'completed',
        ingestion_progress: 100,
        indexed_videos: readyVideoCount || 0, // Count of videos ready for chat
        total_videos: channelInfo.total_video_count,
      })
      .eq('id', channel.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully ingested ${videos.length} videos from ${channelInfo.channel_name}`,
        channel: {
          id: channel.id,
          channel_id: channelInfo.channel_id,
          channel_name: channelInfo.channel_name,
          indexed_videos: readyVideoCount || 0, // Count of videos ready for chat
          total_videos: channelInfo.total_video_count,
          ingestion_status: 'completed',
          ingestion_progress: 100,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Ingestion error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
