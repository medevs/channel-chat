export interface Creator {
  id: string;
  channelId: string;
  name: string;
  channelUrl: string;
  avatarUrl: string | null;
  avatar?: string | null; // Alias for avatarUrl for compatibility
  subscribers: string | null;
  subscriberCount?: string | null; // Alias for subscribers for compatibility
  indexedVideos: number;
  videosIndexed?: number; // Alias for indexedVideos for compatibility
  totalVideos: number;
  ingestionStatus: 'pending' | 'indexing' | 'extracting' | 'processing' | 'completed' | 'partial' | 'failed' | 'paused' | 'no_captions';
  status?: 'pending' | 'indexing' | 'extracting' | 'processing' | 'completed' | 'partial' | 'failed' | 'paused' | 'no_captions'; // Alias for ingestionStatus
  ingestionProgress: number;
  progress?: number; // Alias for ingestionProgress for compatibility
  ingestionMethod: string | null;
  errorMessage: string | null;
  lastIndexedAt: string | null;
  ingestVideos: boolean;
  ingestShorts: boolean;
  ingestLives: boolean;
  videoImportMode: 'latest' | 'oldest' | 'all';
  videoImportLimit: number | null;
  publicSlug: string | null;
}

export interface VideoSource {
  id?: string; // Optional id for compatibility
  videoId: string;
  title: string;
  timestamp: string | null;
  timestampSeconds: number | null;
  endTimeSeconds?: number | null;
  thumbnailUrl?: string;
  hasTimestamp: boolean;
  chunkId?: string;
  similarity?: number;
  chunkText?: string;
}

export interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  role?: 'user' | 'assistant'; // Alias for type for compatibility
  content: string;
  sources?: VideoSource[];
  showSources?: boolean;
  timestamp: Date;
  confidence?: 'high' | 'medium' | 'low' | 'not_covered';
  evidence?: {
    chunksUsed: number;
    videosReferenced: number;
  };
  isRefusal?: boolean;
  debug?: {
    chunksFound?: number;
    videosReferenced?: number;
    isFromDatabase?: boolean;
  };
}

export interface ActiveVideo {
  videoId: string;
  title: string;
  creatorName: string;
  timestamp: string | null;
  timestampSeconds: number | null;
}

export type AnswerConfidence = 'high' | 'medium' | 'low' | 'not_covered';
export type ConfidenceLevel = AnswerConfidence; // Alias for compatibility

export interface VideoPlayerState {
  isOpen: boolean;
  currentVideo: VideoSource | null;
  timestamp: number | undefined;
}

export interface AnswerEvidence {
  chunksUsed: number;
  videosReferenced: number;
}

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
  showCitations?: boolean;
  confidence?: AnswerConfidence;
  evidence?: AnswerEvidence;
  isRefusal?: boolean;
  debug?: {
    chunksFound: number;
    videosReferenced: number;
  };
  error?: string;
}
