import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

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
    
    const segments: TranscriptSegment[] = transcriptItems.map((item: unknown) => {
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
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const body = await req.json();
    const channelId = body.channelId || body.channel_id;
    
    if (!channelId) {
      return new Response(JSON.stringify({ error: 'channelId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    console.log(`Looking for videos with channel_id: ${channelId}`);
    
    // Get videos for the channel - try both UUID and YouTube channel_id
    let { data: videos, error: videosError } = await supabase
      .from('videos')
      .select('video_id, title, channel_id')
      .eq('channel_id', channelId);
    
    if (!videos || videos.length === 0) {
      // Try finding by the channels table UUID
      const { data: channelData } = await supabase
        .from('channels')
        .select('id, channel_id')
        .eq('channel_id', channelId)
        .single();
      
      if (channelData) {
        console.log(`Trying with channel UUID: ${channelData.id}`);
        const result = await supabase
          .from('videos')
          .select('video_id, title, channel_id')
          .eq('channel_id', channelData.channel_id);
        videos = result.data;
        videosError = result.error;
      }
    }
    
    console.log(`Found ${videos?.length || 0} videos for channel ${channelId}`);
    
    if (videosError || !videos || videos.length === 0) {
      return new Response(JSON.stringify({ success: false, error: 'No videos found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    console.log(`Processing ${videos.length} videos for transcripts`);
    
    const stats = { total: videos.length, completed: 0, no_captions: 0, failed: 0 };
    
    for (const video of videos) {
      // Check if already processed
      const { data: existing } = await supabase
        .from('transcripts')
        .select('extraction_status')
        .eq('video_id', video.video_id)
        .maybeSingle();
      
      if (existing?.extraction_status === 'completed') {
        stats.completed++;
        continue;
      }
      
      const result = await fetchTranscript(video.video_id);
      
      // Store result
      await supabase
        .from('transcripts')
        .upsert({
          video_id: video.video_id,
          channel_id: channelId,
          full_text: result.fullText || null,
          segments: result.segments,
          source_type: result.status === 'completed' ? 'caption' : 'none',
          extraction_status: result.status,
          error_message: result.errorMessage || null,
          confidence: result.status === 'completed' ? 0.95 : 0,
        }, { onConflict: 'video_id' });
      
      if (result.status === 'completed') stats.completed++;
      else if (result.status === 'no_captions') stats.no_captions++;
      else stats.failed++;
      
      // Small delay
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    const finalStatus = stats.completed > 0 ? 'extracting' : 'no_captions';
    
    // Update channel status
    await supabase.from('channels').update({
      ingestion_status: finalStatus,
      ingestion_progress: 100,
    }).eq('channel_id', channelId);
    
    return new Response(JSON.stringify({
      success: stats.completed > 0,
      status: finalStatus,
      stats,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
