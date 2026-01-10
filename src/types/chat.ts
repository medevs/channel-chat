// Re-export all types from the main types file to maintain compatibility
export type {
  Creator,
  ChatMessage,
  VideoSource,
  AnswerConfidence,
  AnswerEvidence,
  ActiveVideo,
  RagChatResponse,
  VideoImportMode,
  ImportSettings,
  ContentTypeOptions,
  IngestChannelResponse,
} from '@/lib/types';

// Legacy types for backward compatibility
export interface ConfidenceLevel {
  level: 'high' | 'medium' | 'low' | 'not_covered';
  label: string;
  description: string;
  evidenceCount?: number;
  videoCount?: number;
}

export interface ChatSession {
  id: string;
  creatorId: string;
  messages: import('@/lib/types').ChatMessage[];
  updatedAt: Date;
}

export interface ChatState {
  selectedCreator: import('@/lib/types').Creator | null;
  currentSession: ChatSession | null;
  messages: import('@/lib/types').ChatMessage[];
  isTyping: boolean;
  isLoading: boolean;
}

export interface VideoPlayerState {
  isOpen: boolean;
  currentVideo: import('@/lib/types').VideoSource | null;
  timestamp?: number;
}

export interface SuggestedPrompt {
  id: string;
  text: string;
  category: 'general' | 'specific';
}
