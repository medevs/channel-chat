import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";
import {
  createLogger,
  checkRateLimit,
  acquireLock,
  releaseLock,
  logError,
  createErrorResponse,
  ErrorCodes,
  RATE_LIMITS,
  corsHeaders,
} from "../_shared/abuse-protection.ts";

// ============================================
// PLAN LIMITS CONFIGURATION
// ============================================
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
  // NOTE: We DON'T override similarity thresholds for general questions
  // General questions need lower thresholds to find diverse topic content
  // Only use stricter thresholds for conceptual/moment questions
  minSimilarityThreshold: {
    general: 0.22,      // Lower for broad topic questions
    followUp: 0.25,
    conceptual: 0.35,
    clarification: 0.35,
    moment: 0.40,
  },
  maxAnswerLength: 400,
};

const DEFAULT_PLAN = 'free';

// ============================================
// RAG CONFIGURATION - TUNED FOR GROUNDED ANSWERS
// ============================================
const RAG_CONFIG = {
  // Retrieval settings by question type - STRICTER thresholds
  retrieval: {
    general: {
      matchCount: 10,
      minThreshold: 0.25,      // Raised from 0.18
      preferredThreshold: 0.35, // Raised from 0.28
      requiresTimestamp: false,
    },
    conceptual: {
      matchCount: 8,
      minThreshold: 0.30,      // Raised from 0.25
      preferredThreshold: 0.40, // Raised from 0.35
      requiresTimestamp: false,
    },
    moment: {
      matchCount: 5,
      minThreshold: 0.35,      // Raised from 0.20
      preferredThreshold: 0.45, // Raised from 0.30
      requiresTimestamp: true,
    },
    followUp: {
      matchCount: 8,
      minThreshold: 0.28,      // Raised from 0.22
      preferredThreshold: 0.38, // Raised from 0.32
      requiresTimestamp: false,
    },
    clarification: {
      matchCount: 6,
      minThreshold: 0.32,      // Raised from 0.28
      preferredThreshold: 0.42, // Raised from 0.38
      requiresTimestamp: false,
    },
  },
  // STRICTER similarity thresholds for answer generation
  minSimilarityForConfidentAnswer: 0.40, // Raised from 0.30
  minSimilarityForAnyAnswer: 0.25,       // Raised from 0.15
  // Max conversation history for context
  maxHistoryMessages: 6,  // Reduced for focus
  // Debug mode control
  showDebugInResponse: false,
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!;
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ============================================
// TYPES
// ============================================
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

// ============================================
// QUESTION TYPE CLASSIFICATION
// ============================================
function classifyQuestion(query: string, hasHistory: boolean): QuestionType {
  const q = query.toLowerCase().trim();
  
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
  
  // Follow-up detection: short questions or references to prior context
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

// ============================================
// FOLLOW-UP QUERY ENHANCEMENT
// ============================================
// Expands short/vague follow-up queries using conversation context for better embedding search
function expandFollowUpQuery(
  query: string,
  conversationHistory: ConversationMessage[],
  questionType: QuestionType
): string {
  console.log(`[Query Expansion] Input: "${query}", Type: ${questionType}, History: ${conversationHistory.length} messages`);
  
  // Expand for follow-ups, clarifications, and moment questions with history
  const shouldExpand = ['followUp', 'clarification', 'moment'].includes(questionType) && conversationHistory.length > 0;
  
  if (!shouldExpand) {
    console.log('[Query Expansion] Skipping - no history or not an expandable question type');
    return query;
  }
  
  // Get the last 2 exchanges for context
  const recentHistory = conversationHistory.slice(-4);
  console.log(`[Query Expansion] Recent history: ${JSON.stringify(recentHistory.map(h => ({ role: h.role, preview: h.content.substring(0, 50) })))}`);
  
  // Find the last user question and assistant answer
  let lastUserQuery = '';
  let lastAssistantAnswer = '';
  
  for (let i = recentHistory.length - 1; i >= 0; i--) {
    const msg = recentHistory[i];
    if ((msg.role === 'user') && !lastUserQuery) {
      lastUserQuery = msg.content;
    }
    if ((msg.role === 'assistant') && !lastAssistantAnswer) {
      lastAssistantAnswer = msg.content;
    }
    if (lastUserQuery && lastAssistantAnswer) break;
  }
  
  console.log(`[Query Expansion] Last user query: "${lastUserQuery.substring(0, 60)}..."`);
  console.log(`[Query Expansion] Last assistant answer: "${lastAssistantAnswer.substring(0, 60)}..."`);
  
  // Expand if query is short OR if it's a moment-based question referencing prior context
  const words = query.trim().split(/\s+/);
  const isShortQuery = words.length <= 8;
  const referencesPriorContext = /\b(that|this|it|those|these|the same|what you|you said|you mentioned|earlier)\b/i.test(query);
  
  if ((isShortQuery || referencesPriorContext) && (lastUserQuery || lastAssistantAnswer)) {
    // Extract key topics from last exchange - prioritize nouns and technical terms
    const combinedContext = `${lastUserQuery} ${lastAssistantAnswer}`;
    
    // Better keyword extraction - filter out common words
    const stopWords = new Set(['that', 'this', 'with', 'have', 'from', 'about', 'what', 'where', 'when', 'which', 'would', 'could', 'should', 'there', 'their', 'been', 'being', 'your', 'also', 'just', 'more', 'some', 'very', 'will', 'only']);
    
    const topicKeywords = combinedContext
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3 && !stopWords.has(w))
      .slice(0, 8)
      .join(' ');
    
    if (topicKeywords.trim()) {
      // Create expanded query for embedding - combine the original query with context
      const expandedQuery = `${query} ${topicKeywords}`;
      console.log(`[Query Expansion] SUCCESS: "${query}" -> "${expandedQuery}"`);
      return expandedQuery;
    }
  }
  
  console.log('[Query Expansion] No expansion needed or no keywords extracted');
  return query;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
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

async function checkChannelIndexStatus(channelId: string | null): Promise<{
  hasChunks: boolean;
  hasEmbeddings: boolean;
  totalChunks: number;
  chunksWithTimestamps: number;
}> {
  console.log(`Checking index status for channel: ${channelId || 'all'}`);
  
  let chunkQuery = supabase
    .from('transcript_chunks')
    .select('id, start_time, end_time, embedding_status');
  
  if (channelId) {
    chunkQuery = chunkQuery.eq('channel_id', channelId);
  }
  
  const { data: chunks } = await chunkQuery;
  
  const totalChunks = chunks?.length || 0;
  const chunksWithTimestamps = chunks?.filter(c => 
    c.start_time !== null && c.end_time !== null && c.end_time > c.start_time
  ).length || 0;
  const embeddingsComplete = chunks?.filter(c => c.embedding_status === 'completed').length || 0;
  
  console.log(`Index status: chunks=${totalChunks}, withTimestamps=${chunksWithTimestamps}, embeddings=${embeddingsComplete}`);
  
  return {
    hasChunks: totalChunks > 0,
    hasEmbeddings: embeddingsComplete > 0,
    totalChunks,
    chunksWithTimestamps,
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

// ============================================
// PROMPT ENGINEERING - STRICT GROUNDING
// ============================================
function buildSystemPrompt(
  creatorName: string,
  questionType: QuestionType,
  hasTimestamps: boolean,
  confidenceLevel: 'high' | 'medium' | 'low'
): string {
  // Ultra-strict grounding prompt
  const systemPrompt = `You ARE ${creatorName}, responding directly to a viewer based ONLY on your video transcripts.

## CRITICAL RULES - NEVER VIOLATE

1. **ONLY USE THE TRANSCRIPT CHUNKS BELOW** - These are your ONLY source of facts
2. **NEVER USE PRIOR KNOWLEDGE** - If it's not in the chunks, you don't know it
3. **NEVER INVENT OR INFER** - No examples, no anecdotes, no details unless explicitly in chunks
4. **REFUSE CLEARLY** when information isn't in your transcripts

## YOUR RESPONSE STYLE

- Speak as yourself (first person: "I", "my", "I've")
- Be direct and concise: 1-3 sentences for simple questions
- Paraphrase what you said - don't quote verbatim unless a short phrase adds clarity
- NEVER list video titles unless explicitly asked for a list
- NEVER mention timestamps unless the viewer asks "where/when" something was said

## QUESTION-SPECIFIC GUIDANCE

${getQuestionGuidance(questionType, hasTimestamps)}

## CONFIDENCE LEVEL: ${confidenceLevel.toUpperCase()}

${getConfidenceGuidance(confidenceLevel)}

## WHEN INFORMATION IS NOT IN TRANSCRIPTS

If the chunks don't contain relevant information, say ONE of:
- "I haven't covered that in my videos."
- "That's not something I've discussed in the content I have indexed."
- "I don't have information on that in my transcripts."

Do NOT apologize excessively or offer alternatives unless asked.`;

  return systemPrompt;
}

function getQuestionGuidance(questionType: QuestionType, hasTimestamps: boolean): string {
  switch (questionType) {
    case 'moment':
      return `The viewer wants to know WHERE or WHEN you said something.
${hasTimestamps 
  ? `- Include the timestamp naturally: "I talked about that around [X:XX] in [video title]"
- Be specific about the exact moment`
  : `- Timestamp data is unavailable - mention the video but note you can't pinpoint the exact moment`}
- If you can't find the specific moment: "I don't think I covered that specifically."`;
    
    case 'clarification':
      return `The viewer is asking about something from the conversation.
- Check what was discussed earlier (in CONVERSATION HISTORY below)
- Ground your explanation ONLY in transcript chunks
- If you can't clarify from transcripts: "I'd need to cover that more in my videos."`;
    
    case 'followUp':
      return `This builds on the previous exchange.
- Reference prior context from CONVERSATION HISTORY
- Ground ALL facts in transcript chunks only
- Connect naturally to what was discussed`;
    
    case 'conceptual':
      return `The viewer wants to understand an idea or get advice.
- Synthesize from your transcript chunks
- Share YOUR perspective as expressed in YOUR videos
- Be practical and actionable`;
    
    default: // general
      return `The viewer wants broad information about what you cover.
- Draw from transcript chunks to identify themes
- Answer naturally: "I typically cover X, Y, and Z..."
- Keep it conversational, not a list`;
  }
}

function getConfidenceGuidance(level: 'high' | 'medium' | 'low'): string {
  switch (level) {
    case 'high':
      return 'The transcript chunks are highly relevant. Answer with confidence based on them.';
    case 'medium':
      return 'The chunks are moderately relevant. You may hedge slightly: "Based on what I\'ve covered..."';
    case 'low':
      return `The chunks have weak relevance. Either:
- Add uncertainty: "I may have touched on this briefly..."
- Or refuse: "I don't think I've covered that in depth."
Prefer refusal over a weak, speculative answer.`;
  }
}

function buildContextBlock(
  chunks: TranscriptChunk[],
  videoDetails: Map<string, { title: string; thumbnail_url: string | null }>
): string {
  if (chunks.length === 0) {
    return '## TRANSCRIPT CHUNKS\n\nNo relevant transcript chunks found.';
  }
  
  const contextParts = chunks.map((chunk, i) => {
    const video = videoDetails.get(chunk.video_id);
    const videoTitle = video?.title || 'Unknown Video';
    const hasTs = hasValidTimestamps(chunk);
    const timeInfo = hasTs 
      ? `[${formatTimestamp(chunk.start_time)} - ${formatTimestamp(chunk.end_time)}]` 
      : '';
    
    // Include similarity score for internal reference
    return `[${i + 1}] "${videoTitle}" ${timeInfo} (relevance: ${(chunk.similarity * 100).toFixed(0)}%)
${chunk.text}`;
  });
  
  return `## TRANSCRIPT CHUNKS (YOUR ONLY SOURCE OF FACTS)

${contextParts.join('\n\n')}

---END TRANSCRIPTS---`;
}

function buildHistoryBlock(history: ConversationMessage[]): string {
  if (history.length === 0) return '';
  
  const recentHistory = history.slice(-RAG_CONFIG.maxHistoryMessages);
  const formatted = recentHistory.map(m => 
    `${m.role === 'user' ? 'Viewer' : 'You'}: ${m.content}`
  ).join('\n\n');
  
  return `## CONVERSATION HISTORY (for context only, NOT a source of facts)

${formatted}

---END HISTORY---`;
}

async function generateResponse(
  query: string,
  chunks: TranscriptChunk[],
  conversationHistory: ConversationMessage[],
  videoDetails: Map<string, { title: string; thumbnail_url: string | null }>,
  questionType: QuestionType,
  creatorName: string,
  confidenceLevel: 'high' | 'medium' | 'low'
): Promise<{ answer: string; citations: any[]; showCitations: boolean }> {
  console.log(`Generating response: ${chunks.length} chunks, type=${questionType}, creator=${creatorName}, confidence=${confidenceLevel}`);
  
  const hasTimestamps = chunks.some(c => hasValidTimestamps(c));
  const showCitations = shouldShowCitations(questionType, query);
  
  const systemPrompt = buildSystemPrompt(creatorName, questionType, hasTimestamps, confidenceLevel);
  const contextBlock = buildContextBlock(chunks, videoDetails);
  const historyBlock = buildHistoryBlock(conversationHistory);
  
  // Structure the full prompt with clear sections
  const fullSystemContent = `${systemPrompt}

${contextBlock}

${historyBlock}`;

  const messages: LLMMessage[] = [
    { role: 'system', content: fullSystemContent },
    { role: 'user', content: query },
  ];
  
  let answer: string;
  
  if (LOVABLE_API_KEY) {
    try {
      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        answer = data.choices[0].message.content;
      } else {
        const errText = await response.text();
        console.log('Lovable AI error, using OpenAI fallback:', errText);
        answer = await generateWithOpenAI(messages);
      }
    } catch (error) {
      console.log('Lovable AI exception, using OpenAI fallback:', error);
      answer = await generateWithOpenAI(messages);
    }
  } else {
    answer = await generateWithOpenAI(messages);
  }
  
  // Build citations - limit to MAX_CITATIONS
  const citationMap = new Map<string, any>();
  const sortedChunks = [...chunks].sort((a, b) => b.similarity - a.similarity);
  
  for (const chunk of sortedChunks) {
    if (citationMap.size >= MAX_CITATIONS) break;
    
    const video = videoDetails.get(chunk.video_id);
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
  
  return { answer, citations: showCitations ? Array.from(citationMap.values()) : [], showCitations };
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
      max_tokens: 600,  // Reduced for conciseness
      temperature: 0.2, // Lower for more consistent grounding
    }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI chat error: ${error}`);
  }
  
  const data = await response.json();
  return data.choices[0].message.content;
}

// ============================================
// MAIN HANDLER
// ============================================
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
    
    // ============================================
    // RATE LIMITING
    // ============================================
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
    
    // ============================================
    // PUBLIC MODE RATE LIMITING
    // ============================================
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
      
      const today = new Date().toISOString().split('T')[0];
      
      const { data: existingLimit } = await supabase
        .from('public_chat_limits')
        .select('*')
        .eq('identifier', client_identifier)
        .eq('channel_id', channel_id)
        .single();
      
      if (existingLimit) {
        const lastResetDate = new Date(existingLimit.last_reset_at).toISOString().split('T')[0];
        
        if (lastResetDate < today) {
          await supabase
            .from('public_chat_limits')
            .update({ messages_today: 1, last_reset_at: new Date().toISOString() })
            .eq('id', existingLimit.id);
        } else if (existingLimit.messages_today >= PUBLIC_LIMITS.maxDailyMessages) {
          console.log(`Public rate limit reached for ${client_identifier}`);
          return new Response(JSON.stringify({
            error: 'Daily limit reached',
            limit_exceeded: true,
            limit_type: 'public_messages',
            current: existingLimit.messages_today,
            limit: PUBLIC_LIMITS.maxDailyMessages,
            message: `You've reached your ${PUBLIC_LIMITS.maxDailyMessages} free questions for today. Sign up for unlimited access!`,
          }), {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } else {
          await supabase
            .from('public_chat_limits')
            .update({ messages_today: existingLimit.messages_today + 1 })
            .eq('id', existingLimit.id);
        }
      } else {
        await supabase
          .from('public_chat_limits')
          .insert({
            identifier: client_identifier,
            channel_id: channel_id,
            messages_today: 1,
          });
      }
      
      console.log(`\n========== PUBLIC RAG Chat Query ==========`);
      console.log(`Query: "${query}"`);
      console.log(`Channel: ${channel_id}`);
    }
    
    // ============================================
    // AUTHENTICATED USER LIMIT CHECK
    // ============================================
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
    
    if (!public_mode) {
      console.log(`\n========== RAG Chat Query ==========`);
      console.log(`Query: "${query}"`);
      console.log(`Channel: ${channel_id || 'all'}`);
      console.log(`User: ${user_id || 'anonymous'}`);
      console.log(`History messages: ${conversation_history.length}`);
    }
    
    // Check index status
    const indexStatus = await checkChannelIndexStatus(channel_id);
    
    if (!indexStatus.hasChunks || !indexStatus.hasEmbeddings) {
      return new Response(JSON.stringify({
        answer: "I haven't been fully indexed yet. Please wait for the indexing process to complete.",
        citations: [],
        debug: RAG_CONFIG.showDebugInResponse ? { indexStatus, reason: 'not_indexed' } : undefined,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Classify question type
    const hasHistory = conversation_history.length > 0;
    const questionType = classifyQuestion(query, hasHistory);
    console.log(`Question type: ${questionType}`);
    
    // Get retrieval config - public mode uses question-type-specific thresholds
    const baseConfig = RAG_CONFIG.retrieval[questionType] || RAG_CONFIG.retrieval.general;
    const publicThreshold = PUBLIC_LIMITS.minSimilarityThreshold[questionType] || PUBLIC_LIMITS.minSimilarityThreshold.general;
    
    const retrievalConfig = public_mode ? {
      ...baseConfig,
      matchCount: Math.min(baseConfig.matchCount, PUBLIC_LIMITS.maxChunks),
      // Only raise thresholds if the public threshold is higher than base
      minThreshold: Math.max(baseConfig.minThreshold, publicThreshold),
      preferredThreshold: Math.max(baseConfig.preferredThreshold, publicThreshold),
    } : baseConfig;
    
    console.log(`Retrieval config: matchCount=${retrievalConfig.matchCount}, minThreshold=${retrievalConfig.minThreshold}, preferredThreshold=${retrievalConfig.preferredThreshold}`);
    
    // ENHANCEMENT: Expand query for follow-ups using conversation context
    const expandedQuery = expandFollowUpQuery(query, conversation_history, questionType);
    
    // Generate query embedding with expanded query
    const queryEmbedding = await generateQueryEmbedding(expandedQuery);
    
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
    
    // STRICTER: Refuse if context is insufficient
    if (!hasContext || !meetsMinimumRelevance || (questionType === 'moment' && (!hasConfidentMatch || !hasTimestampsForMoment))) {
      let refusalMessage: string;
      if (questionType === 'moment' && !hasTimestampsForMoment && hasContext) {
        refusalMessage = "I can't pinpoint the exact moment - timestamp data isn't available for this content.";
      } else if (questionType === 'moment') {
        refusalMessage = "I couldn't find a specific moment where I discussed that in my indexed videos.";
      } else {
        refusalMessage = "I haven't covered that topic in my indexed videos.";
      }
      
      // Count unique videos from search results for evidence
      const refusalVideoCount = new Set(searchResults.map(r => r.video_id)).size;
      
      return new Response(JSON.stringify({
        answer: refusalMessage,
        citations: [],
        // NEW: Refusals are explicitly marked
        confidence: 'not_covered' as const,
        evidence: {
          chunksUsed: searchResults.length,
          videosReferenced: refusalVideoCount,
        },
        isRefusal: true,
        debug: RAG_CONFIG.showDebugInResponse ? { 
          indexStatus, 
          reason: 'no_relevant_context',
          questionType,
          maxSimilarity,
          confidenceLevel,
          threshold: retrievalConfig.preferredThreshold,
        } : undefined,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Get video details for citations
    const videoIds = [...new Set(searchResults.map(r => r.video_id))];
    const videoDetails = await getVideoDetails(videoIds);
    
    // Generate response
    const { answer, citations, showCitations } = await generateResponse(
      query,
      searchResults,
      conversation_history,
      videoDetails,
      questionType,
      creator_name,
      confidenceLevel
    );
    
    console.log(`Response generated with ${citations.length} citations`);
    console.log(`========================================\n`);
    
    // Increment message count for authenticated users
    if (!public_mode && user_id) {
      await incrementMessageCount(user_id);
    }
    
    // Determine if this is a refusal
    const isRefusal = false; // We got here, so we have valid context
    
    return new Response(JSON.stringify({
      answer,
      citations,
      showCitations,
      // NEW: Always expose confidence and evidence for UI transparency
      confidence: confidenceLevel,
      evidence: {
        chunksUsed: searchResults.length,
        videosReferenced: videoIds.length,
      },
      isRefusal,
      debug: RAG_CONFIG.showDebugInResponse ? {
        chunksFound: searchResults.length,
        videosReferenced: videoIds.length,
        questionType,
        confidenceLevel,
        maxSimilarity,
        expandedQuery: expandedQuery !== query ? expandedQuery : undefined,
      } : undefined,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    logger.error('RAG chat error', { error: String(error) });
    
    // Log to database for monitoring (with safe fallbacks since we may not have parsed the request)
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
