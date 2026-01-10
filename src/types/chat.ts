export interface Creator {
  id: string;
  name: string;
  avatar: string;
  subscriberCount: string;
  videosIndexed: number;
  status: 'processing' | 'completed' | 'failed' | 'no_captions' | 'partial';
  progress?: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  confidence?: ConfidenceLevel;
  sources?: VideoSource[];
}

export interface VideoSource {
  id: string;
  title: string;
  thumbnail: string;
  timestamp?: number;
  url: string;
}

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
  messages: ChatMessage[];
  updatedAt: Date;
}

export interface ChatState {
  selectedCreator: Creator | null;
  currentSession: ChatSession | null;
  messages: ChatMessage[];
  isTyping: boolean;
  isLoading: boolean;
}

export interface VideoPlayerState {
  isOpen: boolean;
  currentVideo: VideoSource | null;
  timestamp?: number;
}

export interface SuggestedPrompt {
  id: string;
  text: string;
  category: 'general' | 'specific';
}
