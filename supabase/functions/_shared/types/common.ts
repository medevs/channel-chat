// Common TypeScript interfaces used across Edge Function modules

import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// ============================================
// LOGGING INTERFACES
// ============================================
export interface Logger {
  debug: (msg: string, meta?: Record<string, unknown>) => void;
  info: (msg: string, meta?: Record<string, unknown>) => void;
  warn: (msg: string, meta?: Record<string, unknown>) => void;
  error: (msg: string, meta?: Record<string, unknown>) => void;
}

// ============================================
// DEPENDENCY INJECTION
// ============================================
export interface Dependencies {
  supabase: SupabaseClient;
  logger: Logger;
  apiKey?: string;
}

// ============================================
// COMMON RESULT PATTERNS
// ============================================
export interface SuccessResult<T> {
  success: true;
  data: T;
}

export interface ErrorResult {
  success: false;
  error: string;
}

export type Result<T> = SuccessResult<T> | ErrorResult;

// ============================================
// YOUTUBE API TYPES
// ============================================
export interface VideoMetadata {
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
  has_live_streaming_details: boolean;
}

export interface ChannelInfo {
  channel_id: string;
  channel_name: string;
  avatar_url: string;
  subscriber_count: string;
  uploads_playlist_id: string;
}

export interface ContentTypeOptions {
  videos: boolean;
  shorts: boolean;
  lives: boolean;
}

export type VideoImportMode = 'latest' | 'oldest' | 'all';

export interface ImportSettings {
  mode: VideoImportMode;
  limit: number | null;
}

export interface ExistingChannel {
  id: string;
  channel_id: string;
  channel_name: string;
  avatar_url: string;
  subscriber_count: string;
  uploads_playlist_id: string;
  last_indexed_at: string | null;
  ingestion_status: string;
  ingestion_progress: number;
  video_count: number;
}

// ============================================
// RAG TYPES
// ============================================
export interface TranscriptChunk {
  id: string;
  video_id: string;
  channel_id: string;
  chunk_index: number;
  text: string;
  start_time: number | null;
  end_time: number | null;
  similarity: number;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface LLMMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface Citation {
  video_id: string;
  title: string;
  start_time: number | null;
  end_time: number | null;
  thumbnail_url: string | null;
}

export type QuestionType = 'general' | 'conceptual' | 'moment' | 'clarification' | 'followUp';

export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'not_covered';

// ============================================
// USER MANAGEMENT TYPES
// ============================================
export interface UserUsage {
  plan_type: string;
  messages_sent_today: number;
  creators_added: number;
  videos_indexed: number;
}

export interface CreatorLimitCheck {
  allowed: boolean;
  current: number;
  limit: number;
  planType: string;
}

export interface MessageLimitCheck {
  allowed: boolean;
  current: number;
  limit: number;
  planType: string;
}

// ============================================
// PLAN LIMITS
// ============================================
export interface PlanLimits {
  maxCreators: number;
  maxVideosPerCreator: number;
  maxDailyMessages: number;
}

// ============================================
// CONFIGURATION TYPES
// ============================================
export interface RAGConfig {
  retrieval: {
    [key in QuestionType]: {
      matchCount: number;
      minThreshold: number;
      preferredThreshold: number;
      requiresTimestamp: boolean;
    };
  };
  minSimilarityForConfidentAnswer: number;
  minSimilarityForAnyAnswer: number;
  maxHistoryMessages: number;
  showDebugInResponse: boolean;
}

export interface PublicLimits {
  maxDailyMessages: number;
  maxChunks: number;
  minSimilarityThreshold: {
    [key in QuestionType]: number;
  };
  maxAnswerLength: number;
}