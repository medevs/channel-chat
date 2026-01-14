import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { requireAuth } from "../_shared/auth-middleware.ts";

/**
 * LAYER 1: Transcript Extraction Edge Function
 * 
 * Uses TranscriptAPI.com (api/v2) for reliable transcript extraction.
 * Free tier: 100 transcripts
 * 
 * Status Codes:
 * - completed: Transcript fetched with segments
 * - no_captions: Video has no captions enabled
 * - failed: API error, can retry
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const TRANSCRIPT_API_KEY = Deno.env.get('TRANSCRIPT_API_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const DELAY_BETWEEN_VIDEOS_MS = 200; // Rate limiting for free tier (60 req/min)

interface TranscriptSegment {
  text: string;
  start: number; // seconds
  end: number;   // seconds
}

interface TranscriptAPIItem {
  text: string;
  start: number | string;
  duration: number | string;
}

interface ExtractionResult {
  status: 'completed' | 'no_captions' | 'failed';
  segments: TranscriptSegment[];
  fullText: string;
  errorMessage?: string;
}

/**
 * Fetch transcript using TranscriptAPI.com v2 API
 * Docs: https://transcriptapi.com/docs/api
 * Endpoint: GET https://transcriptapi.com/api/v2/youtube/transcript?video_url={videoId}
 * Auth: Authorization: Bearer {API_KEY}
 */
async function fetchTranscript(videoId: string): Promise<ExtractionResult> {
  console.log(`[TranscriptAPI] Fetching: ${videoId}`);
  
  try {
    const url = `https://transcriptapi.com/api/v2/youtube/transcript?video_url=${videoId}`;
    console.log(`[TranscriptAPI] URL: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${TRANSCRIPT_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });
    
    console.log(`[TranscriptAPI] Response status: ${response.status}`);
    
    if (response.status === 404) {
      console.log(`[TranscriptAPI] No captions for: ${videoId}`);
      return {
        status: 'no_captions',
        segments: [],
        fullText: '',
        errorMessage: 'No captions available for this video',
      };
    }
    
    if (response.status === 401 || response.status === 403) {
      const errorText = await response.text();
      console.error(`[TranscriptAPI] Auth error: ${errorText}`);
      return {
        status: 'failed',
        segments: [],
        fullText: '',
        errorMessage: 'Invalid or missing TranscriptAPI key',
      };
    }
    
    if (response.status === 429) {
      console.error(`[TranscriptAPI] Rate limited`);
      return {
        status: 'failed',
        segments: [],
        fullText: '',
        errorMessage: 'Rate limited - try again later',
      };
    }
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[TranscriptAPI] Error: ${response.status} - ${errorText}`);
      return {
        status: 'failed',
        segments: [],
        fullText: '',
        errorMessage: `API error: ${response.status} - ${errorText.substring(0, 100)}`,
      };
    }
    
    const data = await response.json();
    console.log(`[TranscriptAPI] Response keys:`, Object.keys(data));
    
    // TranscriptAPI v2 returns: { video_id, language, transcript: [{ text, start, duration }...] }
    const transcriptItems = data.transcript;
    
    if (!Array.isArray(transcriptItems)) {
      console.error(`[TranscriptAPI] Unexpected response format:`, JSON.stringify(data).substring(0, 200));
      return {
        status: 'failed',
        segments: [],
        fullText: '',
        errorMessage: 'Unexpected API response format',
      };
    }
    
    if (transcriptItems.length === 0) {
      return {
        status: 'no_captions',
        segments: [],
        fullText: '',
        errorMessage: 'No captions available for this video',
      };
    }
    
    // Convert to our segment format
    // API returns: { text, start (seconds), duration (seconds) }
    const segments: TranscriptSegment[] = transcriptItems.map((item: TranscriptAPIItem) => {
      const start = typeof item.start === 'number' ? item.start : parseFloat(item.start) || 0;
      const duration = typeof item.duration === 'number' ? item.duration : parseFloat(item.duration) || 2;
      return {
        text: (item.text || '').trim(),
        start: start,
        end: start + duration,
      };
    }).filter((seg: TranscriptSegment) => seg.text.length > 0);
    
    if (segments.length === 0) {
      return {
        status: 'no_captions',
        segments: [],
        fullText: '',
        errorMessage: 'Transcript returned but no usable text',
      };
    }
    
    const fullText = segments.map(s => s.text).join(' ');
    
    console.log(`[TranscriptAPI] SUCCESS: ${segments.length} segments, ${fullText.length} chars`);
    
    return {
      status: 'completed',
      segments,
      fullText,
    };
    
  } catch (error) {
    console.error(`[TranscriptAPI] Exception:`, error);
    return {
      status: 'failed',
      segments: [],
      fullText: '',
      errorMessage: String(error),
    };
  }
}

/**
 * Process a single video and store result in database
 */
async function processVideoTranscript(
  videoId: string, 
  channelId: string
): Promise<{
  success: boolean;
  status: string;
  segmentCount: number;
  error?: string;
}> {
  try {
    // Check if already successfully processed
    const { data: existing } = await supabase
      .from('transcripts')
      .select('extraction_status, segments')
      .eq('video_id', videoId)
      .maybeSingle();
    
    if (existing?.extraction_status === 'completed' && existing?.segments?.length > 0) {
      console.log(`[Skip] Already processed: ${videoId} (${existing.segments.length} segments)`);
      return { success: true, status: 'completed', segmentCount: existing.segments.length };
    }
    
    // Fetch transcript from TranscriptAPI
    const result = await fetchTranscript(videoId);
    
    // Store result in database
    const { error: upsertError } = await supabase
      .from('transcripts')
      .upsert({
        video_id: videoId,
        channel_id: channelId,
        full_text: result.fullText || null,
        segments: result.segments,
        source_type: result.status === 'completed' ? 'caption' : 'none',
        extraction_status: result.status,
        error_message: result.errorMessage || null,
        confidence: result.status === 'completed' ? 0.95 : 0,
      }, { onConflict: 'video_id' });
    
    if (upsertError) {
      console.error(`[DB Error] ${videoId}:`, upsertError);
      return { success: false, status: 'failed', segmentCount: 0, error: upsertError.message };
    }
    
    return {
      success: result.status === 'completed',
      status: result.status,
      segmentCount: result.segments.length,
      error: result.errorMessage,
    };
    
  } catch (error) {
    console.error(`[Error] Processing ${videoId}:`, error);
    return { success: false, status: 'failed', segmentCount: 0, error: String(error) };
  }
}

/**
 * Update channel progress
 */
async function updateChannelProgress(channelId: string, progress: number, status?: string, errorMessage?: string) {
  const update: Record<string, string | number | null> = { ingestion_progress: progress };
  if (status) update.ingestion_status = status;
  if (errorMessage !== undefined) update.error_message = errorMessage;
  
  const { error } = await supabase.from('channels').update(update).eq('channel_id', channelId);
  if (error) {
    console.error(`[Progress Update Error]`, error);
  }
  console.log(`[Progress] ${channelId}: ${progress}%${status ? ` (${status})` : ''}`);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  // Note: No authentication required - this function is only called internally
  // by other Edge Functions using the service role key
  
  try {
    // Validate API key exists
    if (!TRANSCRIPT_API_KEY) {
      console.error('TRANSCRIPT_API_KEY not configured');
      return new Response(JSON.stringify({ 
        error: 'TRANSCRIPT_API_KEY not configured. Add it in project secrets.' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const body = await req.json();
    const channelId = body.channelId || body.channel_id;
    
    if (!channelId) {
      return new Response(JSON.stringify({ error: 'channelId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    console.log(`\n==========================================`);
    console.log(`LAYER 1: Transcript Extraction (TranscriptAPI v2)`);
    console.log(`Channel: ${channelId}`);
    console.log(`==========================================\n`);
    
    // Update status to extracting
    await updateChannelProgress(channelId, 0, 'extracting', undefined);
    
    // Get all videos for the channel
    const { data: videos, error: videosError } = await supabase
      .from('videos')
      .select('video_id, title')
      .eq('channel_id', channelId)
      .order('published_at', { ascending: false });
    
    if (videosError || !videos || videos.length === 0) {
      const error = videosError?.message || 'No videos found';
      await updateChannelProgress(channelId, 0, 'failed', error);
      return new Response(JSON.stringify({ success: false, error }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    console.log(`Found ${videos.length} videos to process\n`);
    
    // Process videos
    const stats = {
      total: videos.length,
      completed: 0,
      no_captions: 0,
      failed: 0,
    };
    
    for (let i = 0; i < videos.length; i++) {
      const video = videos[i];
      const progress = Math.round(((i + 1) / videos.length) * 100);
      
      console.log(`\n[${i + 1}/${videos.length}] ${video.title?.substring(0, 50) || video.video_id}...`);
      
      const result = await processVideoTranscript(video.video_id, channelId);
      
      // Update video status
      await supabase
        .from('videos')
        .update({ transcript_status: result.status })
        .eq('video_id', video.video_id);
      
      // Track stats
      if (result.status === 'completed') stats.completed++;
      else if (result.status === 'no_captions') stats.no_captions++;
      else stats.failed++;
      
      // Update progress after each video
      await updateChannelProgress(channelId, progress, 'extracting');
      
      // Delay between videos to respect rate limits
      if (i < videos.length - 1) {
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_VIDEOS_MS));
      }
    }
    
    // Determine final status
    let finalStatus: string;
    let errorMessage: string | null = null;
    
    if (stats.completed > 0) {
      // At least some videos have captions - move to processing (embeddings)
      finalStatus = 'processing';
    } else if (stats.no_captions === videos.length) {
      // All videos have no captions - this is a data limitation
      finalStatus = 'no_captions';
      errorMessage = 'No captions available for any video in this channel.';
    } else {
      finalStatus = 'failed';
      errorMessage = `Extraction failed. ${stats.failed} failed, ${stats.no_captions} no captions.`;
    }
    
    // Update channel status
    const { error: finalUpdateError } = await supabase.from('channels').update({
      ingestion_status: finalStatus,
      ingestion_progress: 100,
      error_message: errorMessage,
    }).eq('channel_id', channelId);
    
    if (finalUpdateError) {
      console.error(`[Final Update Error]`, finalUpdateError);
    }
    
    console.log(`\n==========================================`);
    console.log(`Layer 1 Complete: ${finalStatus}`);
    console.log(`Stats: ${JSON.stringify(stats)}`);
    console.log(`==========================================\n`);
    
    // Trigger Layer 2 (chunking and embeddings) if we have completed transcripts
    if (stats.completed > 0) {
      console.log('Triggering Layer 2 (run-pipeline) for channel:', channelId);
      fetch(`${SUPABASE_URL}/functions/v1/run-pipeline`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ 
          channel_id: channelId,
          process_all: true  // Process all transcripts for this channel
        }),
      }).catch(err => console.error('Failed to trigger run-pipeline:', err));
    }
    
    return new Response(JSON.stringify({
      success: stats.completed > 0,
      status: finalStatus,
      stats,
      errorMessage,
      readyForLayer2: stats.completed > 0,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Extract-transcripts error:', error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
