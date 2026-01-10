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

// Plan limits configuration
const PLAN_LIMITS = {
  free: {
    maxCreators: 1,
    maxVideosPerCreator: 5,
    maxDailyMessages: 18,
  },
  pro: {
    maxCreators: 25,
    maxVideosPerCreator: 100,
    maxDailyMessages: 500,
  },
};

// Public mode limits (stricter for unauthenticated users)
const PUBLIC_LIMITS = {
  maxDailyMessages: 5,
  maxChunks: 6,
  minSimilarityThreshold: {
    general: 0.22,
    followUp: 0.25,
    conceptual: 0.35,
    clarification: 0.35,
    moment: 0.40,
  },
  maxAnswerLength: 400,
};

const DEFAULT_PLAN = 'free';

// RAG configuration - tuned for grounded answers
const RAG_CONFIG = {
  retrieval: {
    general: {
      matchCount: 10,
      minThreshold: 0.25,
      preferredThreshold: 0.35,
      requiresTimestamp: false,
    },
    conceptual: {
      matchCount: 8,
      minThreshold: 0.30,
      preferredThreshold: 0.40,
      requiresTimestamp: false,
    },
    moment: {
      matchCount: 5,
      minThreshold: 0.35,
      preferredThreshold: 0.45,
      requiresTimestamp: true,
    },
    followUp: {
      matchCount: 8,
      minThreshold: 0.28,
      preferredThreshold: 0.38,
      requiresTimestamp: false,
    },
    clarification: {
      matchCount: 6,
      minThreshold: 0.32,
      preferredThreshold: 0.42,
      requiresTimestamp: false,
    },
  },
  minSimilarityForConfidentAnswer: 0.40,
  minSimilarityForAnyAnswer: 0.25,
  maxHistoryMessages: 6,
  showDebugInResponse: false,
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Types
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

interface LLMMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

type QuestionType = 'general' | 'conceptual' | 'moment' | 'clarification' | 'followUp';

const MAX_CITATIONS = 4;

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

// Question type classification
function classifyQuestion(query: string, _hasHistory: boolean): QuestionType {
  const queryLower = query.toLowerCase().trim();
  
  // Moment-based: asking for specific location/timestamp
  const momentPatterns = [
    /where\s+(did|does|do)\s+(he|she|they|you|i)\s+(say|mention|talk|discuss)/i,
    /when\s+(did|does|do)\s+(he|she|they|you|i)\s+(say|mention|talk|discuss)/i,
    /at\s+what\s+(time|point|moment)/i,
    /in\s+which\s+video/i,
    /which\s+video\s+(does|did)/i,
    /what\s+time\s+does/i,
    /timestamp/i,
    /find\s+(the\s+)?(moment|part|section)/i,
    /show\s+me\s+where/i,
    /can\s+you\s+(find|show|point)/i,
  ];
  if (momentPatterns.some(p => p.test(query))) {
    return 'moment';
  }
  
  // Clarification: asking what something means
  const clarificationPatterns = [
    /what\s+(did|does|do)\s+(he|she|they|you|i)\s+mean\s+by/i,
    /what\s+do\s+you\s+mean/i,
    /can\s+you\s+explain/i,
    /what\s+is\s+that/i,
    /clarify/i,
  ];
  if (clarificationPatterns.some(p => p.test(query))) {
    return hasHistory ? 'clarification' : 'conceptual';
  }
  
  // Follow-up detection
  const followUpPatterns = [
    /^(and|but|so|also|what about|how about)/i,
    /^(why|how|what)\s*\?*$/i,
    /more\s+(about|on)\s+(that|this)/i,
    /tell\s+me\s+more/i,
    /elaborate/i,
    /^(really|seriously|interesting)/i,
    /^(yes|no|okay|ok)\s*[,.]?\s*(and|but|so)?/i,
    /you (said|mentioned|talked)/i,
    /earlier you/i,
    /go(ing)?\s+back\s+to/i,
  ];
  if (hasHistory && (followUpPatterns.some(p => p.test(query)) || query.split(' ').length <= 5)) {
    return 'followUp';
  }
  
  // General/topic overview questions
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
  
  // Conceptual: asking about ideas, how-to, explanations
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

// Utility functions
async function getUserUsage(userId: string): Promise<{
  plan_type: string;
  messages_sent_today: number;
  creators_added: number;
  videos_indexed: number;
}> {
  const { data, error } = await supabase.rpc('get_usage_with_limits', {
    p_user_id: userId,
  });

  if (error) {
    console.error('Error getting user usage:', error);
    return {
      plan_type: DEFAULT_PLAN,
      messages_sent_today: 0,
      creators_added: 0,
      videos_indexed: 0,
    };
  }

  if (!data || data.length === 0) {
    return {
      plan_type: DEFAULT_PLAN,
      messages_sent_today: 0,
      creators_added: 0,
      videos_indexed: 0,
    };
  }

  return {
    plan_type: data[0].plan_type || DEFAULT_PLAN,
    messages_sent_today: data[0].messages_sent_today || 0,
    creators_added: data[0].creators_added || 0,
    videos_indexed: data[0].videos_indexed || 0,
  };
}

async function checkMessageLimit(userId: string): Promise<{ 
  allowed: boolean; 
  current: number; 
  limit: number;
  planType: string;
}> {
  const usage = await getUserUsage(userId);
  const limits = PLAN_LIMITS[usage.plan_type as keyof typeof PLAN_LIMITS] || PLAN_LIMITS.free;
  
  return {
    allowed: usage.messages_sent_today < limits.maxDailyMessages,
    current: usage.messages_sent_today,
    limit: limits.maxDailyMessages,
    planType: usage.plan_type,
  };
}

async function incrementMessageCount(userId: string): Promise<void> {
  const { error } = await supabase.rpc('increment_message_count', {
    p_user_id: userId,
  });

  if (error) {
    console.error('Error incrementing message count:', error);
  }
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
  
  return results;
}

async function generateWithOpenAI(messages: LLMMessage[]): Promise<string> {
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

// Main handler
serve(async (req) => {
  const requestId = crypto.randomUUID();
  const logger = createLogger('rag-chat', requestId);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
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
    
    // Rate limiting
    const rateLimitKey = public_mode 
      ? `chat:public:${client_identifier || 'unknown'}`
      : `chat:auth:${user_id || 'anon'}`;
    
    const rateConfig = public_mode 
      ? RATE_LIMITS.chat.public 
      : RATE_LIMITS.chat.authenticated;
    
    const rateCheck = checkRateLimit(rateLimitKey, rateConfig.requests, rateConfig.windowMinutes);
    
    if (!rateCheck.allowed) {
      logger.warn('Rate limit exceeded', { key: rateLimitKey, remaining: rateCheck.remaining });
      return createErrorResponse(
        'Too many requests. Please slow down.',
        ErrorCodes.RATE_LIMITED,
        429,
        { remaining: 0, resetAt: rateCheck.resetAt.toISOString() },
        true,
        rateCheck.resetAt.getTime() - Date.now()
      );
    }
    
    // Public mode rate limiting
    if (public_mode) {
      if (!client_identifier) {
        return new Response(JSON.stringify({ error: 'Client identifier required for public mode' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      if (!channel_id) {
        return new Response(JSON.stringify({ error: 'Channel ID required for public mode' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }
    
    // Authenticated user limit check
    if (!public_mode && user_id) {
      const messageCheck = await checkMessageLimit(user_id);
      
      if (!messageCheck.allowed) {
        console.log(`Message limit reached for user ${user_id}: ${messageCheck.current}/${messageCheck.limit}`);
        return new Response(JSON.stringify({
          error: 'Daily message limit reached',
          limit_exceeded: true,
          limit_type: 'messages',
          current: messageCheck.current,
          limit: messageCheck.limit,
          planType: messageCheck.planType,
          message: `You've reached your daily limit of ${messageCheck.limit} messages. Try again tomorrow or upgrade for more.`,
        }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }
    
    console.log(`\n========== RAG Chat Query ==========`);
    console.log(`Query: "${query}"`);
    console.log(`Channel: ${channel_id || 'all'}`);
    console.log(`User: ${user_id || 'anonymous'}`);
    console.log(`History messages: ${conversation_history.length}`);
    
    // Classify question type
    const hasHistory = conversation_history.length > 0;
    const questionType = classifyQuestion(query, hasHistory);
    console.log(`Question type: ${questionType}`);
    
    // Get retrieval config
    const baseConfig = RAG_CONFIG.retrieval[questionType] || RAG_CONFIG.retrieval.general;
    const publicThreshold = PUBLIC_LIMITS.minSimilarityThreshold[questionType] || PUBLIC_LIMITS.minSimilarityThreshold.general;
    
    const retrievalConfig = public_mode ? {
      ...baseConfig,
      matchCount: Math.min(baseConfig.matchCount, PUBLIC_LIMITS.maxChunks),
      minThreshold: Math.max(baseConfig.minThreshold, publicThreshold),
      preferredThreshold: Math.max(baseConfig.preferredThreshold, publicThreshold),
    } : baseConfig;
    
    console.log(`Retrieval config: matchCount=${retrievalConfig.matchCount}, minThreshold=${retrievalConfig.minThreshold}, preferredThreshold=${retrievalConfig.preferredThreshold}`);
    
    // Generate query embedding
    const queryEmbedding = await generateQueryEmbedding(query);
    
    // Search with preferred threshold first
    let searchResults = await searchChunks(
      queryEmbedding,
      channel_id,
      retrievalConfig.matchCount,
      retrievalConfig.preferredThreshold
    );
    
    // If no results, try with minimum threshold (except for moment-based)
    if (searchResults.length === 0 && questionType !== 'moment') {
      console.log(`No results at ${retrievalConfig.preferredThreshold}, trying ${retrievalConfig.minThreshold}`);
      searchResults = await searchChunks(
        queryEmbedding,
        channel_id,
        retrievalConfig.matchCount,
        retrievalConfig.minThreshold
      );
    }
    
    // Check context quality
    const hasContext = searchResults.length > 0;
    const maxSimilarity = hasContext ? Math.max(...searchResults.map(r => r.similarity)) : 0;
    const meetsMinimumRelevance = maxSimilarity >= RAG_CONFIG.minSimilarityForAnyAnswer;
    const hasConfidentMatch = maxSimilarity >= RAG_CONFIG.minSimilarityForConfidentAnswer;
    
    const confidenceLevel: 'high' | 'medium' | 'low' = hasConfidentMatch ? 'high' : meetsMinimumRelevance ? 'medium' : 'low';
    
    console.log(`Context check: hasContext=${hasContext}, maxSimilarity=${maxSimilarity.toFixed(3)}, confidence=${confidenceLevel}`);
    
    // For moment-based questions, require valid timestamps
    const hasTimestampsForMoment = retrievalConfig.requiresTimestamp 
      ? searchResults.some(c => hasValidTimestamps(c))
      : true;
    
    // Refuse if context is insufficient
    if (!hasContext || !meetsMinimumRelevance || (questionType === 'moment' && (!hasConfidentMatch || !hasTimestampsForMoment))) {
      let refusalMessage: string;
      if (questionType === 'moment' && !hasTimestampsForMoment && hasContext) {
        refusalMessage = "I can't pinpoint the exact moment - timestamp data isn't available for this content.";
      } else if (questionType === 'moment') {
        refusalMessage = "I couldn't find a specific moment where I discussed that in my indexed videos.";
      } else {
        refusalMessage = "I haven't covered that topic in my indexed videos.";
      }
      
      const refusalVideoCount = new Set(searchResults.map(r => r.video_id)).size;
      
      return new Response(JSON.stringify({
        answer: refusalMessage,
        citations: [],
        confidence: 'not_covered' as const,
        evidence: {
          chunksUsed: searchResults.length,
          videosReferenced: refusalVideoCount,
        },
        isRefusal: true,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Get video details for citations
    const videoIds = [...new Set(searchResults.map(r => r.video_id))];
    const { data: videos } = await supabase
      .from('videos')
      .select('video_id, title, thumbnail_url')
      .in('video_id', videoIds);
    
    const videoMap = new Map();
    videos?.forEach(v => videoMap.set(v.video_id, { title: v.title, thumbnail_url: v.thumbnail_url }));
    
    // Build citations
    const citationMap = new Map<string, any>();
    const sortedChunks = [...searchResults].sort((a, b) => b.similarity - a.similarity);
    
    for (const chunk of sortedChunks) {
      if (citationMap.size >= MAX_CITATIONS) break;
      
      const video = videoMap.get(chunk.video_id);
      const hasTs = hasValidTimestamps(chunk);
      const key = `${chunk.video_id}-${hasTs ? Math.floor(chunk.start_time || 0) : 'no-ts'}`;
      
      if (!citationMap.has(key)) {
        citationMap.set(key, {
          index: citationMap.size + 1,
          chunkId: chunk.id,
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
    
    // Generate response using simple prompt
    const systemPrompt = `You ARE ${creator_name}, responding directly to a viewer based ONLY on your video transcripts.

CRITICAL RULES:
1. ONLY USE THE TRANSCRIPT CHUNKS BELOW - These are your ONLY source of facts
2. NEVER USE PRIOR KNOWLEDGE - If it's not in the chunks, you don't know it
3. NEVER INVENT OR INFER - No examples, no anecdotes, no details unless explicitly in chunks
4. REFUSE CLEARLY when information isn't in your transcripts

Speak as yourself (first person: "I", "my", "I've"). Be direct and concise.

TRANSCRIPT CHUNKS:
${searchResults.map((chunk, i) => {
  const video = videoMap.get(chunk.video_id);
  const videoTitle = video?.title || 'Unknown Video';
  const hasTs = hasValidTimestamps(chunk);
  const timeInfo = hasTs ? `[${formatTimestamp(chunk.start_time)} - ${formatTimestamp(chunk.end_time)}]` : '';
  return `[${i + 1}] "${videoTitle}" ${timeInfo}\n${chunk.text}`;
}).join('\n\n')}`;
    
    const messages: LLMMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: query },
    ];
    
    const answer = await generateWithOpenAI(messages);
    const showCitations = shouldShowCitations(questionType, query);
    
    console.log(`Response generated with ${citationMap.size} citations`);
    console.log(`========================================\n`);
    
    // Increment message count for authenticated users
    if (!public_mode && user_id) {
      await incrementMessageCount(user_id);
    }
    
    return new Response(JSON.stringify({
      answer,
      citations: showCitations ? Array.from(citationMap.values()) : [],
      showCitations,
      confidence: confidenceLevel,
      evidence: {
        chunksUsed: searchResults.length,
        videosReferenced: videoIds.length,
      },
      isRefusal: false,
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
