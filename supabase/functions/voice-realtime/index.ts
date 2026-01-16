// Voice Realtime API - OpenAI Realtime integration with RAG context
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.89.0';
import {
  createLogger,
  checkRateLimit,
  logError,
  createErrorResponse,
  ErrorCodes,
  corsHeaders,
} from "../_shared/abuse-protection.ts";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const VOICE_RATE_LIMITS = {
  authenticated: { requests: 10, windowMinutes: 5 },
};

const VOICE_PLAN_LIMITS = {
  free: { maxMinutesPerDay: 5 },
  pro: { maxMinutesPerDay: 60 },
};

async function getUserUsage(userId: string) {
  const { data, error } = await supabase.rpc('get_usage_with_limits', {
    p_user_id: userId,
  });

  if (error || !data || data.length === 0) {
    return { plan_type: 'free', messages_sent_today: 0 };
  }

  return data[0];
}

async function resolveChannelId(internalId: string | null): Promise<string | null> {
  if (!internalId) return null;
  
  if (internalId.startsWith('UC')) {
    return internalId;
  }
  
  const { data: channel, error } = await supabase
    .from('channels')
    .select('channel_id, channel_name')
    .eq('id', internalId)
    .single();
  
  if (error || !channel) {
    console.warn(`Could not resolve channel ID: ${internalId}`);
    return null;
  }
  
  return channel.channel_id;
}

async function getChannelDetails(channelId: string) {
  const { data, error } = await supabase
    .from('channels')
    .select('channel_name, avatar_url')
    .or(`id.eq.${channelId},channel_id.eq.${channelId}`)
    .single();
  
  return error ? null : data;
}

async function generateQueryEmbedding(query: string): Promise<number[]> {
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
    throw new Error('Failed to generate embedding');
  }

  const data = await response.json();
  return data.data[0].embedding;
}

async function searchRelevantChunks(
  embedding: number[],
  channelId: string | null,
  matchCount: number = 8
) {
  const youtubeChannelId = await resolveChannelId(channelId);
  const vectorLiteral = `[${embedding.join(',')}]`;

  const { data, error } = await supabase.rpc('search_transcript_chunks', {
    query_embedding: vectorLiteral,
    match_threshold: 0.20,
    match_count: matchCount,
    filter_channel_id: youtubeChannelId,
  });

  if (error) {
    console.error('Search RPC error:', error);
    return [];
  }

  return data || [];
}

async function getVideoDetails(videoIds: string[]) {
  if (videoIds.length === 0) return new Map();

  const { data: videos } = await supabase
    .from('videos')
    .select('video_id, title')
    .in('video_id', videoIds);

  const videoMap = new Map();
  videos?.forEach(v => videoMap.set(v.video_id, v.title));
  return videoMap;
}

function formatChunksAsContext(chunks: any[], videoDetails: Map<string, string>): string {
  if (chunks.length === 0) {
    return "No specific content found. Politely indicate you haven't covered this topic.";
  }

  return chunks.map((chunk, i) => {
    const videoTitle = videoDetails.get(chunk.video_id) || 'Video';
    const timeStr = chunk.start_time ? `[${Math.floor(chunk.start_time / 60)}:${Math.floor(chunk.start_time % 60).toString().padStart(2, '0')}]` : '';
    return `[${i + 1}] "${videoTitle}" ${timeStr}\n${chunk.text}`;
  }).join('\n\n');
}

function buildVoiceSystemPrompt(creatorName: string, contextChunks: string): string {
  return `You ARE ${creatorName}, having a live voice conversation with a viewer. You are their AI mentor, speaking based ONLY on your video transcripts.

## CRITICAL VOICE RULES

1. **SPEAK NATURALLY** - You're in a real-time voice conversation. Be conversational, warm, and engaging.
2. **ONLY USE THE CONTEXT BELOW** - These transcript excerpts are your ONLY source of facts.
3. **NEVER INVENT** - If something isn't in the context, say "I haven't covered that in my videos."
4. **BE CONCISE** - Voice responses should be brief (1-3 sentences). Ask if they want more detail.
5. **FIRST PERSON** - Always speak as yourself: "I", "my", "I've talked about..."

## YOUR VOICE PERSONA

- Speak as the creator would - knowledgeable, helpful, approachable
- Use natural speech patterns - "you know", "basically", "the thing is"
- Pause naturally, don't rush
- If unsure, be honest: "From what I've covered..."

## GROUNDING CONTEXT (YOUR ONLY SOURCE OF FACTS)

${contextChunks || "No specific context loaded. For general questions, introduce yourself and what you typically discuss."}

---END CONTEXT---

Remember: This is a VOICE conversation. Keep responses short and conversational. Ask follow-up questions to understand what the viewer needs.`;
}

serve(async (req) => {
  const requestId = crypto.randomUUID();
  const logger = createLogger('voice-realtime', requestId);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Verify authentication (JWT verification disabled, handled internally)
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return createErrorResponse('Missing Authorization header', ErrorCodes.UNAUTHORIZED, 401);
  }

  const token = authHeader.replace('Bearer ', '');
  const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
  
  if (authError || !user) {
    logger.error('Authentication failed', { error: authError?.message });
    return createErrorResponse('Authentication failed', ErrorCodes.UNAUTHORIZED, 401);
  }

  try {
    const body = await req.json();
    const { action } = body;

    switch (action) {
      case 'create_session':
        return await handleCreateSession(req, body, logger);
      case 'get_context':
        return await handleGetContext(body, logger);
      case 'check_access':
        return await handleCheckAccess(body, logger);
      case 'track_usage':
        return await handleTrackUsage(body, logger);
      default:
        return new Response(JSON.stringify({ error: 'Unknown action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

  } catch (error) {
    logger.error('Voice realtime error', { error: String(error) });
    
    try {
      await logError(supabase, 'voice-realtime', error as Error);
    } catch { /* ignore */ }

    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function handleCreateSession(req: Request, body: any, logger: ReturnType<typeof createLogger>) {
  const { user_id, channel_id, creator_name, context } = body;

  if (!user_id) {
    return new Response(JSON.stringify({ error: 'user_id required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const rateLimitKey = `voice:${user_id}`;
  const rateCheck = checkRateLimit(rateLimitKey, VOICE_RATE_LIMITS.authenticated.requests, VOICE_RATE_LIMITS.authenticated.windowMinutes);

  if (!rateCheck.allowed) {
    return createErrorResponse(
      'Voice rate limit exceeded. Try again later.',
      ErrorCodes.RATE_LIMITED,
      429,
      { resetAt: rateCheck.resetAt.toISOString() }
    );
  }

  const usage = await getUserUsage(user_id);

  logger.info('Creating voice session', {
    userId: user_id,
    channelId: channel_id,
    planType: usage.plan_type,
  });

  const systemInstructions = buildVoiceSystemPrompt(creator_name || 'the creator', context || '');

  try {
    const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini-realtime-preview-2024-12-17',
        voice: 'alloy',
        instructions: systemInstructions,
        input_audio_transcription: {
          model: 'whisper-1',
        },
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 500,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('OpenAI session creation failed', { 
        status: response.status, 
        error: errorText 
      });
      return new Response(JSON.stringify({ 
        error: 'Failed to create voice session',
        details: errorText,
      }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const sessionData = await response.json();

    return new Response(JSON.stringify({
      success: true,
      ephemeralKey: sessionData.client_secret?.value,
      expiresAt: sessionData.client_secret?.expires_at,
      sessionId: sessionData.id,
      model: sessionData.model,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    logger.error('OpenAI session request failed', { error: String(error) });
    return new Response(JSON.stringify({ error: 'Voice service unavailable' }), {
      status: 503,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

async function handleGetContext(body: any, logger: ReturnType<typeof createLogger>) {
  const { user_id, channel_id, query } = body;

  if (!user_id || !channel_id) {
    return new Response(JSON.stringify({ error: 'user_id and channel_id required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  logger.info('Getting context for voice', { userId: user_id, channelId: channel_id });

  try {
    let chunks = [];
    if (query && query.trim()) {
      const embedding = await generateQueryEmbedding(query);
      chunks = await searchRelevantChunks(embedding, channel_id, 6);
    } else {
      const youtubeChannelId = await resolveChannelId(channel_id);
      const { data } = await supabase
        .from('transcript_chunks')
        .select('video_id, text, start_time')
        .eq('channel_id', youtubeChannelId)
        .limit(10);
      chunks = (data || []).map(c => ({ ...c, similarity: 0 }));
    }

    const videoIds = [...new Set(chunks.map((c: any) => c.video_id))] as string[];
    const videoDetails = await getVideoDetails(videoIds);
    const contextText = formatChunksAsContext(chunks, videoDetails);

    const channelDetails = await getChannelDetails(channel_id);

    return new Response(JSON.stringify({
      context: contextText,
      chunksCount: chunks.length,
      videosCount: videoIds.length,
      creatorName: channelDetails?.channel_name || 'the creator',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    logger.error('Context retrieval error', { error: String(error) });
    return new Response(JSON.stringify({ error: 'Failed to retrieve context' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}

async function handleCheckAccess(body: any, logger: ReturnType<typeof createLogger>) {
  const { user_id } = body;

  if (!user_id) {
    return new Response(JSON.stringify({ error: 'user_id required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const usage = await getUserUsage(user_id);
  const planLimits = VOICE_PLAN_LIMITS[usage.plan_type as keyof typeof VOICE_PLAN_LIMITS] || VOICE_PLAN_LIMITS.free;

  const rateLimitKey = `voice:${user_id}`;
  const rateCheck = checkRateLimit(rateLimitKey, VOICE_RATE_LIMITS.authenticated.requests, VOICE_RATE_LIMITS.authenticated.windowMinutes);

  return new Response(JSON.stringify({
    allowed: rateCheck.allowed,
    planType: usage.plan_type,
    limits: planLimits,
    remaining: rateCheck.remaining,
    resetAt: rateCheck.resetAt.toISOString(),
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function handleTrackUsage(body: any, logger: ReturnType<typeof createLogger>) {
  const { user_id, duration_seconds } = body;

  if (!user_id || typeof duration_seconds !== 'number') {
    return new Response(JSON.stringify({ error: 'user_id and duration_seconds required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  logger.info('Tracking voice usage', { userId: user_id, durationSeconds: duration_seconds });

  try {
    await supabase.rpc('increment_message_count', { p_user_id: user_id });
  } catch (error) {
    logger.error('Usage tracking failed', { error: String(error) });
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
