import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import type { VideoSource } from '@/types/chat';
import { toast } from 'sonner';

export interface SavedAnswer {
  id: string;
  user_id: string;
  channel_id: string;
  chat_session_id: string;
  message_id: string;
  content: string;
  sources: VideoSource[];
  created_at: string;
  // Joined data
  creator_name?: string;
  creator_avatar?: string;
}

interface UseSavedAnswersOptions {
  channelId?: string | null;
}

export function useSavedAnswers(options: UseSavedAnswersOptions = {}) {
  const { user } = useAuth();
  const [savedAnswers, setSavedAnswers] = useState<SavedAnswer[]>([]);
  const [savedMessageIds, setSavedMessageIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  // Fetch saved answers for current user
  const fetchSavedAnswers = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      let query = supabase
        .from('saved_answers')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (options.channelId) {
        query = query.eq('channel_id', options.channelId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Parse sources and create set of saved message IDs
      const answers: SavedAnswer[] = (data || []).map(row => ({
        ...row,
        sources: (row.sources as unknown as VideoSource[]) || [],
      }));

      setSavedAnswers(answers);
      setSavedMessageIds(new Set(answers.map(a => a.message_id)));
    } catch (error) {
      console.error('Error fetching saved answers:', error);
      toast.error('Failed to load saved answers');
    } finally {
      setIsLoading(false);
    }
  }, [user, options.channelId]);

  // Fetch on mount and when channelId changes
  useEffect(() => {
    fetchSavedAnswers();
  }, [fetchSavedAnswers]);

  // Check if a message is saved
  const isSaved = useCallback((messageId: string) => {
    return savedMessageIds.has(messageId);
  }, [savedMessageIds]);

  // Save an answer
  const saveAnswer = useCallback(async (
    messageId: string,
    channelId: string,
    sessionId: string,
    content: string,
    sources: VideoSource[]
  ) => {
    if (!user) {
      toast.error('Please sign in to save answers');
      return false;
    }

    try {
      const { error } = await supabase
        .from('saved_answers')
        .insert([{
          user_id: user.id,
          channel_id: channelId,
          chat_session_id: sessionId,
          message_id: messageId,
          content,
          sources: JSON.parse(JSON.stringify(sources)),
        }]);

      if (error) {
        if (error.code === '23505') {
          // Unique constraint violation - already saved
          toast.info('Already saved');
          return false;
        }
        throw error;
      }

      // Update local state optimistically
      setSavedMessageIds(prev => new Set([...prev, messageId]));
      toast.success('Answer saved');
      
      // Refresh to get full data
      fetchSavedAnswers();
      return true;
    } catch (error) {
      console.error('Error saving answer:', error);
      toast.error('Failed to save answer');
      return false;
    }
  }, [user, fetchSavedAnswers]);

  // Unsave an answer
  const unsaveAnswer = useCallback(async (messageId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('saved_answers')
        .delete()
        .eq('user_id', user.id)
        .eq('message_id', messageId);

      if (error) throw error;

      // Update local state optimistically
      setSavedMessageIds(prev => {
        const next = new Set(prev);
        next.delete(messageId);
        return next;
      });
      setSavedAnswers(prev => prev.filter(a => a.message_id !== messageId));
      
      toast.success('Removed from saved');
      return true;
    } catch (error) {
      console.error('Error unsaving answer:', error);
      toast.error('Failed to remove');
      return false;
    }
  }, [user]);

  // Toggle save state
  const toggleSave = useCallback(async (
    messageId: string,
    channelId: string,
    sessionId: string,
    content: string,
    sources: VideoSource[]
  ) => {
    if (isSaved(messageId)) {
      return unsaveAnswer(messageId);
    } else {
      return saveAnswer(messageId, channelId, sessionId, content, sources);
    }
  }, [isSaved, saveAnswer, unsaveAnswer]);

  return {
    savedAnswers,
    savedMessageIds,
    isLoading,
    isSaved,
    saveAnswer,
    unsaveAnswer,
    toggleSave,
    refetch: fetchSavedAnswers,
  };
}
