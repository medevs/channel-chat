import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface VoiceConversation {
  id: string;
  channel_id: string;
  creator_name: string;
  duration_seconds: number;
  transcript: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
  }>;
  created_at: string;
  channels?: {
    avatar_url: string | null;
  };
}

export function useVoiceConversations() {
  const [conversations, setConversations] = useState<VoiceConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: conversations, error: fetchError } = await supabase
        .from('voice_conversations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      // Fetch channel avatars separately
      if (conversations && conversations.length > 0) {
        const channelIds = [...new Set(conversations.map(c => c.channel_id))];
        const { data: channels } = await supabase
          .from('channels')
          .select('id, avatar_url')
          .in('id', channelIds);

        const channelMap = new Map(channels?.map(c => [c.id, c.avatar_url]) || []);
        
        const conversationsWithAvatars = conversations.map(conv => ({
          ...conv,
          channels: { avatar_url: channelMap.get(conv.channel_id) || null }
        }));

        setConversations(conversationsWithAvatars);
      } else {
        setConversations([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch conversations');
    } finally {
      setLoading(false);
    }
  };

  const deleteConversation = async (id: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('voice_conversations')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;
      setConversations(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to delete conversation');
    }
  };

  return {
    conversations,
    loading,
    error,
    refresh: fetchConversations,
    deleteConversation,
  };
}
