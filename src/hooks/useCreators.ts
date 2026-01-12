import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { Creator } from '@/types/chat';
import { useAuth } from '@/hooks/useAuth';

export function useCreators() {
  const { user } = useAuth();
  const [creators, setCreators] = useState<Creator[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const creatorsRef = useRef<Creator[]>([]);

  const fetchCreators = useCallback(async (showLoading = true) => {
    if (!user) {
      setCreators([]);
      setIsLoading(false);
      return;
    }

    try {
      if (showLoading) setIsLoading(true);
      setError(null);

      // Fetch creators linked to current user via user_creators join
      const { data, error: fetchError } = await supabase
        .from('user_creators')
        .select(`
          channel_id,
          created_at,
          channels:channel_id (
            id,
            channel_id,
            channel_name,
            channel_url,
            avatar_url,
            subscriber_count,
            indexed_videos,
            total_videos,
            ingestion_status,
            ingestion_progress,
            ingestion_method,
            error_message,
            last_indexed_at,
            ingest_videos,
            ingest_shorts,
            ingest_lives,
            video_import_mode,
            video_import_limit,
            public_slug
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      // Map joined data to Creator type
      const mappedCreators: Creator[] = (data || [])
        .filter((row: any) => row.channels) // Filter out rows where channel might be deleted
        .map((row: any) => {
          const channel = row.channels;
          const ingestionStatus = (channel.ingestion_status as Creator['ingestionStatus']) || 'pending';
          const ingestionProgress = channel.ingestion_progress || 0;
          const indexedVideos = channel.indexed_videos || 0;
          const avatarUrl = channel.avatar_url;
          const subscribers = channel.subscriber_count;
          
          return {
            id: channel.id,
            channelId: channel.channel_id,
            name: channel.channel_name,
            channelUrl: channel.channel_url,
            avatarUrl,
            avatar: avatarUrl, // Alias for compatibility
            subscribers,
            subscriberCount: subscribers, // Alias for compatibility
            indexedVideos,
            videosIndexed: indexedVideos, // Alias for compatibility
            totalVideos: channel.total_videos || 0,
            ingestionStatus,
            status: ingestionStatus, // Alias for compatibility
            ingestionProgress,
            progress: ingestionProgress, // Alias for compatibility
            ingestionMethod: channel.ingestion_method,
            errorMessage: channel.error_message,
            lastIndexedAt: channel.last_indexed_at,
            ingestVideos: channel.ingest_videos ?? true,
            ingestShorts: channel.ingest_shorts ?? false,
            ingestLives: channel.ingest_lives ?? false,
            videoImportMode: channel.video_import_mode || 'latest',
            videoImportLimit: channel.video_import_limit,
            publicSlug: channel.public_slug || null,
          };
        });

      setCreators(mappedCreators);
      creatorsRef.current = mappedCreators;
    } catch (err) {
      console.error('Error fetching creators:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch creators');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Fetch on mount and when user changes
  useEffect(() => {
    fetchCreators();
  }, [fetchCreators]);

  // Polling effect for creators being processed
  useEffect(() => {
    const checkAndPoll = () => {
      const hasProcessing = creatorsRef.current.some(
        c => c.ingestionStatus === 'pending' || c.ingestionStatus === 'indexing' || c.ingestionStatus === 'processing' || c.ingestionStatus === 'extracting' || c.ingestionStatus === 'paused'
      );
      if (hasProcessing) {
        fetchCreators(false);
      }
    };

    const interval = setInterval(checkAndPoll, 2000);
    return () => clearInterval(interval);
  }, [fetchCreators]);

  // Add a creator link for the current user
  const addCreator = useCallback(async (creator: Creator) => {
    if (!user) return;

    // Link user to this creator
    await supabase
      .from('user_creators')
      .insert({
        user_id: user.id,
        channel_id: creator.id,
      });

    // Update local state
    setCreators((prev) => {
      const updated = [creator, ...prev];
      creatorsRef.current = updated;
      return updated;
    });
  }, [user]);

  // Refresh creators from database
  const refresh = useCallback(() => {
    fetchCreators();
  }, [fetchCreators]);

  // Remove creator from user's list (not delete the channel)
  const deleteCreator = useCallback(async (creatorId: string, channelId: string) => {
    if (!user) return { success: false, error: 'Not authenticated' };

    try {
      // First, delete user's chat sessions and messages for this channel
      // We delete messages first due to foreign key constraints
      const { data: sessions } = await supabase
        .from('chat_sessions')
        .select('id')
        .eq('channel_id', channelId)
        .eq('user_id', user.id);

      if (sessions && sessions.length > 0) {
        const sessionIds = sessions.map(s => s.id);
        
        // Delete messages first (child records)
        const { error: msgError } = await supabase
          .from('chat_messages')
          .delete()
          .in('session_id', sessionIds);
        
        if (msgError) {
          console.error('Error deleting chat messages:', msgError);
        }
        
        // Then delete sessions
        const { error: sessError } = await supabase
          .from('chat_sessions')
          .delete()
          .in('id', sessionIds);
          
        if (sessError) {
          console.error('Error deleting chat sessions:', sessError);
        }
      }

      // Remove user's link to this creator
      const { error: unlinkError } = await supabase
        .from('user_creators')
        .delete()
        .eq('user_id', user.id)
        .eq('channel_id', creatorId);

      if (unlinkError) throw new Error(unlinkError.message);

      // Update local state
      setCreators((prev) => {
        const updated = prev.filter(c => c.id !== creatorId);
        creatorsRef.current = updated;
        return updated;
      });

      return { success: true };
    } catch (err) {
      console.error('Error removing creator:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Failed to remove creator' };
    }
  }, [user]);

  return {
    creators,
    isLoading,
    error,
    addCreator,
    refresh,
    deleteCreator,
  };
}
