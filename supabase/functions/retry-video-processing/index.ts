import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import { createErrorResponse, ErrorCodes } from "../_shared/abuse-protection.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const TRANSCRIPT_API_KEY = Deno.env.get('TRANSCRIPT_API_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface TranscriptSegment {
  text: string;
  start: number;
  end: number;
}

interface TranscriptAPIItem {
  text: string;
  start: number | string;
  duration: number | string;
}

async function fetchTranscript(videoId: string): Promise<{
  status: 'completed' | 'no_captions' | 'failed';
  segments: TranscriptSegment[];
  fullText: string;
  errorMessage?: string;
}> {
  try {
    const url = `https://transcriptapi.com/api/v2/youtube/transcript?video_url=${videoId}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${TRANSCRIPT_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (response.status === 404) {
      return {
        status: 'no_captions',
        segments: [],
        fullText: '',
        errorMessage: 'No captions available for this video',
      };
    }
    
    if (!response.ok) {
      const errorText = await response.text();
      return {
        status: 'failed',
        segments: [],
        fullText: '',
        errorMessage: `API error: ${response.status} - ${errorText.substring(0, 100)}`,
      };
    }
    
    const data = await response.json();
    const transcriptItems = data.transcript;
    
    if (!Array.isArray(transcriptItems) || transcriptItems.length === 0) {
      return {
        status: 'no_captions',
        segments: [],
        fullText: '',
        errorMessage: 'No captions available for this video',
      };
    }
    
    const segments: TranscriptSegment[] = transcriptItems.map((item: TranscriptAPIItem) => {
      const start = typeof item.start === 'number' ? item.start : parseFloat(item.start) || 0;
      const duration = typeof item.duration === 'number' ? item.duration : parseFloat(item.duration) || 2;
      return {
        text: (item.text || '').trim(),
        start: start,
        end: start + duration,
      };
    }).filter((seg: TranscriptSegment) => seg.text.length > 0);
    
    const fullText = segments.map(s => s.text).join(' ');
    
    return {
      status: 'completed',
      segments,
      fullText,
    };
    
  } catch (error) {
    return {
      status: 'failed',
      segments: [],
      fullText: '',
      errorMessage: String(error),
    };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Authenticate user
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return createErrorResponse('Missing Authorization header', ErrorCodes.UNAUTHORIZED, 401);
  }

  const token = authHeader.replace('Bearer ', '');
  const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
  
  if (authError || !user) {
    return createErrorResponse('Authentication failed', ErrorCodes.UNAUTHORIZED, 401);
  }

  console.log(`[retry-video-processing] User ${user.id} retrying video processing`);

  try {
    const { videoId } = await req.json();

    if (!videoId) {
      return new Response(
        JSON.stringify({ error: 'Missing videoId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get video info
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select('channel_id, transcript_status')
      .eq('video_id', videoId)
      .single();

    if (videoError || !video) {
      return new Response(
        JSON.stringify({ error: 'Video not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update video status to processing
    await supabase
      .from('videos')
      .update({
        transcript_status: 'processing',
        updated_at: new Date().toISOString()
      })
      .eq('video_id', videoId);

    // Reset transcript status to pending
    await supabase
      .from('transcripts')
      .upsert({
        video_id: videoId,
        channel_id: video.channel_id,
        extraction_status: 'pending',
        error_message: null,
        updated_at: new Date().toISOString()
      }, { onConflict: 'video_id' });

    // Process the transcript
    const result = await fetchTranscript(videoId);
    
    // Update transcript with result
    await supabase
      .from('transcripts')
      .update({
        full_text: result.fullText || null,
        segments: result.segments,
        source_type: result.status === 'completed' ? 'caption' : 'none',
        extraction_status: result.status,
        error_message: result.errorMessage || null,
        confidence: result.status === 'completed' ? 0.95 : 0,
        updated_at: new Date().toISOString()
      })
      .eq('video_id', videoId);

    // Update video status based on result
    const finalVideoStatus = result.status === 'completed' ? 'completed' : 
                            result.status === 'no_captions' ? 'no_transcript' : 'failed';
    
    await supabase
      .from('videos')
      .update({
        transcript_status: finalVideoStatus,
        updated_at: new Date().toISOString()
      })
      .eq('video_id', videoId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Video processing completed',
        videoId: videoId,
        status: finalVideoStatus,
        segmentCount: result.segments.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in retry-video-processing:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});