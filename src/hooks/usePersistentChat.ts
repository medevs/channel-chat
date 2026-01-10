import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { ChatMessage, VideoSource, RagChatResponse } from '@/lib/types';
import { useAuth } from '@/hooks/useAuth';

const DEBUG_MODE = import.meta.env.VITE_DEBUG_MODE === 'true' || import.meta.env.DEV;

interface UsePersistentChatOptions {
  channelId: string | null;
  creatorName?: string;
}

interface DbChatSession {
  id: string;
  channel_id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export function usePersistentChat({ channelId, creatorName }: UsePersistentChatOptions) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Load or create session when channel changes
  useEffect(() => {
    if (!channelId || !user) {
      setSessionId(null);
      setMessages([]);
      return;
    }

    loadOrCreateSession(channelId);
  }, [channelId, user, loadOrCreateSession]);

  const loadOrCreateSession = async (cId: string) => {
    if (!user) return;

    setIsLoadingHistory(true);
    try {
      // Try to find existing session for this channel and user
      const { data: existingSessions, error: fetchError } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('channel_id', cId)
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1);

      if (fetchError) {
        console.error('Error fetching session:', fetchError);
        throw fetchError;
      }

      let session: DbChatSession;

      if (existingSessions && existingSessions.length > 0) {
        session = existingSessions[0] as DbChatSession;
        console.log('[Chat] Loaded existing session:', session.id);
      } else {
        // Create new session with user_id
        const { data: newSession, error: createError } = await supabase
          .from('chat_sessions')
          .insert({ 
            channel_id: cId,
            user_id: user.id,
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating session:', createError);
          throw createError;
        }

        session = newSession as DbChatSession;
        console.log('[Chat] Created new session:', session.id);
      }

      setSessionId(session.id);

      // Load messages for this session
      const { data: dbMessages, error: messagesError } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', session.id)
        .order('created_at', { ascending: true });

      if (messagesError) {
        console.error('Error loading messages:', messagesError);
        throw messagesError;
      }

      // Convert DB messages to ChatMessage format
      const loadedMessages: ChatMessage[] = (dbMessages || []).map((msg: any) => ({
        id: msg.id,
        type: msg.role === 'user' ? 'user' as const : 'ai' as const,
        content: msg.content,
        sources: (msg.sources as VideoSource[]) || [],
        timestamp: new Date(msg.created_at),
        role: msg.role === 'user' ? 'user' as const : 'assistant' as const,
        debug: msg.role === 'assistant' && DEBUG_MODE ? {
          chunksFound: ((msg.sources as VideoSource[])?.length || 0),
          videosReferenced: new Set((msg.sources as VideoSource[])?.map(s => s.videoId) || []).size,
          isFromDatabase: true,
        } : undefined,
      }));

      setMessages(loadedMessages);
      console.log(`[Chat] Loaded ${loadedMessages.length} messages from history`);

    } catch (err) {
      console.error('[Chat] Error loading session:', err);
      setError(err instanceof Error ? err.message : 'Failed to load chat history');
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const saveMessage = async (
    role: 'user' | 'assistant',
    content: string,
    sources: VideoSource[] = []
  ): Promise<string | null> => {
    if (!sessionId) return null;

    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          session_id: sessionId,
          role,
          content,
          sources: sources.length > 0 ? sources : null,
        })
        .select()
        .single();

      if (error) throw error;

      // Update session's updated_at
      await supabase
        .from('chat_sessions')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', sessionId);

      return data?.id;
    } catch (err) {
      console.error('[Chat] Error saving message:', err);
      return null;
    }
  };

  const sendMessage = useCallback(async (query: string): Promise<ChatMessage | null> => {
    if (!query.trim() || !channelId) {
      return null;
    }

    setIsLoading(true);
    setError(null);

    // Build conversation history from current messages for context
    const conversationHistory: ConversationMessage[] = messages.slice(-10).map(m => ({
      role: m.type === 'user' ? 'user' : 'assistant',
      content: m.content,
    }));

    // Create user message immediately
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: query,
      timestamp: new Date(),
      role: 'user',
    };

    // Add user message to state
    setMessages(prev => [...prev, userMessage]);

    // Save user message to DB
    const userMsgId = await saveMessage('user', query);
    if (userMsgId) {
      userMessage.id = userMsgId;
    }

    try {
      console.log(`[RAG Chat] Sending query to channel: ${channelId}`);

      const { data, error: functionError } = await supabase.functions.invoke('rag-chat', {
        body: {
          query,
          channel_id: channelId,
          creator_name: creatorName || 'the creator',
          conversation_history: conversationHistory,
          user_id: user?.id || null,
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
        setMessages(prev => [...prev, limitMessage]);
        return limitMessage;
      }

      if (functionError) {
        throw new Error(functionError.message);
      }

      const response = data as RagChatResponse;

      if (response.error) {
        throw new Error(response.error);
      }

      const hasRealData = response.citations && response.citations.length > 0;
      const chunksFound = response.debug?.chunksFound || 0;

      console.log(`[RAG Chat] Response received - chunks found: ${chunksFound}, citations: ${response.citations?.length || 0}`);

      // Map citations to VideoSource with all timestamp data
      const sources: VideoSource[] = (response.citations || []).map((citation) => ({
        videoId: citation.videoId,
        title: citation.videoTitle,
        timestamp: citation.timestamp || null,
        timestampSeconds: citation.startTime || null,
        endTimeSeconds: citation.endTime || null,
        thumbnailUrl: citation.thumbnailUrl || undefined,
        hasTimestamp: citation.hasTimestamp ?? (citation.startTime !== null && citation.startTime !== undefined),
        chunkId: DEBUG_MODE ? `chunk-${citation.index}` : undefined,
        similarity: DEBUG_MODE ? citation.similarity : undefined,
        chunkText: DEBUG_MODE ? citation.text : undefined,
        // Legacy compatibility
        id: citation.videoId,
        thumbnail: citation.thumbnailUrl || '/video-thumb.jpg',
        url: `https://youtube.com/watch?v=${citation.videoId}`,
      }));

      const aiMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        type: 'ai',
        content: response.answer,
        sources: hasRealData ? sources : [],
        showSources: response.showCitations,
        timestamp: new Date(),
        role: 'assistant',
        // NEW: Confidence and evidence from RAG
        confidence: response.confidence,
        evidence: response.evidence,
        isRefusal: response.isRefusal,
        debug: DEBUG_MODE ? {
          chunksFound: response.debug?.chunksFound || response.evidence?.chunksUsed || 0,
          videosReferenced: response.debug?.videosReferenced || response.evidence?.videosReferenced || 0,
          isFromDatabase: hasRealData,
        } : undefined,
      };

      // Add AI message to state
      setMessages(prev => [...prev, aiMessage]);

      // Save AI message to DB
      const aiMsgId = await saveMessage('assistant', response.answer, sources);
      if (aiMsgId) {
        aiMessage.id = aiMsgId;
      }

      return aiMessage;
    } catch (err) {
      console.error('[RAG Chat] Error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to get response';
      setError(errorMessage);

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

      setMessages(prev => [...prev, errorChatMessage]);
      return errorChatMessage;
    } finally {
      setIsLoading(false);
    }
  }, [channelId, creatorName, messages, sessionId, user?.id]);

  const clearHistory = useCallback(async () => {
    if (!sessionId) return;

    try {
      // Delete all messages for this session
      await supabase
        .from('chat_messages')
        .delete()
        .eq('session_id', sessionId);

      setMessages([]);
      console.log('[Chat] Cleared chat history');
    } catch (err) {
      console.error('[Chat] Error clearing history:', err);
    }
  }, [saveMessage, sessionId]);

  return {
    messages,
    sendMessage,
    isLoading,
    isLoadingHistory,
    error,
    clearHistory,
    sessionId,
  };
}
