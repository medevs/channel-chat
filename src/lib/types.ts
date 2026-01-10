// Video import mode options
export type VideoImportMode = 'latest' | 'oldest' | 'all';

// Import settings for video ingestion
export interface ImportSettings {
  mode: VideoImportMode;
  limit: number | null; // null = use plan limit
}

// Creator type that maps to channels table
export interface Creator {
  id: string; // UUID from database
  channelId: string; // YouTube channel ID
  name: string; // channel_name
  channelUrl: string;
  avatarUrl: string | null;
  subscribers: string | null; // subscriber_count
  indexedVideos: number; // indexed_videos
  totalVideos: number; // total_videos
  ingestionStatus: 'pending' | 'processing' | 'extracting' | 'completed' | 'partial' | 'failed' | 'no_captions';
  ingestionProgress: number; // 0-100 progress percentage
  ingestionMethod: string | null;
  errorMessage: string | null;
  lastIndexedAt: string | null;
  // Content type filters
  ingestVideos: boolean;
  ingestShorts: boolean;
  ingestLives: boolean;
  // Import settings
  videoImportMode: VideoImportMode;
  videoImportLimit: number | null;
  // Public sharing
  publicSlug: string | null;
  
  // Legacy compatibility properties
  avatar: string; // alias for avatarUrl
  subscriberCount: string; // alias for subscribers
  videosIndexed: number; // alias for indexedVideos
  status: 'processing' | 'completed' | 'failed' | 'no_captions' | 'partial'; // alias for ingestionStatus
  progress: number; // alias for ingestionProgress
}

// Content types for selective ingestion
export interface ContentTypeOptions {
  videos: boolean;
  shorts: boolean;
  lives: boolean;
}

// Video source from transcript chunks with real data
export interface VideoSource {
  videoId: string;
  title: string;
  timestamp: string | null; // null if no timestamp data
  timestampSeconds: number | null;
  endTimeSeconds?: number | null;
  thumbnailUrl?: string;
  hasTimestamp: boolean; // whether this source has valid timestamp data
  // Debug info
  chunkId?: string;
  similarity?: number;
  chunkText?: string;
  
  // Legacy compatibility properties
  id: string; // alias for videoId
  thumbnail: string; // alias for thumbnailUrl
  url: string; // constructed YouTube URL
}

export interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  sources?: VideoSource[];
  showSources?: boolean; // Whether to display sources based on question type
  timestamp: Date;
  // Confidence and evidence transparency
  confidence?: AnswerConfidence;
  evidence?: AnswerEvidence;
  isRefusal?: boolean;
  // Debug info for verification
  debug?: {
    chunksFound?: number;
    videosReferenced?: number;
    isFromDatabase?: boolean;
  };
  
  // Legacy compatibility properties
  role: 'user' | 'assistant'; // alias for type
}

export interface ActiveVideo {
  videoId: string;
  title: string;
  creatorName: string;
  timestamp: string | null;
  timestampSeconds: number | null;
  hasTimestamp: boolean;
  thumbnailUrl?: string;
}

// Answer confidence levels
export type AnswerConfidence = 'high' | 'medium' | 'low' | 'not_covered';

// Evidence transparency for answers
export interface AnswerEvidence {
  chunksUsed: number;
  videosReferenced: number;
}

// RAG Chat API response
export interface RagChatResponse {
  answer: string;
  citations: Array<{
    index: number;
    videoId: string;
    videoTitle: string;
    thumbnailUrl: string | null;
    startTime: number | null;
    endTime: number | null;
    timestamp: string | null;
    timestampRange: string | null;
    hasTimestamp: boolean;
    text: string;
    similarity: number;
  }>;
  showCitations?: boolean; // Whether to display citations in UI
  // NEW: Confidence and evidence transparency
  confidence?: AnswerConfidence;
  evidence?: AnswerEvidence;
  isRefusal?: boolean;
  debug?: {
    chunksFound: number;
    videosReferenced: number;
  };
  error?: string;
}

// Ingestion API response
export interface IngestChannelResponse {
  success: boolean;
  already_indexed?: boolean;
  up_to_date?: boolean;
  new_videos_count?: number;
  channel?: {
    id: string;
    channel_id: string;
    channel_name: string;
    avatar_url: string;
    subscriber_count: string;
    indexed_videos?: number;
    total_videos?: number;
    ingestion_status?: string;
    ingestion_progress?: number;
    last_indexed_at?: string;
    ingest_videos?: boolean;
    ingest_shorts?: boolean;
    ingest_lives?: boolean;
    video_import_mode?: VideoImportMode;
    video_import_limit?: number | null;
  };
  ingestion?: {
    method: string;
    status: string;
    videos_indexed: number;
    error_message: string | null;
  };
  error?: string;
}
