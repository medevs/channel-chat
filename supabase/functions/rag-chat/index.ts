import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import {
  createLogger,
  checkRateLimit,
  logError,
  createErrorResponse,
  ErrorCodes,
  RATE_LIMITS,
  corsHeaders,
} from "../_shared/abuse-protection.ts";
import { requireAuth } from "../_shared/auth-middleware.ts";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface TranscriptChunk {
  id: string;
  video_id: string;
  channel_id: string;
  chunk_index: number;
  text: string;
  start_time: number | null;
  end_time: number | null;
  similarity: number;
}

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

type QuestionType = 'general' | 'conceptual' | 'moment' | 'clarification' | 'followUp';

const MAX_CITATIONS = 4;

function classifyQuestion(query: string, hasHistory: boolean): QuestionType {
  const lowerQuery = query.toLowerCase();
  
  if (hasHistory && query.split(' ').length <= 5) {
    return 'followUp';
  }
  
  const clarificationPatterns = [
    /what\s+(do\s+you\s+mean|did\s+you\s+mean)/i,
    /can\s+you\s+(clarify|explain\s+more)/i,
    /i\s+don'?t\s+understand/i,
  ];
  if (clarificationPatterns.some(p => p.test(query))) {
    return 'clarification';
  }
  
  const momentPatterns = [
    /where\s+(do|does|did)\s+(you|he|she|they)/i,
    /which\s+video/i,
    /when\s+(do|does|did)\s+(you|he|she|they)/i,
    /what\s+video/i,
    /timestamp/i,
    /show\s+me/i,
    /find\s+where/i,
  ];
  if (momentPatterns.some(p => p.test(query))) {
    return 'moment';
  }
  
  const generalPatterns = [
    /what\s+(topics?|does|do)\s+(he|she|they|you)\s+(talk|cover|discuss)/i,
    /what\s+(is|are)\s+your\s+(main|key)/i,
    /tell\s+me\s+about/i,
    /overview/i,
    /generally/i,
    /usually/i,
    /summarize/i,
    /what\s+kind\s+of/i,
  ];
  if (generalPatterns.some(p => p.test(query))) {
    return 'general';
  }
  
  const conceptualPatterns = [
    /how\s+(do|does|can|should)/i,
    /what\s+is\s+(the|a|your)/i,
    /explain/i,
    /why\s+(do|does|is|are)/i,
    /difference\s+between/i,
    /tips?\s+(for|on|about)/i,
    /advice\s+(for|on|about)/i,
    /best\s+way/i,
    /recommend/i,
  ];
  if (conceptualPatterns.some(p => p.test(query))) {
    return 'conceptual';
  }
  
  return query.split(' ').length > 8 ? 'conceptual' : 'general';
}

function shouldShowCitations(questionType: QuestionType, query: string): boolean {
  if (questionType === 'moment') return true;
  
  const locationKeywords = [
    'where', 'which video', 'when did', 'what video', 'timestamp',
    'show me', 'find where', 'link', 'source', 'quote', 'clip'
  ];
  const lowerQuery = query.toLowerCase();
  
  for (const keyword of locationKeywords) {
    if (lowerQuery.includes(keyword)) return true;
  }
  
  return false;
}

async function checkChannelIndexStatus(channelId: string | null) {
  if (!channelId) {
    const { count: totalChunks } = await supabase
      .from('transcript_chunks')
      .select('*', { count: 'exact', head: true });
    
    const { count: embeddingsComplete } = await supabase
      .from('transcript_chunks')
      .select('*', { count: 'exact', head: true })
      .not('embedding', 'is', null);
    
    return {
      hasChunks: (totalChunks || 0) > 0,
      hasEmbeddings: (embeddingsComplete || 0) > 0,
      totalChunks: totalChunks || 0,
      chunksWithTimestamps: 0,
    };
  }
  
  const { count: totalChunks } = await supabase
    .from('transcript_chunks')
    .select('*', { count: 'exact', head: true })
    .eq('channel_id', channelId);
  
  const { count: embeddingsComplete } = await supabase
    .from('transcript_chunks')
    .select('*', { count: 'exact', head: true })
    .eq('channel_id', channelId)
    .not('embedding', 'is', null);
  
  const { count: chunksWithTimestamps } = await supabase
    .from('transcript_chunks')
    .select('*', { count: 'exact', head: true })
    .eq('channel_id', channelId)
    .not('start_time', 'is', null)
    .not('end_time', 'is', null);
  
  return {
    hasChunks: (totalChunks || 0) > 0,
    hasEmbeddings: (embeddingsComplete || 0) > 0,
    totalChunks: totalChunks || 0,
    chunksWithTimestamps: chunksWithTimestamps || 0,
  };
}

async function generateQueryEmbedding(query: string): Promise<number[]> {
  console.log(`Generating embedding for query: "${query.substring(0, 50)}..."`);
  
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: query,
    }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI embeddings error: ${error}`);
  }
  
  const data = await response.json();
  return data.data[0].embedding;
}

async function searchChunks(
  embedding: number[],
  channelId: string | null,
  matchCount: number,
  matchThreshold: number
): Promise<TranscriptChunk[]> {
  console.log(`Searching chunks: channel=${channelId || 'all'}, count=${matchCount}, threshold=${matchThreshold}`);
  
  const vectorLiteral = `[${embedding.join(',')}]`;
  
  const { data, error } = await supabase.rpc('search_transcript_chunks', {
    query_embedding: vectorLiteral,
    match_threshold: matchThreshold,
    match_count: matchCount,
    filter_channel_id: channelId,
  });
  
  if (error) {
    console.error(`Search RPC error: ${error.message}`);
    throw new Error(`Search failed: ${error.message}`);
  }
  
  const results = (data || []) as TranscriptChunk[];
  console.log(`Found ${results.length} matching chunks`);
  
  if (results.length > 0) {
    console.log(`Top result: similarity=${results[0].similarity.toFixed(3)}, video=${results[0].video_id}`);
  }
  
  return results;
}

async function getVideoDetails(videoIds: string[]): Promise<Map<string, { title: string; thumbnail_url: string | null }>> {
  if (videoIds.length === 0) return new Map();
  
  const { data: videos } = await supabase
    .from('videos')
    .select('video_id, title, thumbnail_url')
    .in('video_id', videoIds);
  
  const videoMap = new Map();
  videos?.forEach(v => videoMap.set(v.video_id, { title: v.title, thumbnail_url: v.thumbnail_url }));
  return videoMap;
}

function formatTimestamp(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || isNaN(seconds) || seconds < 0) return '';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function hasValidTimestamps(chunk: TranscriptChunk): boolean {
  return (
    chunk.start_time !== null && 
    chunk.end_time !== null && 
    !isNaN(chunk.start_time) &&
    !isNaN(chunk.end_time) &&
    chunk.end_time > chunk.start_time &&
    chunk.start_time >= 0
  );
}

async function generateWithOpenAI(messages: any[]): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages,
      max_tokens: 600,
      temperature: 0.2,
    }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI chat error: ${error}`);
  }
  
  const data = await response.json();
  return data.choices[0].message.content;
}

serve(async (req) => {
  const requestId = crypto.randomUUID();
  const logger = createLogger('rag-chat', requestId);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  // Extract user from JWT (already verified by platform via verify_jwt = true)
  const authHeader = req.headers.get('Authorization')!;
  const token = authHeader.replace('Bearer ', '');
  const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
  
  if (authError || !user) {
    return createErrorResponse('Authentication failed', ErrorCodes.UNAUTHORIZED, 401);
  }
  
  // Check rate limit
  const rateLimitKey = `chat:${user.id}`;
  const rateLimit = checkRateLimit(
    rateLimitKey,
    RATE_LIMITS.chat.authenticated.requests,
    RATE_LIMITS.chat.authenticated.windowMinutes
  );
  
  if (!rateLimit.allowed) {
    logger.warn('Rate limit exceeded', { userId: user.sub });
    return createErrorResponse(
      'Rate limit exceeded. Please try again later.',
      ErrorCodes.RATE_LIMITED,
      429,
      { 
        resetAt: rateLimit.resetAt.toISOString(),
        remaining: rateLimit.remaining 
      },
      true,
      rateLimit.resetAt.getTime() - Date.now()
    );
  }
  
  logger.info('Request authenticated', { userId: user.sub });
  
  try {
    const { 
      query, 
      channel_id, 
      creator_name = 'the creator',
      conversation_history = [],
      user_id = null,
      public_mode = false,
      client_identifier = null,
    } = await req.json();
    
    logger.info('Chat request received', { 
      queryLength: query?.length, 
      channelId: channel_id, 
      publicMode: public_mode,
      userId: user_id ? 'present' : 'none',
    });
    
    if (!query || query.trim().length === 0) {
      logger.warn('Empty query received');
      return new Response(JSON.stringify({ error: 'Query is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    console.log(`\n========== RAG Chat Query ==========`);
    console.log(`Query: "${query}"`);
    console.log(`Channel: ${channel_id || 'all'}`);
    console.log(`User: ${user_id || 'anonymous'}`);
    console.log(`History messages: ${conversation_history.length}`);
    
    // Check index status
    const indexStatus = await checkChannelIndexStatus(channel_id);
    
    if (!indexStatus.hasChunks || !indexStatus.hasEmbeddings) {
      return new Response(JSON.stringify({
        answer: "I haven't been fully indexed yet. Please wait for the indexing process to complete.",
        citations: [],
        confidence: 'not_covered',
        evidence: { chunksUsed: 0, videosReferenced: 0 },
        isRefusal: true,
        debug: { indexStatus, reason: 'not_indexed' },
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Classify question type
    const hasHistory = conversation_history.length > 0;
    const questionType = classifyQuestion(query, hasHistory);
    console.log(`Question type: ${questionType}`);
    
    // Generate query embedding
    const queryEmbedding = await generateQueryEmbedding(query);
    
    // Search with appropriate thresholds
    let searchResults = await searchChunks(queryEmbedding, channel_id, 8, 0.3);
    
    if (searchResults.length === 0) {
      searchResults = await searchChunks(queryEmbedding, channel_id, 8, 0.2);
    }
    
    // Check context quality
    const hasContext = searchResults.length > 0;
    const maxSimilarity = hasContext ? Math.max(...searchResults.map(r => r.similarity)) : 0;
    const meetsMinimumRelevance = maxSimilarity >= 0.2;
    const hasConfidentMatch = maxSimilarity >= 0.35;
    
    const confidenceLevel: 'high' | 'medium' | 'low' | 'not_covered' = 
      hasConfidentMatch ? 'high' : meetsMinimumRelevance ? 'medium' : 'low';
    
    console.log(`Context check: hasContext=${hasContext}, maxSimilarity=${maxSimilarity.toFixed(3)}, confidence=${confidenceLevel}`);
    
    // Refuse if context is insufficient
    if (!hasContext || !meetsMinimumRelevance) {
      const refusalMessage = "I haven't covered that topic in my indexed videos.";
      const refusalVideoCount = new Set(searchResults.map(r => r.video_id)).size;
      
      return new Response(JSON.stringify({
        answer: refusalMessage,
        citations: [],
        confidence: 'not_covered',
        evidence: {
          chunksUsed: searchResults.length,
          videosReferenced: refusalVideoCount,
        },
        isRefusal: true,
        debug: { 
          indexStatus, 
          reason: 'no_relevant_context',
          questionType,
          maxSimilarity,
          confidenceLevel,
        },
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Get video details for citations
    const videoIds = [...new Set(searchResults.map(r => r.video_id))];
    const videoDetails = await getVideoDetails(videoIds);
    
    // Build context for AI
    const contextChunks = searchResults.slice(0, 6).map((chunk, i) => 
      `[${i + 1}] ${chunk.text}`
    ).join('\n\n');
    
    // Build conversation history
    const historyMessages = conversation_history.slice(-4).map(msg => ({
      role: msg.role,
      content: msg.content
    }));
    
    // Generate response
    const systemPrompt = `You are ${creator_name}, answering questions based strictly on your video content. 

CONTEXT FROM YOUR VIDEOS:
${contextChunks}

RULES:
- Answer based ONLY on the provided context
- Be conversational and helpful
- If the context doesn't fully answer the question, acknowledge limitations
- Keep responses concise but informative
- Don't make up information not in the context`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...historyMessages,
      { role: 'user', content: query }
    ];
    
    const answer = await generateWithOpenAI(messages);
    
    // Generate citations
    const showCitations = shouldShowCitations(questionType, query);
    const citationMap = new Map();
    
    for (const chunk of searchResults.slice(0, MAX_CITATIONS)) {
      const video = videoDetails.get(chunk.video_id);
      const hasTs = hasValidTimestamps(chunk);
      const key = `${chunk.video_id}-${hasTs ? Math.floor(chunk.start_time || 0) : 'no-ts'}`;
      
      if (!citationMap.has(key)) {
        citationMap.set(key, {
          index: citationMap.size + 1,
          videoId: chunk.video_id,
          videoTitle: video?.title || 'Unknown Video',
          thumbnailUrl: video?.thumbnail_url,
          startTime: hasTs ? chunk.start_time : null,
          endTime: hasTs ? chunk.end_time : null,
          timestamp: hasTs ? formatTimestamp(chunk.start_time) : null,
          hasTimestamp: hasTs,
          text: chunk.text.substring(0, 200) + (chunk.text.length > 200 ? '...' : ''),
          similarity: chunk.similarity,
        });
      }
    }
    
    const citations = showCitations ? Array.from(citationMap.values()) : [];
    
    console.log(`Response generated with ${citations.length} citations`);
    console.log(`========================================\n`);
    
    return new Response(JSON.stringify({
      answer,
      citations,
      showCitations,
      confidence: confidenceLevel,
      evidence: {
        chunksUsed: searchResults.length,
        videosReferenced: videoIds.length,
      },
      isRefusal: false,
      debug: {
        chunksFound: searchResults.length,
        videosReferenced: videoIds.length,
        questionType,
        confidenceLevel,
        maxSimilarity,
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    logger.error('RAG chat error', { error: String(error) });
    
    try {
      await logError(supabase, 'rag-chat', error as Error);
    } catch {
      // Ignore logging errors
    }
    
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
