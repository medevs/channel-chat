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

// Import refactored modules
import { Dependencies, TranscriptChunk, ConversationMessage, QuestionType, ConfidenceLevel } from "../_shared/types/common.ts";
import { classifyQuestion, shouldShowCitations } from "../_shared/rag/question-classifier.ts";
import { buildPrompt, PromptConfig } from "../_shared/rag/prompt-builder.ts";
import { calculateConfidence } from "../_shared/rag/confidence-calculator.ts";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface Citation {
  video_id: string;
  title: string;
  start_time: number | null;
  end_time: number | null;
  thumbnail_url: string | null;
}

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

    // Classify question type using refactored module
    const hasHistory = conversation_history.length > 0;
    const questionType = classifyQuestion(query, hasHistory);
    console.log(`Question type: ${questionType}`);

    // Mock chunks for testing - in real implementation, these would come from vector search
    const mockChunks: TranscriptChunk[] = [];

    // Calculate confidence using refactored module
    const confidenceLevel = calculateConfidence(mockChunks, questionType, query);
    
    // Build prompt using refactored module
    const promptConfig: PromptConfig = {
      questionType,
      query,
      chunks: mockChunks,
      creatorName: creator_name,
      conversationHistory: conversation_history,
      maxHistoryMessages: 3,
    };

    const prompt = buildPrompt(promptConfig);
    console.log('Prompt built successfully');

    // Check if citations should be shown
    const showCitations = shouldShowCitations(questionType, query);
    
    // Mock response for testing the refactored modules
    const mockAnswer = `This is a ${questionType} question about "${query.substring(0, 50)}..." - refactored modules are working!`;
    
    return new Response(JSON.stringify({
      answer: mockAnswer,
      citations: [],
      showCitations,
      confidence: confidenceLevel,
      evidence: {
        chunksUsed: mockChunks.length,
        videosReferenced: 0,
      },
      isRefusal: false,
      debug: {
        questionType,
        confidenceLevel,
        promptLength: prompt.length,
        modulesUsed: ['question-classifier', 'confidence-calculator', 'prompt-builder']
      }
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
