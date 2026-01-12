import { useState, useEffect, useCallback } from 'react';
import type { VideoSource } from '@/types/chat';

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
  const [savedAnswers, setSavedAnswers] = useState<SavedAnswer[]>([]);
  const [savedMessageIds, setSavedMessageIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  // Mock data for now
  useEffect(() => {
    setSavedAnswers([]);
    setSavedMessageIds(new Set());
  }, [options.channelId]);

  const isSaved = useCallback((messageId: string) => {
    return savedMessageIds.has(messageId);
  }, [savedMessageIds]);

  const toggleSave = useCallback(async (
    messageId: string,
    channelId: string,
    sessionId: string,
    content: string,
    sources: VideoSource[]
  ) => {
    // Mock implementation
    if (savedMessageIds.has(messageId)) {
      setSavedMessageIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(messageId);
        return newSet;
      });
    } else {
      setSavedMessageIds(prev => new Set(prev).add(messageId));
    }
  }, [savedMessageIds]);

  return {
    savedAnswers,
    isLoading,
    isSaved,
    toggleSave,
  };
}
