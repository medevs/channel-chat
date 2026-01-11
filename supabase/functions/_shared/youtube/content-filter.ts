// Content type detection, filtering, and sorting logic
import { VideoMetadata, ContentTypeOptions, VideoImportMode } from "../types/common.ts";

// ============================================
// CONTENT TYPE DETECTION
// ============================================
const SHORTS_MAX_DURATION_SECONDS = 61; // YouTube Shorts are max 60 seconds, using 61 for inclusive boundary

export function getVideoContentType(video: VideoMetadata): 'video' | 'short' | 'live' {
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

// ============================================
// CONTENT FILTERING
// ============================================
export function filterVideosByContentType(
  videos: VideoMetadata[], 
  options: ContentTypeOptions
): VideoMetadata[] {
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

// ============================================
// VIDEO SORTING
// ============================================
export function sortVideosByImportMode(
  videos: VideoMetadata[], 
  mode: VideoImportMode
): VideoMetadata[] {
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