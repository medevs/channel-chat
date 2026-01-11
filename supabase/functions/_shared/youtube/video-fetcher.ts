// Video metadata fetching and playlist processing
import { VideoMetadata, Dependencies, Result } from "../types/common.ts";

// ============================================
// DURATION PARSING
// ============================================
export function parseDuration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);
  return hours * 3600 + minutes * 60 + seconds;
}

// ============================================
// PLAYLIST VIDEO IDS FETCHING
// ============================================
export interface PlaylistFetchConfig {
  playlistId: string;
  apiKey: string;
  maxVideos?: number;
  afterDate?: string;
  fetchAll?: boolean;
}

export async function fetchPlaylistVideoIds(
  config: PlaylistFetchConfig,
  dependencies: Dependencies
): Promise<Result<string[]>> {
  const { playlistId, apiKey, maxVideos = 500, afterDate, fetchAll = false } = config;
  const { logger } = dependencies;

  try {
    const videoIds: string[] = [];
    let nextPageToken = '';
    const targetCount = fetchAll ? 5000 : maxVideos;
    
    while (videoIds.length < targetCount) {
      const endpoint = `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails,snippet&playlistId=${playlistId}&maxResults=50&pageToken=${nextPageToken}&key=${apiKey}`;
      const response = await fetch(endpoint);
      const data = await response.json();

      if (data.error) {
        logger.error('YouTube API error:', { error: data.error });
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
            return { success: true, data: videoIds };
          }
        }
        
        if (videoIds.length < targetCount) {
          videoIds.push(item.contentDetails.videoId);
        }
      }

      nextPageToken = data.nextPageToken || '';
      if (!nextPageToken || videoIds.length >= targetCount) break;
    }

    return { success: true, data: videoIds };
  } catch (error) {
    logger.error('Playlist fetch error:', { error: String(error) });
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ============================================
// VIDEO METADATA FETCHING
// ============================================
export interface VideoMetadataConfig {
  videoIds: string[];
  apiKey: string;
}

export async function fetchVideoMetadata(
  config: VideoMetadataConfig,
  dependencies: Dependencies
): Promise<Result<VideoMetadata[]>> {
  const { videoIds, apiKey } = config;
  const { logger } = dependencies;

  try {
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

    return { success: true, data: videos };
  } catch (error) {
    logger.error('Video metadata fetch error:', { error: String(error) });
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ============================================
// RSS FALLBACK
// ============================================
export interface RSSFallbackConfig {
  channelId: string;
  maxVideos?: number;
}

export async function fetchVideosFallback(
  config: RSSFallbackConfig,
  dependencies: Dependencies
): Promise<Result<VideoMetadata[]>> {
  const { channelId, maxVideos = 15 } = config;
  const { logger } = dependencies;

  logger.info('Using RSS fallback for channel:', { channelId });
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
    
    return { success: true, data: videos };
  } catch (error) {
    logger.error('RSS fallback failed:', { error: String(error) });
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}