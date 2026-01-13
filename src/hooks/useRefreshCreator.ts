import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { Creator } from '@/types/chat';

interface RefreshResult {
  success: boolean;
  newVideosCount?: number;
  upToDate?: boolean;
  error?: string;
}

export function useRefreshCreator(onUpdate?: (creator: Creator) => void) {
  const { user } = useAuth();
  const [refreshingIds, setRefreshingIds] = useState<Set<string>>(new Set());

  const refreshCreator = useCallback(async (channelId: string): Promise<RefreshResult> => {
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    setRefreshingIds(prev => new Set(prev).add(channelId));

    try {
      console.log('[Refresh] Starting refresh for channel:', channelId);

      // Call edge function in refresh mode
      const { data, error: functionError } = await supabase.functions.invoke('ingest-youtube-channel', {
        body: { 
          refresh: true,
          channelId: channelId,
          userId: user.id,
        },
      });

      if (functionError) {
        throw new Error(functionError.message);
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Refresh failed');
      }

      // Check if up to date
      if (data.up_to_date) {
        toast.info('Creator is up to date', {
          description: 'No new videos found since last sync.',
        });
        return { success: true, upToDate: true };
      }

      // New videos found
      const newCount = data.new_videos_count || 0;
      toast.success('Creator refreshed', {
        description: `Found ${newCount} new video${newCount !== 1 ? 's' : ''}. Processing transcripts...`,
      });

      // Trigger pipeline for new videos
      if (newCount > 0) {
        runPipelineForRefresh(channelId);
      }

      // Update creator data if callback provided
      if (onUpdate && data.channel) {
        const updatedCreator: Creator = {
          id: data.channel.id,
          channelId: data.channel.channel_id,
          name: data.channel.channel_name,
          channelUrl: `https://youtube.com/channel/${data.channel.channel_id}`,
          avatarUrl: data.channel.avatar_url,
          avatar: data.channel.avatar_url,
          subscribers: data.channel.subscriber_count,
          subscriberCount: data.channel.subscriber_count,
          indexedVideos: data.channel.indexed_videos || 0,
          videosIndexed: data.channel.indexed_videos || 0,
          totalVideos: data.channel.total_videos || 0,
          ingestionStatus: data.channel.ingestion_status || 'processing',
          status: data.channel.ingestion_status || 'processing',
          ingestionProgress: 0,
          progress: 0,
          ingestionMethod: null,
          errorMessage: null,
          lastIndexedAt: data.channel.last_indexed_at,
          ingestVideos: true,
          ingestShorts: false,
          ingestLives: false,
          videoImportMode: 'latest',
          videoImportLimit: null,
          publicSlug: null,
        };
        onUpdate(updatedCreator);
      }

      return { success: true, newVideosCount: newCount };
    } catch (err) {
      console.error('[Refresh] Error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh';
      toast.error('Refresh failed', { description: errorMessage });
      return { success: false, error: errorMessage };
    } finally {
      setRefreshingIds(prev => {
        const next = new Set(prev);
        next.delete(channelId);
        return next;
      });
    }
  }, [user, onUpdate]);

  const isRefreshing = useCallback((channelId: string) => {
    return refreshingIds.has(channelId);
  }, [refreshingIds]);

  return {
    refreshCreator,
    isRefreshing,
    refreshingIds,
  };
}

// Run pipeline for refreshed videos
async function runPipelineForRefresh(channelId: string) {
  console.log('[Refresh Pipeline] Starting for:', channelId);
  
  try {
    // Layer 1: Extract transcripts
    const layer1Result = await supabase.functions.invoke('extract-transcripts', {
      body: { channel_id: channelId },
    });
    
    console.log('[Refresh Pipeline] Layer 1 result:', layer1Result.data);
    
    if (layer1Result.data?.readyForLayer2) {
      // Layer 2: Chunk and embed
      const layer2Result = await supabase.functions.invoke('run-pipeline', {
        body: { channel_id: channelId },
      });
      
      console.log('[Refresh Pipeline] Layer 2 result:', layer2Result.data);
    }
  } catch (error) {
    console.error('[Refresh Pipeline] Error:', error);
  }
}
