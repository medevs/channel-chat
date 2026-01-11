import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const TARGET_CHUNK_TOKENS = 400; // tokens (approx 300-500 as per best practice)
const OVERLAP_TOKENS = 75; // tokens overlap

interface TranscriptSegment {
  text: string;
  start: number;  // seconds
  end: number;    // seconds
}

interface TranscriptChunk {
  text: string;
  startTime: number | null;
  endTime: number | null;
  tokenCount: number;
  hasValidTimestamps: boolean;
}

// Simple tokenizer approximation (1 token ≈ 4 characters for English)
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// Chunk transcript using SEGMENT-LEVEL timestamps for precision
function chunkTranscriptWithSegments(segments: TranscriptSegment[]): TranscriptChunk[] {
  const chunks: TranscriptChunk[] = [];
  
  if (!segments || segments.length === 0) {
    console.log('No segments provided for chunking');
    return chunks;
  }
  
  // Check if we have valid timestamps (partial transcripts have start=0, end=0)
  const hasValidTimestamps = segments.some(seg => seg.end > seg.start);
  console.log(`Chunking ${segments.length} segments, hasValidTimestamps: ${hasValidTimestamps}`);
  
  if (!hasValidTimestamps) {
    // Fall back to simple text chunking without timestamps
    const fullText = segments.map(s => s.text).join(' ');
    return chunkTextWithoutTimestamps(fullText);
  }
  
  // Accumulate segments into chunks based on token count
  let currentChunkSegments: TranscriptSegment[] = [];
  let currentTokenCount = 0;
  
  const targetTokens = TARGET_CHUNK_TOKENS;
  
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const segmentTokens = estimateTokens(segment.text);
    
    // If adding this segment would exceed target, finalize current chunk
    if (currentTokenCount + segmentTokens > targetTokens && currentChunkSegments.length > 0) {
      chunks.push(createChunkFromSegments(currentChunkSegments, true));
      
      // Overlap: keep last few segments for context
      const overlapTokens = OVERLAP_TOKENS;
      let overlapCount = 0;
      const overlapSegments: TranscriptSegment[] = [];
      
      for (let j = currentChunkSegments.length - 1; j >= 0 && overlapCount < overlapTokens; j--) {
        const seg = currentChunkSegments[j];
        overlapCount += estimateTokens(seg.text);
        overlapSegments.unshift(seg);
      }
      
      currentChunkSegments = overlapSegments;
      currentTokenCount = overlapCount;
    }
    
    currentChunkSegments.push(segment);
    currentTokenCount += segmentTokens;
  }
  
  // Don't forget the last chunk
  if (currentChunkSegments.length > 0) {
    chunks.push(createChunkFromSegments(currentChunkSegments, true));
  }
  
  console.log(`Created ${chunks.length} chunks with timestamps`);
  if (chunks.length > 0) {
    console.log(`First chunk: ${chunks[0].startTime}s - ${chunks[0].endTime}s (${chunks[0].tokenCount} tokens)`);
    console.log(`Last chunk: ${chunks[chunks.length-1].startTime}s - ${chunks[chunks.length-1].endTime}s`);
  }
  
  return chunks;
}

function createChunkFromSegments(segments: TranscriptSegment[], hasTimestamps: boolean): TranscriptChunk {
  const text = segments.map(s => s.text).join(' ').trim();
  
  // Get timestamps from first and last segment
  const startTime = segments[0]?.start ?? null;
  const endTime = segments[segments.length - 1]?.end ?? null;
  
  return {
    text,
    startTime: hasTimestamps ? startTime : null,
    endTime: hasTimestamps ? endTime : null,
    tokenCount: estimateTokens(text),
    hasValidTimestamps: hasTimestamps && startTime !== null && endTime !== null && endTime > startTime,
  };
}

// Fallback for transcripts without timestamp data
function chunkTextWithoutTimestamps(text: string): TranscriptChunk[] {
  console.log('Chunking text WITHOUT timestamps (partial transcript)');
  
  const chunks: TranscriptChunk[] = [];
  const words = text.split(/\s+/);
  const totalWords = words.length;
  
  if (totalWords === 0) return chunks;
  
  const wordsPerChunk = Math.ceil(TARGET_CHUNK_TOKENS * 4 / 5); // Approximate words per chunk
  const overlapWords = Math.ceil(OVERLAP_TOKENS * 4 / 5);
  
  let currentStart = 0;
  
  while (currentStart < totalWords) {
    const chunkWords = words.slice(currentStart, currentStart + wordsPerChunk);
    const chunkText = chunkWords.join(' ');
    
    chunks.push({
      text: chunkText,
      startTime: null,  // NO timestamps for partial transcripts
      endTime: null,
      tokenCount: estimateTokens(chunkText),
      hasValidTimestamps: false,
    });
    
    currentStart += wordsPerChunk - overlapWords;
    if (currentStart <= 0) currentStart = wordsPerChunk;
  }
  
  console.log(`Created ${chunks.length} chunks WITHOUT timestamps`);
  return chunks;
}

// Generate embeddings using OpenAI
async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  console.log(`Generating embeddings for ${texts.length} chunks`);
  
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
    console.error(`OpenAI embeddings error: ${error}`);
    throw new Error(`OpenAI API error: ${error}`);
  }
  
  const data = await response.json();
  return data.data.map((item: { embedding: number[] }) => item.embedding);
}

// Process transcript chunks and generate embeddings
async function processTranscript(transcriptId: string): Promise<{
  success: boolean;
  chunksCreated: number;
  chunksWithTimestamps: number;
  error?: string;
}> {
  console.log(`Processing transcript: ${transcriptId}`);
  
  // Get transcript WITH SEGMENTS
  const { data: transcript, error: fetchError } = await supabase
    .from('transcripts')
    .select('*')
    .eq('id', transcriptId)
    .single();
  
  if (fetchError || !transcript) {
    return { success: false, chunksCreated: 0, chunksWithTimestamps: 0, error: 'Transcript not found' };
  }
  
  // Parse segments from JSONB column
  let segments: TranscriptSegment[] = [];
  
  if (transcript.segments && Array.isArray(transcript.segments)) {
    segments = transcript.segments as TranscriptSegment[];
    console.log(`Loaded ${segments.length} segments from transcript`);
  } else if (transcript.full_text && transcript.full_text.trim().length > 0) {
    // Fallback if no segments stored - create single segment without timestamps
    console.log('No segments found, falling back to full_text chunking');
    segments = [{
      text: transcript.full_text,
      start: 0,
      end: 0, // Invalid - signals no timestamp
    }];
  } else {
    return { success: false, chunksCreated: 0, chunksWithTimestamps: 0, error: 'Transcript has no text or segments' };
  }
  
  // Delete existing chunks for this transcript
  await supabase
    .from('transcript_chunks')
    .delete()
    .eq('transcript_id', transcriptId);
  
  // Create chunks using segment-level timestamps
  const chunks = chunkTranscriptWithSegments(segments);
  console.log(`Created ${chunks.length} chunks for transcript ${transcriptId}`);
  
  if (chunks.length === 0) {
    return { success: false, chunksCreated: 0, chunksWithTimestamps: 0, error: 'No chunks created' };
  }
  
  // Generate embeddings in batches (OpenAI limit is 2048 per request)
  const batchSize = 100;
  const allChunksWithEmbeddings: Array<{
    chunk: TranscriptChunk;
    embedding: number[];
    index: number;
  }> = [];
  
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    const texts = batch.map(c => c.text);
    
    try {
      const embeddings = await generateEmbeddings(texts);
      
      for (let j = 0; j < batch.length; j++) {
        allChunksWithEmbeddings.push({
          chunk: batch[j],
          embedding: embeddings[j],
          index: i + j,
        });
      }
    } catch (error) {
      console.error(`Error generating embeddings for batch starting at ${i}: ${error}`);
      // Continue with other batches
    }
  }
  
  // Insert chunks with embeddings - PRESERVE TIMESTAMPS
  const chunksToInsert = allChunksWithEmbeddings.map(({ chunk, embedding, index }) => ({
    transcript_id: transcriptId,
    video_id: transcript.video_id,
    channel_id: transcript.channel_id,
    chunk_index: index,
    text: chunk.text,
    start_time: chunk.hasValidTimestamps ? chunk.startTime : null,
    end_time: chunk.hasValidTimestamps ? chunk.endTime : null,
    token_count: chunk.tokenCount,
    embedding: JSON.stringify(embedding),
    embedding_status: 'completed',
  }));
  
  if (chunksToInsert.length > 0) {
    const { error: insertError } = await supabase
      .from('transcript_chunks')
      .insert(chunksToInsert);
    
    if (insertError) {
      console.error(`Error inserting chunks: ${insertError.message}`);
      return { success: false, chunksCreated: 0, chunksWithTimestamps: 0, error: insertError.message };
    }
  }
  
  const chunksWithTimestamps = allChunksWithEmbeddings.filter(c => c.chunk.hasValidTimestamps).length;
  
  console.log(`Successfully created ${chunksToInsert.length} chunks (${chunksWithTimestamps} with timestamps)`);
  
  return { success: true, chunksCreated: chunksToInsert.length, chunksWithTimestamps };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const { channel_id, transcript_ids, process_all } = await req.json();
    
    console.log(`Generate embeddings request - channel: ${channel_id}, transcripts: ${transcript_ids?.length || 'all'}`);
    
    let transcriptsToProcess: string[] = [];
    
    if (transcript_ids && transcript_ids.length > 0) {
      transcriptsToProcess = transcript_ids;
    } else if (process_all && channel_id) {
      // Get all completed transcripts without embeddings
      const { data: transcripts } = await supabase
        .from('transcripts')
        .select('id')
        .eq('channel_id', channel_id)
        .eq('extraction_status', 'completed');
      
      if (transcripts) {
        // Check which ones don't have chunks yet
        const { data: existingChunks } = await supabase
          .from('transcript_chunks')
          .select('transcript_id')
          .eq('channel_id', channel_id)
          .eq('embedding_status', 'completed');
        
        const existingIds = new Set(existingChunks?.map(c => c.transcript_id) || []);
        transcriptsToProcess = transcripts
          .filter(t => !existingIds.has(t.id))
          .map(t => t.id);
      }
    } else {
      return new Response(JSON.stringify({ error: 'Missing channel_id or transcript_ids' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    console.log(`Processing ${transcriptsToProcess.length} transcripts`);
    
    const results = {
      processed: 0,
      chunksCreated: 0,
      chunksWithTimestamps: 0,
      failed: 0,
      errors: [] as string[],
    };
    
    // Process transcripts one at a time to avoid rate limits
    for (const transcriptId of transcriptsToProcess) {
      try {
        const result = await processTranscript(transcriptId);
        if (result.success) {
          results.processed++;
          results.chunksCreated += result.chunksCreated;
          results.chunksWithTimestamps += result.chunksWithTimestamps;
        } else {
          results.failed++;
          if (result.error) results.errors.push(result.error);
        }
      } catch (error) {
        console.error(`Error processing transcript ${transcriptId}: ${error}`);
        results.failed++;
        results.errors.push(String(error));
      }
      
      // Small delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`Embedding generation complete: ${JSON.stringify(results)}`);
    
    return new Response(JSON.stringify({
      success: true,
      results,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Generate embeddings error:', error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
