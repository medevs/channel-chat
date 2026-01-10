import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const YOUTUBE_API_KEY = Deno.env.get('YOUTUBE_API_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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

function parseDuration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);
  return hours * 3600 + minutes * 60 + seconds;
}

async function resolveChannelId(parsedUrl: { type: string; id: string }, apiKey: string) {
  let endpoint = '';
  
  if (parsedUrl.type === 'channel') {
    endpoint = `https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails,statistics&id=${parsedUrl.id}&key=${apiKey}`;
  } else if (parsedUrl.type === 'handle') {
    endpoint = `https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails,statistics&forHandle=${parsedUrl.id}&key=${apiKey}`;
  } else {
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

  if (data.error || !data.items || data.items.length === 0) {
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

async function fetchPlaylistVideoIds(playlistId: string, apiKey: string, maxVideos: number = 10) {
  const videoIds: string[] = [];
  let nextPageToken = '';
  
  while (videoIds.length < maxVideos) {
    const endpoint = `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&playlistId=${playlistId}&maxResults=50&pageToken=${nextPageToken}&key=${apiKey}`;
    const response = await fetch(endpoint);
    const data = await response.json();

    if (data.error || !data.items || data.items.length === 0) break;

    for (const item of data.items) {
      if (item.contentDetails?.videoId && videoIds.length < maxVideos) {
        videoIds.push(item.contentDetails.videoId);
      }
    }

    nextPageToken = data.nextPageToken || '';
    if (!nextPageToken) break;
  }

  return videoIds;
}

async function fetchVideoMetadata(videoIds: string[], apiKey: string) {
  const videos: unknown[] = [];
  const batchSize = 50;

  for (let i = 0; i < videoIds.length; i += batchSize) {
    const batch = videoIds.slice(i, i + batchSize);
    const ids = batch.join(',');
    const endpoint = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${ids}&key=${apiKey}`;
    
    const response = await fetch(endpoint);
    const data = await response.json();

    if (data.error) throw new Error(data.error.message);

    if (data.items) {
      for (const item of data.items) {
        const durationSeconds = parseDuration(item.contentDetails?.duration || 'PT0S');
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
    const { 
      channelUrl, 
      userId: _userId, 
      contentTypes: _contentTypes = { videos: true, shorts: false, lives: false },
      importSettings = { mode: 'latest', limit: 3 }
    } = await req.json();
    
    if (!channelUrl) {
      return new Response(JSON.stringify({ error: 'Channel URL is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const parsedUrl = parseChannelUrl(channelUrl);
    if (!parsedUrl) {
      return new Response(JSON.stringify({ error: 'Invalid YouTube channel URL' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const channelInfo = await resolveChannelId(parsedUrl, YOUTUBE_API_KEY);
    if (!channelInfo) {
      return new Response(JSON.stringify({ error: 'Channel not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check if channel already exists
    const { data: existing } = await supabase
      .from('channels')
      .select('*')
      .eq('channel_id', channelInfo.channel_id)
      .maybeSingle();

    if (existing) {
      console.log('Channel already exists, returning existing data');
      return new Response(JSON.stringify({
        success: true,
        already_indexed: true,
        channel: existing,
        ingestion: {
          videos_indexed: existing.total_videos || 0,
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Fetch videos
    const videoIds = await fetchPlaylistVideoIds(
      channelInfo.uploads_playlist_id, 
      YOUTUBE_API_KEY, 
      importSettings.limit || 3
    );
    
    const videos = await fetchVideoMetadata(videoIds, YOUTUBE_API_KEY);

    console.log(`Fetched ${videos.length} videos from YouTube API`);

    // Insert channel
    const { data: channelData, error: channelError } = await supabase
      .from('channels')
      .insert({
        channel_id: channelInfo.channel_id,
        channel_name: channelInfo.channel_name,
        channel_url: channelUrl,
        avatar_url: channelInfo.avatar_url,
        subscriber_count: channelInfo.subscriber_count,
        uploads_playlist_id: channelInfo.uploads_playlist_id,
        ingestion_status: 'pending',
        ingestion_method: 'youtube_api',
        total_videos: videos.length,
        indexed_videos: 0,
        ingestion_progress: 0,
      })
      .select()
      .single();

    if (channelError) {
      console.error('Channel insert error:', channelError);
      throw channelError;
    }

    console.log(`Channel inserted with ID: ${channelData.id}`);

    // Insert videos
    if (videos.length > 0) {
      const videosToInsert = videos.map(video => ({
        video_id: video.video_id,
        channel_id: channelInfo.channel_id, // This should match the foreign key
        title: video.title,
        description: video.description,
        published_at: video.published_at || null,
        duration_seconds: video.duration_seconds,
        thumbnail_url: video.thumbnail_url,
        view_count: video.view_count,
        like_count: video.like_count,
        ingestion_method: 'youtube_api',
      }));

      console.log(`Inserting ${videosToInsert.length} videos with channel_id: ${channelInfo.channel_id}...`);
      console.log('Sample video:', JSON.stringify(videosToInsert[0], null, 2));

      const { error: videosError } = await supabase
        .from('videos')
        .insert(videosToInsert);

      if (videosError) {
        console.error('Videos insert error:', videosError);
        throw videosError;
      }
      
      console.log(`Successfully inserted ${videosToInsert.length} videos`);
    }

    return new Response(JSON.stringify({
      success: true,
      channel: channelData,
      ingestion: {
        method: 'youtube_api',
        status: 'pending',
        videos_indexed: videos.length,
        max_videos_allowed: importSettings.limit || 3,
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Ingest error:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Unknown error',
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
