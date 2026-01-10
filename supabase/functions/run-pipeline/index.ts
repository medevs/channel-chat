import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

/**
 * LAYER 2: Chunking & Embeddings Pipeline
 * 
 * Purpose: Process transcripts that were successfully extracted in Layer 1.
 * Creates semantic chunks with timestamps and generates embeddings for RAG.
 * 
 * Prerequisites: Layer 1 (extract-transcripts) must have run first.
 * Only processes videos with extraction_status = 'completed'.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const TARGET_CHUNK_TOKENS = 400;
const OVERLAP_TOKENS = 75;

interface TranscriptSegment {
  text: string;
  start: number;
  end: number;
}

interface TranscriptChunk {
  text: string;
  startTime: number;
  endTime: number;
  tokenCount: number;
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Chunk transcript using segment-level timestamps
 */
function chunkTranscriptWithSegments(segments: TranscriptSegment[]): TranscriptChunk[] {
  const chunks: TranscriptChunk[] = [];
  
  if (!segments || segments.length === 0) {
    return chunks;
  }
  
  let currentChunkSegments: TranscriptSegment[] = [];
  let currentTokenCount = 0;
  
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const segmentTokens = estimateTokens(segment.text);
    
    if (currentTokenCount + segmentTokens > TARGET_CHUNK_TOKENS && currentChunkSegments.length > 0) {
      chunks.push(createChunkFromSegments(currentChunkSegments));
      
      // Overlap
      const overlapSegments: TranscriptSegment[] = [];
      let overlapTokens = 0;
      for (let j = currentChunkSegments.length - 1; j >= 0 && overlapTokens < OVERLAP_TOKENS; j--) {
        overlapTokens += estimateTokens(currentChunkSegments[j].text);
        overlapSegments.unshift(currentChunkSegments[j]);
      }
      
      currentChunkSegments = overlapSegments;
      currentTokenCount = overlapTokens;
    }
    
    currentChunkSegments.push(segment);
    currentTokenCount += segmentTokens;
  }
  
  if (currentChunkSegments.length > 0) {
    chunks.push(createChunkFromSegments(currentChunkSegments));
  }
  
  return chunks;
}

function createChunkFromSegments(segments: TranscriptSegment[]): TranscriptChunk {
  const text = segments.map(s => s.text).join(' ').trim();
  return {
    text,
    startTime: segments[0].start,
    endTime: segments[segments.length - 1].end,
    tokenCount: estimateTokens(text),
  };
}

async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  console.log(`[Embeddings] Generating for ${texts.length} chunks`);
  
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: texts,
    }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI error: ${error}`);
  }
  
  const data = await response.json();
  return data.data.map((item: { embedding: number[] }) => item.embedding);
}

async function updateProgress(channelId: string, progress: number, status?: string) {
  const update: Record<string, any> = { ingestion_progress: progress };
  if (status) update.ingestion_status = status;
  
  await supabase.from('channels').update(update).eq('channel_id', channelId);
  console.log(`[Progress] ${channelId}: ${progress}%${status ? ` (${status})` : ''}`);
}

/**
 * Process a single video: chunk and embed an already-extracted transcript
 */
async function processVideoChunking(
  videoId: string, 
  channelId: string,
  transcriptId: string,
  segments: TranscriptSegment[]
): Promise<{
  success: boolean;
  chunksCreated: number;
  error?: string;
}> {
  console.log(`\n========== Chunking: ${videoId} ==========`);
  
  try {
    // Check if already has valid chunks
    const { data: existingChunks } = await supabase
      .from('transcript_chunks')
      .select('id')
      .eq('video_id', videoId)
      .eq('embedding_status', 'completed')
      .limit(1);
    
    if (existingChunks && existingChunks.length > 0) {
      console.log(`[Skip] Already has chunks`);
      return { success: true, chunksCreated: 0 };
    }
    
    // Create chunks
    const chunks = chunkTranscriptWithSegments(segments);
    
    if (chunks.length === 0) {
      console.log(`[Skip] No chunks created from ${segments.length} segments`);
      return { success: true, chunksCreated: 0 };
    }
    
    console.log(`[Chunking] Created ${chunks.length} chunks`);
    
    // Generate embeddings in batches
    const BATCH_SIZE = 50;
    let allEmbeddings: number[][] = [];
    
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);
      const texts = batch.map(c => c.text);
      const embeddings = await generateEmbeddings(texts);
      allEmbeddings = [...allEmbeddings, ...embeddings];
    }
    
    // Delete old chunks for this video (if re-processing)
    await supabase.from('transcript_chunks').delete().eq('video_id', videoId);
    
    // Insert chunks with embeddings
    const chunkRecords = chunks.map((chunk, idx) => ({
      transcript_id: transcriptId,
      video_id: videoId,
      channel_id: channelId,
      chunk_index: idx,
      text: chunk.text,
      start_time: chunk.startTime,
      end_time: chunk.endTime,
      token_count: chunk.tokenCount,
      embedding: `[${allEmbeddings[idx].join(',')}]`,
      embedding_status: 'completed',
    }));
    
    const { error: chunksError } = await supabase
      .from('transcript_chunks')
      .insert(chunkRecords);
    
    if (chunksError) {
      console.error(`[Error] Chunk insert failed:`, chunksError);
      return { success: false, chunksCreated: 0, error: chunksError.message };
    }
    
    console.log(`[Success] Created ${chunks.length} chunks with embeddings`);
    return { success: true, chunksCreated: chunks.length };
    
  } catch (error) {
    console.error(`[Error] Chunking ${videoId}:`, error);
    return { success: false, chunksCreated: 0, error: String(error) };
  }
}

/**
 * Validate pipeline results
 */
async function validatePipelineResults(channelId: string): Promise<{
  isValid: boolean;
  transcriptCount: number;
  withCaptionsCount: number;
  chunkCount: number;
  embeddingCount: number;
  issues: string[];
}> {
  const issues: string[] = [];
  
  // Count transcripts with captions
  const { count: withCaptionsCount } = await supabase
    .from('transcripts')
    .select('*', { count: 'exact', head: true })
    .eq('channel_id', channelId)
    .eq('extraction_status', 'completed')
    .not('full_text', 'is', null);
  
  // Count chunks
  const { count: chunkCount } = await supabase
    .from('transcript_chunks')
    .select('*', { count: 'exact', head: true })
    .eq('channel_id', channelId);
  
  // Count chunks with embeddings
  const { count: embeddingCount } = await supabase
    .from('transcript_chunks')
    .select('*', { count: 'exact', head: true })
    .eq('channel_id', channelId)
    .eq('embedding_status', 'completed')
    .not('embedding', 'is', null);
  
  // Validate
  if ((withCaptionsCount || 0) === 0) {
    issues.push('No videos with captions found');
  }
  
  if ((chunkCount || 0) === 0 && (withCaptionsCount || 0) > 0) {
    issues.push('Transcripts found but no chunks created');
  }
  
  if ((embeddingCount || 0) < (chunkCount || 0)) {
    issues.push(`Some chunks missing embeddings (${embeddingCount}/${chunkCount})`);
  }
  
  return {
    isValid: (chunkCount || 0) > 0 && (embeddingCount || 0) > 0,
    transcriptCount: 0, // Not needed anymore
    withCaptionsCount: withCaptionsCount || 0,
    chunkCount: chunkCount || 0,
    embeddingCount: embeddingCount || 0,
    issues,
  };
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
    
    console.log(`\n==========================================`);
    console.log(`LAYER 2: Chunking & Embeddings`);
    console.log(`Channel: ${channelId}`);
    console.log(`==========================================\n`);
    
    // Get transcripts that are ready for chunking (completed extraction)
    const { data: transcripts, error: transcriptsError } = await supabase
      .from('transcripts')
      .select('id, video_id, segments')
      .eq('channel_id', channelId)
      .eq('extraction_status', 'completed')
      .not('segments', 'eq', '[]');
    
    if (transcriptsError) {
      throw new Error(`Failed to fetch transcripts: ${transcriptsError.message}`);
    }
    
    if (!transcripts || transcripts.length === 0) {
      console.log(`No transcripts ready for chunking`);
      
      // Check why - are there no transcripts at all, or just none completed?
      const { count: totalCount } = await supabase
        .from('transcripts')
        .select('*', { count: 'exact', head: true })
        .eq('channel_id', channelId);
      
      const { count: noCaptionsCount } = await supabase
        .from('transcripts')
        .select('*', { count: 'exact', head: true })
        .eq('channel_id', channelId)
        .eq('extraction_status', 'no_captions');
      
      let errorMessage = 'No transcripts ready for processing.';
      if (noCaptionsCount === totalCount) {
        errorMessage = 'No captions available for any video in this channel.';
      }
      
      await supabase.from('channels').update({
        ingestion_status: 'no_captions',
        ingestion_progress: 100,
        indexed_videos: 0,
        error_message: errorMessage,
      }).eq('channel_id', channelId);
      
      return new Response(JSON.stringify({
        success: false,
        status: 'no_captions',
        errorMessage,
        stats: { totalVideos: totalCount || 0, withCaptions: 0, chunks: 0 },
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    console.log(`Found ${transcripts.length} transcripts to chunk\n`);
    
    await updateProgress(channelId, 0, 'processing');
    
    // Process transcripts
    let successCount = 0;
    // let totalChunks = 0; // Unused variable
    const errors: string[] = [];
    
    for (let i = 0; i < transcripts.length; i++) {
      const transcript = transcripts[i];
      const progress = Math.round(((i + 1) / transcripts.length) * 100);
      
      console.log(`\n[${i + 1}/${transcripts.length}] Video: ${transcript.video_id}`);
      
      const result = await processVideoChunking(
        transcript.video_id,
        channelId,
        transcript.id,
        transcript.segments as TranscriptSegment[]
      );
      
      if (result.success) {
        successCount++;
        // totalChunks += result.chunksCreated; // Unused variable
      } else if (result.error) {
        errors.push(`${transcript.video_id}: ${result.error}`);
      }
      
      await updateProgress(channelId, progress);
      
      // Small delay between videos
      if (i < transcripts.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    // Validate results
    const validation = await validatePipelineResults(channelId);
    
    // Determine final status
    const hasContent = validation.chunkCount > 0 && validation.embeddingCount > 0;
    const finalStatus = hasContent ? 'completed' : 'failed';
    const errorMessage = hasContent ? null : validation.issues.join('; ');
    
    // Update channel status
    await supabase.from('channels').update({
      ingestion_status: finalStatus,
      ingestion_progress: 100,
      indexed_videos: validation.withCaptionsCount,
      error_message: errorMessage,
      last_indexed_at: new Date().toISOString(),
    }).eq('channel_id', channelId);
    
    console.log(`\n==========================================`);
    console.log(`Layer 2 Complete: ${finalStatus}`);
    console.log(`Transcripts: ${transcripts.length}, Chunks: ${validation.chunkCount}`);
    console.log(`==========================================\n`);
    
    return new Response(JSON.stringify({
      success: hasContent,
      status: finalStatus,
      stats: {
        transcriptsProcessed: successCount,
        withCaptions: validation.withCaptionsCount,
        chunks: validation.chunkCount,
        embeddings: validation.embeddingCount,
      },
      issues: validation.issues,
      errors: errors.slice(0, 5),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Pipeline error:', error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
