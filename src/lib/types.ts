// Re-export all types from chat.ts for compatibility
export * from '@/types/chat';

// Additional types that might be needed
export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'not_covered';

export interface VideoPlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  muted: boolean;
}

// Video import mode options
export type VideoImportMode = 'latest' | 'oldest' | 'all';

// Import settings for video ingestion
export interface ImportSettings {
  mode: VideoImportMode;
  limit: number | null; // null = use plan limit
}

// Content types for selective ingestion
export interface ContentTypeOptions {
  videos: boolean;
  shorts: boolean;
  lives: boolean;
}
