import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import type { Creator, ContentTypeOptions, ImportSettings } from '@/lib/types';

// Configuration constants
const INGEST_TIMEOUT_MS = 30000; // 30 seconds

export function useIngestChannel() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ingestChannel = useCallback(async (
    channelUrl: string,
    contentTypes?: ContentTypeOptions,
    importSettings?: ImportSettings
  ): Promise<Creator | null> => {
    if (!user) {
      setError('You must be logged in to add channels');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('Ingesting channel:', channelUrl);

      // Add timeout and better error handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), INGEST_TIMEOUT_MS);

      const { data, error: functionError } = await supabase.functions.invoke('ingest-youtube-channel', {
        body: {
          channelUrl: channelUrl,
          userId: user.id,
          contentTypes: contentTypes || {
            videos: true,
            shorts: false,
            lives: false
          },
          importSettings: importSettings || {
            mode: 'latest',
            limit: 3 // Test with max 3 videos
          }
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (functionError) {
        console.error('Function error:', functionError);
        console.error('Function error details:', JSON.stringify(functionError, null, 2));
        const errorMessage = functionError.message || 'Failed to add channel';
        
        // Handle specific error types
        if (errorMessage.includes('timeout') || errorMessage.includes('AbortError')) {
          setError('Request timed out. Please try again.');
        } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
          setError('Network error. Please check your connection and try again.');
        } else if (errorMessage.includes('quota') || errorMessage.includes('rate limit')) {
          setError('Service temporarily unavailable. Please try again later.');
        } else {
          setError(errorMessage);
        }
        return null;
      }

      if (!data) {
        setError('No response received from server. Please try again.');
        return null;
      }

      if (data?.error) {
        console.error('API error:', data.error);
        console.error('Full response:', data);
        setError(data.error);
        return null;
      }

      if (!data?.success) {
        setError('Failed to add channel. Please verify the URL and try again.');
        return null;
      }

      console.log('Channel ingestion response:', data);

      // Validate response structure
      if (!data.channel || !data.channel.id || !data.channel.channel_id) {
        setError('Invalid response from server. Please try again.');
        return null;
      }

      // Convert response to Creator format
      const creator: Creator = {
        id: data.channel.id,
        channelId: data.channel.channel_id,
        name: data.channel.channel_name,
        channelUrl: channelUrl,
        avatarUrl: data.channel.avatar_url,
        subscribers: data.channel.subscriber_count,
        indexedVideos: data.channel.indexed_videos || 0,
        totalVideos: data.channel.total_videos || 0,
        ingestionStatus: data.channel.ingestion_status || 'pending',
        ingestionProgress: data.channel.ingestion_progress || 0,
        ingestionMethod: data.channel.ingestion_method,
        errorMessage: null,
        lastIndexedAt: data.channel.last_indexed_at,
        ingestVideos: data.channel.ingest_videos ?? true,
        ingestShorts: data.channel.ingest_shorts ?? false,
        ingestLives: data.channel.ingest_lives ?? false,
        videoImportMode: data.channel.video_import_mode || 'latest',
        videoImportLimit: data.channel.video_import_limit,
        publicSlug: null,
        // Legacy compatibility
        avatar: data.channel.avatar_url || '',
        subscriberCount: data.channel.subscriber_count || '',
        videosIndexed: data.channel.indexed_videos || 0,
        status: data.channel.ingestion_status || 'pending',
        progress: data.channel.ingestion_progress || 0,
      };

      return creator;
    } catch (err) {
      console.error('Ingestion error:', err);
      
      // Handle different error types
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          setError('Request timed out. Please try again.');
        } else if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
          setError('Network error. Please check your connection and try again.');
        } else if (err.message.includes('JSON')) {
          setError('Invalid server response. Please try again.');
        } else {
          setError(err.message);
        }
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    ingestChannel,
    isLoading,
    error,
    clearError,
  };
}
