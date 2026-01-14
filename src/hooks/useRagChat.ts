import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { ChatMessage, VideoSource, RagChatResponse } from '@/lib/types';
import { useAuth } from '@/hooks/useAuth';

// Debug mode - controlled by environment variable
const DEBUG_MODE = import.meta.env.VITE_DEBUG_MODE === 'true' || import.meta.env.DEV;

interface UseRagChatOptions {
  channelId: string | null;
}

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export function useRagChat({ channelId }: UseRagChatOptions) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);

  const sendMessage = useCallback(async (query: string): Promise<ChatMessage | null> => {
    if (!query.trim()) {
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log(`[RAG Chat] Sending query to channel: ${channelId || 'all'}`);

      const { data, error: functionError } = await supabase.functions.invoke('rag-chat', {
        body: {
          query,
          channel_id: channelId,
          conversation_history: conversationHistory,
          user_id: user?.id || null,
          public_mode: !user,
          client_identifier: !user ? `client-${Date.now()}` : undefined,
        },
      });

      // Check for limit exceeded response
      if (data?.limit_exceeded) {
        const limitMessage: ChatMessage = {
          id: `ai-${Date.now()}`,
          type: 'ai',
          content: data.message || 'Daily message limit reached. Try again tomorrow.',
          sources: [],
          timestamp: new Date(),
          role: 'assistant',
        };
        return limitMessage;
      }

      if (functionError) {
        throw new Error(functionError.message);
      }

      const response = data as RagChatResponse;

      if (response.error) {
        throw new Error(response.error);
      }

      // Check if we got real data from the database
      const hasRealData = response.citations && response.citations.length > 0;
      const chunksFound = response.debug?.chunksFound || 0;

      console.log(`[RAG Chat] Response received - chunks found: ${chunksFound}, citations: ${response.citations?.length || 0}`);

      // If no chunks were found, return explicit message
      if (!hasRealData || chunksFound === 0) {
        const noDataMessage: ChatMessage = {
          id: `ai-${Date.now()}`,
          type: 'ai',
          content: "I don't have enough data indexed yet to answer that question. Please make sure the creator's videos have been fully processed (transcripts extracted and embeddings generated).",
          sources: [],
          timestamp: new Date(),
          role: 'assistant',
          debug: DEBUG_MODE ? {
            chunksFound: 0,
            videosReferenced: 0,
            isFromDatabase: false,
          } : undefined,
        };
        return noDataMessage;
      }

      // Map citations to VideoSource with debug info
      const sources: VideoSource[] = response.citations.map((citation) => ({
        videoId: citation.videoId,
        title: citation.videoTitle,
        timestamp: citation.timestamp || null,
        timestampSeconds: citation.startTime || null,
        endTimeSeconds: citation.endTime || null,
        thumbnailUrl: citation.thumbnailUrl || undefined,
        hasTimestamp: citation.hasTimestamp ?? (citation.startTime !== null && citation.startTime !== undefined),
        // Debug info
        chunkId: DEBUG_MODE ? `chunk-${citation.index}` : undefined,
        similarity: DEBUG_MODE ? citation.similarity : undefined,
        chunkText: DEBUG_MODE ? citation.text : undefined,
        // Legacy compatibility
        id: citation.videoId,
        thumbnail: citation.thumbnailUrl || '/video-thumb.jpg',
        url: `https://youtube.com/watch?v=${citation.videoId}`,
      }));

      // Update conversation history
      setConversationHistory((prev) => [
        ...prev,
        { role: 'user' as const, content: query },
        { role: 'assistant' as const, content: response.answer },
      ]);

      const aiMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        type: 'ai',
        content: response.answer,
        sources,
        showSources: response.showCitations ?? true, // Default to true if not specified
        timestamp: new Date(),
        debug: DEBUG_MODE ? {
          chunksFound: response.debug?.chunksFound || 0,
          videosReferenced: response.debug?.videosReferenced || 0,
          isFromDatabase: true,
        } : undefined,
        // Legacy compatibility
        role: 'assistant',
      };

      return aiMessage;
    } catch (err) {
      console.error('[RAG Chat] Error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to get response';
      setError(errorMessage);

      // Return error message
      const errorChatMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        type: 'ai',
        content: `Error: ${errorMessage}. Please try again.`,
        sources: [],
        timestamp: new Date(),
        role: 'assistant',
        debug: DEBUG_MODE ? {
          chunksFound: 0,
          videosReferenced: 0,
          isFromDatabase: false,
        } : undefined,
      };
      return errorChatMessage;
    } finally {
      setIsLoading(false);
    }
  }, [channelId, conversationHistory, user]);

  const clearHistory = useCallback(() => {
    setConversationHistory([]);
  }, []);

  return {
    sendMessage,
    isLoading,
    error,
    clearHistory,
  };
}
