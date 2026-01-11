// Video processing, deduplication, and database storage
import { VideoMetadata, Dependencies, Result } from "../types/common.ts";
import { getVideoContentType } from "../youtube/content-filter.ts";

// ============================================
// VIDEO DEDUPLICATION
// ============================================
export async function getExistingVideoIds(
  channelId: string,
  dependencies: Dependencies
): Promise<Result<Set<string>>> {
  const { supabase, logger } = dependencies;

  try {
    const { data, error } = await supabase
      .from('videos')
      .select('video_id')
      .eq('channel_id', channelId);
    
    if (error) {
      logger.error('Error fetching existing video IDs:', { error, channelId });
      return { success: true, data: new Set() }; // Return empty set on error
    }

    const videoIds = new Set(data?.map((v: { video_id: string }) => v.video_id) || []);
    return { success: true, data: videoIds };
  } catch (error) {
    logger.error('Error getting existing video IDs:', { error: String(error), channelId });
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ============================================
// VIDEO DATABASE OPERATIONS
// ============================================
export interface VideoUpsertConfig {
  videos: VideoMetadata[];
  channelId: string;
  ingestionMethod: 'youtube_api' | 'fallback';
}

export async function upsertVideos(
  config: VideoUpsertConfig,
  dependencies: Dependencies
): Promise<Result<number>> {
  const { videos, channelId, ingestionMethod } = config;
  const { supabase, logger } = dependencies;

  if (videos.length === 0) {
    return { success: true, data: 0 };
  }

  try {
    const videosToInsert = videos.map(video => ({
      video_id: video.video_id,
      channel_id: channelId,
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

    const { error } = await supabase
      .from('videos')
      .upsert(videosToInsert, { onConflict: 'video_id' });

    if (error) {
      logger.error('Error upserting videos:', { error, count: videos.length });
      return { success: false, error: error.message };
    }

    logger.info(`Upserted ${videos.length} videos`);
    return { success: true, data: videos.length };
  } catch (error) {
    logger.error('Error in video upsert:', { error: String(error), count: videos.length });
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}