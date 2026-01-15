import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { ChatMessage, VideoSource } from '@/types/chat';
import { useAuth } from '@/hooks/useAuth';

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

interface DbChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  sources: VideoSource[] | null;
  created_at: string;
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
  }, [channelId, user]);

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
        // No debug info for loaded messages - only show for fresh responses
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
          sources: sources.length > 0 ? (sources as any) : null,
        } as any)
        .select()
        .single();

      if (error) throw error;

      // Update session's updated_at
      await supabase
        .from('chat_sessions')
        .update({ updated_at: new Date().toISOString() } as any)
        .eq('id', sessionId);

      return (data as any).id;
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

    // Force a render with typing indicator before adding user message
    await new Promise(resolve => setTimeout(resolve, 0));

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
    };

    // Add user message to state
    setMessages(prev => [...prev, userMessage]);

    // Save user message to DB
    const userMsgId = await saveMessage('user', query);
    if (userMsgId) {
      userMessage.id = userMsgId;
    }

    // Create streaming AI message
    const streamingMessageId = `ai-${Date.now()}`;
    const streamingMessage: ChatMessage = {
      id: streamingMessageId,
      type: 'ai',
      content: '',
      sources: [],
      timestamp: new Date(),
      isTyping: true,
    };
    
    setMessages(prev => [...prev, streamingMessage]);

    try {
      console.log(`[RAG Chat] Sending streaming query to channel: ${channelId}`);

      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

      // Call streaming endpoint
      const response = await fetch(
        `${supabaseUrl}/functions/v1/rag-chat`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query,
            channel_id: channelId,
            creator_name: creatorName || 'the creator',
            conversation_history: conversationHistory,
            user_id: user?.id || null,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Read the stream
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let fullContent = '';
      let finalData: any = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.content) {
                // Append content
                fullContent += data.content;
                setMessages(prev => prev.map(m => 
                  m.id === streamingMessageId
                    ? { ...m, content: fullContent }
                    : m
                ));
              }
              
              if (data.done) {
                // Store final metadata
                finalData = data;
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }

      // Update final message with metadata
      // Map citations to VideoSource format
      const sources: VideoSource[] = (finalData?.citations || []).map((citation: any) => ({
        videoId: citation.videoId,
        title: citation.videoTitle || citation.title || 'Unknown Video',
        timestamp: citation.timestamp || null,
        timestampSeconds: citation.startTime || null,
        endTimeSeconds: citation.endTime || null,
        thumbnailUrl: citation.thumbnailUrl || undefined,
        hasTimestamp: citation.hasTimestamp ?? (citation.startTime !== null && citation.startTime !== undefined),
        id: citation.videoId,
      }));

      const finalMessage: ChatMessage = {
        id: streamingMessageId,
        type: 'ai',
        content: fullContent,
        sources,
        showSources: finalData?.showCitations,
        timestamp: new Date(),
        confidence: finalData?.confidence,
        evidence: finalData?.evidence,
        isTyping: false,
      };

      setMessages(prev => prev.map(m => 
        m.id === streamingMessageId ? finalMessage : m
      ));

      // Save AI message to DB
      const aiMsgId = await saveMessage('assistant', fullContent, finalData?.citations || []);
      if (aiMsgId) {
        setMessages(prev => prev.map(m => 
          m.id === streamingMessageId ? { ...m, id: aiMsgId } : m
        ));
      }

      return finalMessage;
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
      };

      setMessages(prev => prev.filter(m => m.id !== streamingMessageId).concat(errorChatMessage));
      return errorChatMessage;
    } finally {
      setIsLoading(false);
    }
  }, [channelId, creatorName, messages, sessionId, user, saveMessage]);

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
  }, [sessionId]);

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
