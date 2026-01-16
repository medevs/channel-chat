// Re-export all types from chat.ts for compatibility
export * from '@/types/chat';

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
