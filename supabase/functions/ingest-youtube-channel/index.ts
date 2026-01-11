import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  createLogger,
  checkRateLimit,
  acquireLock,
  releaseLock,
  checkDuplicateRequest,
  completeRequest,
  generateRequestHash,
  logError,
  createErrorResponse,
  ErrorCodes,
  RATE_LIMITS,
  corsHeaders,
} from "../_shared/abuse-protection.ts";

// ============================================
// PLAN LIMITS CONFIGURATION
// ============================================
const PLAN_LIMITS = {
  free: {
    maxCreators: 2,
    maxVideosPerCreator: 10,
    maxDailyMessages: 18,
  },
  pro: {
    maxCreators: 25,
    maxVideosPerCreator: 100,
    maxDailyMessages: 500,
  },
};

const DEFAULT_PLAN = 'free';

// Content type detection thresholds
const SHORTS_MAX_DURATION_SECONDS = 61; // YouTube Shorts are max 60 seconds

// Valid import modes
type VideoImportMode = 'latest' | 'oldest' | 'all';

interface ImportSettings {
  mode: VideoImportMode;
  limit: number | null;
}

interface VideoMetadata {
  video_id: string;
  title: string;
  description: string;
  published_at: string;
  duration: string;
  duration_seconds: number;
  thumbnail_url: string;
  view_count: number;
  like_count: number;
  live_broadcast_content?: string;
  has_live_streaming_details: boolean; // True if video was/is a livestream
}

interface ChannelInfo {
  channel_id: string;
  channel_name: string;
  avatar_url: string;
  subscriber_count: string;
  uploads_playlist_id: string;
}

interface ContentTypeOptions {
  videos: boolean;
  shorts: boolean;
  lives: boolean;
}

// Detect content type based on YouTube API metadata
function getVideoContentType(video: VideoMetadata): 'video' | 'short' | 'live' {
  // Check if it's a livestream - YouTube API provides liveStreamingDetails ONLY for livestreams
  // This works for both current/upcoming AND past livestreams
  if (video.has_live_streaming_details) {
    return 'live';
  }
  
  // Also check liveBroadcastContent for active streams
  if (video.live_broadcast_content === 'live' || video.live_broadcast_content === 'upcoming') {
    return 'live';
  }
  
  // Check if it's a Short (duration <= 60 seconds)
  if (video.duration_seconds > 0 && video.duration_seconds <= SHORTS_MAX_DURATION_SECONDS) {
    return 'short';
  }
  
  return 'video';
}

// Filter videos based on content type preferences
function filterVideosByContentType(videos: VideoMetadata[], options: ContentTypeOptions): VideoMetadata[] {
  return videos.filter(video => {
    const contentType = getVideoContentType(video);
    switch (contentType) {
      case 'video': return options.videos;
      case 'short': return options.shorts;
      case 'live': return options.lives;
      default: return options.videos;
    }
  });
}

// Sort videos based on import mode
function sortVideosByImportMode(videos: VideoMetadata[], mode: VideoImportMode): VideoMetadata[] {
  const sorted = [...videos];
  
  if (mode === 'latest') {
    // Sort by published_at descending (newest first)
    sorted.sort((a, b) => {
      const dateA = new Date(a.published_at).getTime();
      const dateB = new Date(b.published_at).getTime();
      return dateB - dateA;
    });
  } else if (mode === 'oldest') {
    // Sort by published_at ascending (oldest first)
    sorted.sort((a, b) => {
      const dateA = new Date(a.published_at).getTime();
      const dateB = new Date(b.published_at).getTime();
      return dateA - dateB;
    });
  }
  // 'all' mode: no specific sort, use API order
  
  return sorted;
}

// Get user's usage and plan
async function getUserUsage(supabase: any, userId: string): Promise<{
  plan_type: string;
  creators_added: number;
  videos_indexed: number;
}> {
  const { data, error } = await supabase.rpc('get_usage_with_limits', {
    p_user_id: userId,
  });

  if (error || !data || data.length === 0) {
    return { plan_type: DEFAULT_PLAN, creators_added: 0, videos_indexed: 0 };
  }

  return {
    plan_type: data[0].plan_type || DEFAULT_PLAN,
    creators_added: data[0].creators_added || 0,
    videos_indexed: data[0].videos_indexed || 0,
  };
}

// Check if user can add another creator (counts actual user_creators links)
async function checkCreatorLimit(supabase: any, userId: string): Promise<{ 
  allowed: boolean; 
  current: number; 
  limit: number;
  planType: string;
}> {
  const usage = await getUserUsage(supabase, userId);
  const limits = PLAN_LIMITS[usage.plan_type as keyof typeof PLAN_LIMITS] || PLAN_LIMITS.free;
  
  // Count actual user_creators links for accuracy
  const { count, error } = await supabase
    .from('user_creators')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);
  
  const actualCount = error ? usage.creators_added : (count ?? 0);
  
  return {
    allowed: actualCount < limits.maxCreators,
    current: actualCount,
    limit: limits.maxCreators,
    planType: usage.plan_type,
  };
}

// Check if user already has this channel linked
async function checkUserHasChannel(supabase: any, userId: string, channelUuid: string): Promise<boolean> {
  const { data } = await supabase
    .from('user_creators')
    .select('id')
    .eq('user_id', userId)
    .eq('channel_id', channelUuid)
    .maybeSingle();
  
  return !!data;
}

// Link user to a channel
async function linkUserToChannel(supabase: any, userId: string, channelUuid: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('user_creators')
    .insert({
      user_id: userId,
      channel_id: channelUuid,
    });
  
  if (error) {
    if (error.code === '23505') { // Unique violation
      return { success: false, error: 'already_linked' };
    }
    return { success: false, error: error.message };
  }
  
  return { success: true };
}

// Increment usage counts after successful indexing
async function incrementUsageCounts(supabase: any, userId: string, videosCount: number, isNewCreator: boolean): Promise<void> {
  if (isNewCreator) {
    const { error: creatorError } = await supabase.rpc('increment_creator_count', {
      p_user_id: userId,
    });
    if (creatorError) console.error('Error incrementing creator count:', creatorError);
  }

  if (videosCount > 0) {
    const { error: videosError } = await supabase.rpc('increment_videos_indexed', {
      p_user_id: userId,
      p_count: videosCount,
    });
    if (videosError) console.error('Error incrementing videos count:', videosError);
  }
}

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

async function resolveChannelId(
  parsedUrl: { type: string; id: string },
  apiKey: string
): Promise<ChannelInfo | null> {
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

// Fetch video IDs with optional date filter for refresh
// For 'oldest' mode, we need to fetch all and sort later since YouTube API returns newest first
async function fetchPlaylistVideoIds(
  playlistId: string,
  apiKey: string,
  maxVideos: number = 500,
  afterDate?: string,
  fetchAll: boolean = false
): Promise<string[]> {
  const videoIds: string[] = [];
  let nextPageToken = '';
  const targetCount = fetchAll ? 5000 : maxVideos; // Reasonable upper limit
  
  while (videoIds.length < targetCount) {
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
      
      // If refreshing, only include videos after the specified date
      if (afterDate && item.snippet?.publishedAt) {
        const videoDate = new Date(item.snippet.publishedAt);
        const filterDate = new Date(afterDate);
        if (videoDate <= filterDate) {
          // We've reached older videos, stop fetching
          return videoIds;
        }
      }
      
      if (videoIds.length < targetCount) {
        videoIds.push(item.contentDetails.videoId);
      }
    }

    nextPageToken = data.nextPageToken || '';
    if (!nextPageToken || videoIds.length >= targetCount) break;
  }

  return videoIds;
}

async function fetchVideoMetadata(videoIds: string[], apiKey: string): Promise<VideoMetadata[]> {
  const videos: VideoMetadata[] = [];
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
        // liveStreamingDetails exists ONLY for videos that were/are livestreams
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

async function fetchVideosFallback(channelId: string, maxVideos: number = 15): Promise<VideoMetadata[]> {
  console.log('Using RSS fallback for channel:', channelId);
  const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
  
  try {
    const response = await fetch(rssUrl);
    if (!response.ok) throw new Error('RSS feed not available');
    
    const xml = await response.text();
    const videos: VideoMetadata[] = [];
    
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
    const videoIdRegex = /<yt:videoId>([^<]+)<\/yt:videoId>/;
    const titleRegex = /<title>([^<]+)<\/title>/;
    const publishedRegex = /<published>([^<]+)<\/published>/;
    const thumbnailRegex = /<media:thumbnail url="([^"]+)"/;
    const descriptionRegex = /<media:description>([^<]*)<\/media:description>/;
    
    let match;
    while ((match = entryRegex.exec(xml)) !== null && videos.length < maxVideos) {
      const entry = match[1];
      const videoIdMatch = videoIdRegex.exec(entry);
      const titleMatch = titleRegex.exec(entry);
      const publishedMatch = publishedRegex.exec(entry);
      const thumbnailMatch = thumbnailRegex.exec(entry);
      const descriptionMatch = descriptionRegex.exec(entry);
      
      if (videoIdMatch && titleMatch) {
        videos.push({
          video_id: videoIdMatch[1],
          title: titleMatch[1],
          description: descriptionMatch?.[1] || '',
          published_at: publishedMatch?.[1] || '',
          duration: '',
          duration_seconds: 0,
          thumbnail_url: thumbnailMatch?.[1] || `https://i.ytimg.com/vi/${videoIdMatch[1]}/hqdefault.jpg`,
          view_count: 0,
          like_count: 0,
          has_live_streaming_details: false, // RSS doesn't provide this info
        });
      }
    }
    
    return videos;
  } catch (error) {
    console.error('RSS fallback failed:', error);
    return [];
  }
}

// Calculate effective video limit based on user request and plan limits
function getEffectiveVideoLimit(
  importSettings: ImportSettings,
  planLimits: { maxVideosPerCreator: number }
): number {
  // If "all" mode, use plan limit
  if (importSettings.mode === 'all' || importSettings.limit === null) {
    return planLimits.maxVideosPerCreator;
  }
  
  // Otherwise, use the minimum of user's requested limit and plan limit
  return Math.min(importSettings.limit, planLimits.maxVideosPerCreator);
}

// Get existing indexed video IDs for a channel
async function getExistingVideoIds(supabase: any, channelId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('videos')
    .select('video_id')
    .eq('channel_id', channelId);
  
  if (error || !data) return new Set();
  return new Set(data.map((v: any) => v.video_id));
}

serve(async (req) => {
  const requestId = crypto.randomUUID();
  const logger = createLogger('ingest-youtube-channel', requestId);
  let lockKey: string | null = null;
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      channelUrl, 
      userId, 
      refresh = false,
      channelId: existingChannelId,
      contentTypes = { videos: true, shorts: false, lives: false },
      importSettings = { mode: 'latest', limit: null }
    } = await req.json();
    
    const isRefresh = refresh === true && existingChannelId;
    
    logger.info('Ingestion request received', { 
      channelUrl: channelUrl?.substring(0, 50),
      userId: userId ? 'present' : 'none',
      isRefresh,
      importMode: importSettings.mode,
    });
    
    if (!channelUrl && !isRefresh) {
      return new Response(
        JSON.stringify({ error: 'Channel URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // ============================================
    // RATE LIMITING FOR AUTHENTICATED USERS
    // ============================================
    if (userId) {
      const rateLimitKey = `ingest:${userId}`;
      const rateConfig = RATE_LIMITS.ingest.authenticated;
      const rateCheck = checkRateLimit(rateLimitKey, rateConfig.requests, rateConfig.windowMinutes);
      
      if (!rateCheck.allowed) {
        logger.warn('Rate limit exceeded', { userId });
        return createErrorResponse(
          'Too many ingestion requests. Please wait before adding more creators.',
          ErrorCodes.RATE_LIMITED,
          429,
          { remaining: 0, resetAt: rateCheck.resetAt.toISOString() },
          true,
          rateCheck.resetAt.getTime() - Date.now()
        );
      }
    }
    
    // ============================================
    // REQUEST DEDUPLICATION
    // ============================================
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const idempotencyKey = req.headers.get('x-idempotency-key') || 
      `ingest:${userId || 'anon'}:${channelUrl || existingChannelId}:${Date.now()}`;
    const requestHash = generateRequestHash({ channelUrl, userId, refresh, contentTypes, importSettings });
    
    const duplicateCheck = await checkDuplicateRequest(
      supabase, 
      idempotencyKey, 
      userId, 
      'ingest-channel', 
      requestHash
    );
    
    if (duplicateCheck.isDuplicate) {
      if (duplicateCheck.existingStatus === 'completed' && duplicateCheck.existingResponse) {
        logger.info('Returning cached response for duplicate request');
        return new Response(
          JSON.stringify(duplicateCheck.existingResponse),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (duplicateCheck.existingStatus === 'pending') {
        logger.warn('Duplicate request while operation is pending');
        return createErrorResponse(
          'This operation is already in progress. Please wait for it to complete.',
          ErrorCodes.DUPLICATE_REQUEST,
          409,
          undefined,
          true,
          5000
        );
      }
    }
    
    // ============================================
    // CONCURRENCY LOCK (prevent parallel ingestion for same channel)
    // ============================================
    lockKey = `ingest:channel:${channelUrl || existingChannelId}`;
    const lockAcquired = await acquireLock(supabase, lockKey, userId, 'ingest-channel', 600);
    
    if (!lockAcquired) {
      logger.warn('Failed to acquire lock - concurrent operation in progress');
      return createErrorResponse(
        'This channel is currently being processed. Please wait and try again.',
        ErrorCodes.CONCURRENT_OPERATION,
        423,
        undefined,
        true,
        10000
      );
    }

    logger.info('Processing', { 
      target: isRefresh ? `Refresh for ${existingChannelId}` : `New channel ${channelUrl}`,
      contentTypes,
      importSettings,
    });

    let channelInfo: ChannelInfo | null = null;
    let existingChannel: any = null;
    let videos: VideoMetadata[] = [];
    let ingestionMethod: 'youtube_api' | 'fallback' = 'youtube_api';
    let lastIndexedAt: string | null = null;
    let isExistingChannel = false;
    let needsExpandedIndexing = false;

    // For refresh mode, get existing channel data
    if (isRefresh) {
      const { data: channel } = await supabase
        .from('channels')
        .select('*')
        .eq('channel_id', existingChannelId)
        .maybeSingle();
      
      if (!channel) {
        return new Response(
          JSON.stringify({ error: 'Channel not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      existingChannel = channel;
      lastIndexedAt = channel.last_indexed_at;
      channelInfo = {
        channel_id: channel.channel_id,
        channel_name: channel.channel_name,
        avatar_url: channel.avatar_url,
        subscriber_count: channel.subscriber_count,
        uploads_playlist_id: channel.uploads_playlist_id,
      };
      
      console.log('Refreshing channel:', channelInfo.channel_name, 'Last indexed:', lastIndexedAt);
    }

    const youtubeApiKey = Deno.env.get('YOUTUBE_API_KEY');

    // Resolve channel info if not refresh
    if (!isRefresh && channelUrl) {
      const parsedUrl = parseChannelUrl(channelUrl);
      if (!parsedUrl) {
        return new Response(
          JSON.stringify({ error: 'Invalid YouTube channel URL' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (youtubeApiKey) {
        channelInfo = await resolveChannelId(parsedUrl, youtubeApiKey);
      }

      if (!channelInfo) {
        return new Response(
          JSON.stringify({ error: 'Channel not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // =====================================================
      // CHECK IF CHANNEL ALREADY EXISTS BEFORE CREATOR LIMIT
      // =====================================================
      const { data: existing } = await supabase
        .from('channels')
        .select('*')
        .eq('channel_id', channelInfo.channel_id)
        .maybeSingle();

      if (existing) {
        isExistingChannel = true;
        existingChannel = existing;
        console.log('Channel already exists in database:', existing.id);

        // Check if user already has this channel linked
        if (userId) {
          const alreadyLinked = await checkUserHasChannel(supabase, userId, existing.id);
          
          if (alreadyLinked) {
            console.log('User already has this channel linked');
            return new Response(
              JSON.stringify({
                success: false,
                already_linked: true,
                error: 'You already have this creator in your list',
                channel: {
                  id: existing.id,
                  channel_id: existing.channel_id,
                  channel_name: existing.channel_name,
                  avatar_url: existing.avatar_url,
                  subscriber_count: existing.subscriber_count,
                  indexed_videos: existing.indexed_videos,
                  total_videos: existing.total_videos,
                  ingestion_status: existing.ingestion_status,
                  ingestion_progress: existing.ingestion_progress,
                  last_indexed_at: existing.last_indexed_at,
                },
              }),
              { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }

        // Check if user's requested video limit exceeds what's already indexed
        const usage = userId ? await getUserUsage(supabase, userId) : { plan_type: DEFAULT_PLAN, creators_added: 0, videos_indexed: 0 };
        const planLimits = PLAN_LIMITS[usage.plan_type as keyof typeof PLAN_LIMITS] || PLAN_LIMITS.free;
        const effectiveLimit = getEffectiveVideoLimit(importSettings as ImportSettings, planLimits);
        
        if (effectiveLimit > existing.indexed_videos) {
          console.log(`User wants ${effectiveLimit} videos, channel has ${existing.indexed_videos}. Will expand indexing.`);
          needsExpandedIndexing = true;
        } else {
          // Channel exists, user hasn't linked it yet, no need for more videos
          // Link user to this channel and return existing data
          if (userId) {
            const linkResult = await linkUserToChannel(supabase, userId, existing.id);
            if (!linkResult.success && linkResult.error !== 'already_linked') {
              console.error('Failed to link user to channel:', linkResult.error);
            } else if (linkResult.success) {
              // Increment creator count for the user
              await incrementUsageCounts(supabase, userId, 0, true);
              console.log('Linked user to existing channel, incremented creator count');
            }
          }

          console.log('Returning existing channel without expansion');
          return new Response(
            JSON.stringify({
              success: true,
              already_indexed: true,
              channel: {
                id: existing.id,
                channel_id: existing.channel_id,
                channel_name: existing.channel_name,
                avatar_url: existing.avatar_url,
                subscriber_count: existing.subscriber_count,
                indexed_videos: existing.indexed_videos,
                total_videos: existing.total_videos,
                ingestion_status: existing.ingestion_status,
                ingestion_progress: existing.ingestion_progress,
                last_indexed_at: existing.last_indexed_at,
                ingest_videos: existing.ingest_videos,
                ingest_shorts: existing.ingest_shorts,
                ingest_lives: existing.ingest_lives,
                video_import_mode: existing.video_import_mode,
                video_import_limit: existing.video_import_limit,
              },
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    // =====================================================
    // CHECK CREATOR LIMIT ONLY FOR NEW CHANNELS
    // =====================================================
    let userPlanType = DEFAULT_PLAN;
    if (userId && !isRefresh && !isExistingChannel) {
      const creatorCheck = await checkCreatorLimit(supabase, userId);
      userPlanType = creatorCheck.planType;
      
      if (!creatorCheck.allowed) {
        return new Response(
          JSON.stringify({ 
            error: 'Creator limit reached',
            limit_exceeded: true,
            limit_type: 'creators',
            current: creatorCheck.current,
            limit: creatorCheck.limit,
            planType: creatorCheck.planType,
            message: `You've reached your limit of ${creatorCheck.limit} creator(s). Upgrade to add more.`,
          }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else if (userId) {
      const usage = await getUserUsage(supabase, userId);
      userPlanType = usage.plan_type;
    }

    const planLimits = PLAN_LIMITS[userPlanType as keyof typeof PLAN_LIMITS] || PLAN_LIMITS.free;
    
    // Calculate effective limit based on import settings and plan
    const effectiveLimit = getEffectiveVideoLimit(
      importSettings as ImportSettings,
      planLimits
    );
    
    console.log('Effective video limit:', effectiveLimit, '(plan max:', planLimits.maxVideosPerCreator, ')');

    // Fetch videos
    if (youtubeApiKey && channelInfo?.uploads_playlist_id) {
      try {
        // Get existing video IDs to avoid duplicates
        const existingVideoIds = (isRefresh || needsExpandedIndexing)
          ? await getExistingVideoIds(supabase, channelInfo.channel_id)
          : new Set<string>();
        
        console.log('Existing videos in DB:', existingVideoIds.size);

        // Determine if we need to fetch all videos (for oldest mode or all mode)
        const needsAllVideos = importSettings.mode === 'oldest' || importSettings.mode === 'all';
        
        if (isRefresh) {
          // REFRESH LOGIC: Get new videos AND backfill older ones if under limit
          const currentIndexed = existingVideoIds.size;
          const roomForMore = effectiveLimit - currentIndexed;
          
          console.log(`Refresh: current=${currentIndexed}, limit=${effectiveLimit}, room=${roomForMore}`);
          
          // Step 1: Get NEW videos (published after last_indexed_at)
          const newVideoIds = await fetchPlaylistVideoIds(
            channelInfo.uploads_playlist_id,
            youtubeApiKey,
            50, // Check up to 50 recent videos
            lastIndexedAt || undefined,
            false
          );
          
          console.log(`Found ${newVideoIds.length} new video IDs since last index`);
          
          // Step 2: If we have room for more, also fetch older videos to backfill
          let backfillVideoIds: string[] = [];
          if (roomForMore > newVideoIds.length) {
            // We need to fetch more videos and find ones not yet indexed
            const allVideoIds = await fetchPlaylistVideoIds(
              channelInfo.uploads_playlist_id,
              youtubeApiKey,
              effectiveLimit + 20, // Fetch extra to account for filtering
              undefined, // No date filter - get all
              true
            );
            
            // Filter out already indexed videos and new videos (avoid duplicates)
            const newVideoIdSet = new Set(newVideoIds);
            backfillVideoIds = allVideoIds.filter(id => 
              !existingVideoIds.has(id) && !newVideoIdSet.has(id)
            );
            
            console.log(`Found ${backfillVideoIds.length} backfill candidates`);
          }
          
          // Combine: new videos first, then backfill
          const allIds = [...newVideoIds, ...backfillVideoIds];
          const uniqueIds = [...new Set(allIds)].slice(0, roomForMore > 0 ? roomForMore : effectiveLimit);
          
          console.log(`Will process ${uniqueIds.length} videos (${newVideoIds.length} new + ${Math.max(0, uniqueIds.length - newVideoIds.length)} backfill)`);
          
          if (uniqueIds.length > 0) {
            videos = await fetchVideoMetadata(uniqueIds, youtubeApiKey);
            
            // Filter by content type (use channel's existing settings for refresh)
            const contentTypeOptions: ContentTypeOptions = {
              videos: existingChannel?.ingest_videos ?? contentTypes.videos ?? true,
              shorts: existingChannel?.ingest_shorts ?? contentTypes.shorts ?? false,
              lives: existingChannel?.ingest_lives ?? contentTypes.lives ?? false,
            };
            
            const beforeFilter = videos.length;
            videos = filterVideosByContentType(videos, contentTypeOptions);
            console.log(`Filtered ${beforeFilter} -> ${videos.length} videos by content type`);
            
            // Filter out already indexed
            videos = videos.filter(v => !existingVideoIds.has(v.video_id));
            console.log(`After dedup: ${videos.length} new videos to index`);
          }
        } else {
          // NON-REFRESH LOGIC: Standard ingestion
          const videoIds = await fetchPlaylistVideoIds(
            channelInfo.uploads_playlist_id,
            youtubeApiKey,
            needsAllVideos ? 500 : effectiveLimit,
            undefined,
            needsAllVideos
          );
          
          console.log(`Found ${videoIds.length} video IDs`);
          
          if (videoIds.length > 0) {
            const idsToFetch = needsAllVideos 
              ? videoIds.slice(0, Math.min(videoIds.length, 200))
              : videoIds.slice(0, effectiveLimit);
            
            videos = await fetchVideoMetadata(idsToFetch, youtubeApiKey);
            
            // Filter by content type
            const contentTypeOptions: ContentTypeOptions = {
              videos: contentTypes.videos ?? true,
              shorts: contentTypes.shorts ?? false,
              lives: contentTypes.lives ?? false,
            };
            
            const beforeFilter = videos.length;
            videos = filterVideosByContentType(videos, contentTypeOptions);
            console.log(`Filtered ${beforeFilter} -> ${videos.length} videos by content type`);
            
            // Sort by import mode
            videos = sortVideosByImportMode(videos, importSettings.mode as VideoImportMode);
            console.log(`Sorted videos by mode: ${importSettings.mode}`);
            
            // Apply limit after filtering and sorting
            videos = videos.slice(0, effectiveLimit);
            console.log(`Applied limit: ${videos.length} videos (effective limit: ${effectiveLimit})`);

            // If expanding indexing, filter out already indexed videos
            if (needsExpandedIndexing && existingVideoIds.size > 0) {
              const beforeExpand = videos.length;
              videos = videos.filter(v => !existingVideoIds.has(v.video_id));
              console.log(`Expansion filter: ${beforeExpand} -> ${videos.length} new videos to index`);
            }
          }
        }
        
        ingestionMethod = 'youtube_api';
      } catch (error) {
        console.error('YouTube API failed:', error);
        if (!(error instanceof Error && error.message === 'QUOTA_EXCEEDED')) {
          throw error;
        }
      }
    }

    // Fallback for non-refresh
    if (videos.length === 0 && !isRefresh && channelInfo && !needsExpandedIndexing) {
      ingestionMethod = 'fallback';
      videos = await fetchVideosFallback(channelInfo.channel_id, Math.min(effectiveLimit, 15));
    }

    // If refresh and no new videos, return up-to-date status
    if (isRefresh && videos.length === 0) {
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
            video_import_mode: existingChannel.video_import_mode,
            video_import_limit: existingChannel.video_import_limit,
          },
          message: 'Creator is up to date. No new videos found.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If expansion was requested but no new videos found
    if (needsExpandedIndexing && videos.length === 0) {
      console.log('No new videos to add for expansion');
      
      // Still link the user to the channel
      if (userId && existingChannel) {
        const linkResult = await linkUserToChannel(supabase, userId, existingChannel.id);
        if (linkResult.success) {
          await incrementUsageCounts(supabase, userId, 0, true);
          console.log('Linked user to channel after expansion check');
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          already_indexed: true,
          channel: {
            id: existingChannel.id,
            channel_id: existingChannel.channel_id,
            channel_name: existingChannel.channel_name,
            avatar_url: existingChannel.avatar_url,
            subscriber_count: existingChannel.subscriber_count,
            indexed_videos: existingChannel.indexed_videos,
            total_videos: existingChannel.total_videos,
            ingestion_status: existingChannel.ingestion_status,
            ingestion_progress: existingChannel.ingestion_progress,
            last_indexed_at: existingChannel.last_indexed_at,
            ingest_videos: existingChannel.ingest_videos,
            ingest_shorts: existingChannel.ingest_shorts,
            ingest_lives: existingChannel.ingest_lives,
            video_import_mode: existingChannel.video_import_mode,
            video_import_limit: existingChannel.video_import_limit,
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!channelInfo) {
      return new Response(
        JSON.stringify({ error: 'Could not resolve channel information' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Upsert channel info
    const channelUpsertData: any = {
      channel_id: channelInfo.channel_id,
      channel_name: channelInfo.channel_name,
      channel_url: channelUrl || existingChannel?.channel_url,
      avatar_url: channelInfo.avatar_url,
      subscriber_count: channelInfo.subscriber_count,
      uploads_playlist_id: channelInfo.uploads_playlist_id,
      ingestion_status: 'pending',
      ingestion_method: ingestionMethod,
      last_indexed_at: new Date().toISOString(),
    };

    // Only set content types and import settings for new channels (not refresh or expansion)
    if (!isRefresh && !needsExpandedIndexing) {
      channelUpsertData.total_videos = videos.length;
      channelUpsertData.indexed_videos = 0;
      channelUpsertData.ingestion_progress = 0;
      channelUpsertData.ingest_videos = contentTypes.videos ?? true;
      channelUpsertData.ingest_shorts = contentTypes.shorts ?? false;
      channelUpsertData.ingest_lives = contentTypes.lives ?? false;
      channelUpsertData.video_import_mode = importSettings.mode || 'latest';
      channelUpsertData.video_import_limit = importSettings.mode === 'all' ? null : importSettings.limit;
    } else if (needsExpandedIndexing && existingChannel) {
      // For expansion, add to total_videos
      channelUpsertData.total_videos = (existingChannel.total_videos || 0) + videos.length;
    } else {
      // For refresh, increment total_videos
      channelUpsertData.total_videos = (existingChannel?.total_videos || 0) + videos.length;
    }

    const { data: channelData, error: channelError } = await supabase
      .from('channels')
      .upsert(channelUpsertData, { onConflict: 'channel_id' })
      .select()
      .single();

    if (channelError) {
      console.error('Error upserting channel:', channelError);
      throw channelError;
    }

    console.log('Channel upserted:', channelData.id);

    // Upsert videos with content_type
    if (videos.length > 0) {
      const videosToInsert = videos.map(video => ({
        video_id: video.video_id,
        channel_id: channelInfo!.channel_id,
        title: video.title,
        description: video.description,
        published_at: video.published_at || null,
        duration: video.duration,
        duration_seconds: video.duration_seconds,
        thumbnail_url: video.thumbnail_url,
        view_count: video.view_count,
        like_count: video.like_count,
        ingestion_method: ingestionMethod,
        content_type: getVideoContentType(video), // Persist the API-detected content type
      }));

      const { error: videosError } = await supabase
        .from('videos')
        .upsert(videosToInsert, { onConflict: 'video_id' });

      if (videosError) {
        console.error('Error upserting videos:', videosError);
        throw videosError;
      }

      console.log(`Upserted ${videos.length} videos`);
    }

    // Link user to channel and update usage counts
    if (userId) {
      const isNewCreatorForUser = !isRefresh && !isExistingChannel;
      const isExpansionLink = needsExpandedIndexing && !isRefresh;
      
      // Link user to channel if this is a new channel for them
      if (isNewCreatorForUser || isExpansionLink) {
        const linkResult = await linkUserToChannel(supabase, userId, channelData.id);
        if (!linkResult.success && linkResult.error !== 'already_linked') {
          console.error('Failed to link user to channel:', linkResult.error);
        } else {
          console.log('User linked to channel');
        }
      }

      // Increment usage counts - only count as new creator if truly new
      await incrementUsageCounts(supabase, userId, videos.length, isNewCreatorForUser || isExpansionLink);
      logger.info(`Updated usage: ${isRefresh ? 'refresh' : '+1 creator'}, +${videos.length} videos`);
    }

    const successResponse = {
      success: true,
      ...(isRefresh && { new_videos_count: videos.length }),
      ...(needsExpandedIndexing && { expanded_indexing: true, new_videos_indexed: videos.length }),
      channel: {
        id: channelData.id,
        channel_id: channelInfo.channel_id,
        channel_name: channelInfo.channel_name,
        avatar_url: channelInfo.avatar_url,
        subscriber_count: channelInfo.subscriber_count,
        indexed_videos: channelData.indexed_videos,
        total_videos: channelData.total_videos,
        ingestion_status: channelData.ingestion_status,
        ingestion_progress: channelData.ingestion_progress,
        last_indexed_at: channelData.last_indexed_at,
        ingest_videos: channelData.ingest_videos,
        ingest_shorts: channelData.ingest_shorts,
        ingest_lives: channelData.ingest_lives,
        video_import_mode: channelData.video_import_mode,
        video_import_limit: channelData.video_import_limit,
      },
      ingestion: {
        method: ingestionMethod,
        status: videos.length > 0 ? 'pending' : 'completed',
        videos_indexed: videos.length,
        max_videos_allowed: effectiveLimit,
        requested_limit: importSettings.limit,
        import_mode: importSettings.mode,
        error_message: null,
      },
    };

    // Complete idempotency record and release lock
    await completeRequest(supabase, idempotencyKey, successResponse, 'completed');
    if (lockKey) {
      await releaseLock(supabase, lockKey);
    }

    logger.info('Ingestion completed successfully', { 
      channelId: channelInfo.channel_id,
      videosIndexed: videos.length,
    });

    return new Response(
      JSON.stringify(successResponse),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    logger.error('Error in ingest-youtube-channel', { error: String(error) });
    
    // Release lock on error
    if (lockKey) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);
        await releaseLock(supabase, lockKey);
        await logError(supabase, 'ingest-youtube-channel', error as Error);
      } catch {
        // Ignore cleanup errors
      }
    }
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
