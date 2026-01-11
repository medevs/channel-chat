// Prompt construction for different question types
import { QuestionType, TranscriptChunk, ConversationMessage } from "../types/common.ts";

// ============================================
// PROMPT CONSTRUCTION
// ============================================
export interface PromptConfig {
  questionType: QuestionType;
  query: string;
  chunks: TranscriptChunk[];
  creatorName: string;
  conversationHistory?: ConversationMessage[];
  maxHistoryMessages?: number;
}

export function buildPrompt(config: PromptConfig): string {
  const { questionType, query, chunks, creatorName, conversationHistory = [], maxHistoryMessages = 3 } = config;
  
  const baseInstructions = `You are an AI assistant that answers questions based ONLY on ${creatorName}'s video content. You must:
- Only use information from the provided transcript chunks
- If the answer isn't in the transcripts, say "I don't have information about that in ${creatorName}'s videos"
- Be conversational and helpful while staying accurate
- Reference specific videos when relevant`;

  const transcriptSection = chunks.length > 0 
    ? `\n\nTRANSCRIPT CHUNKS:\n${chunks.map((chunk, i) => 
        `[${i + 1}] Video ID: ${chunk.video_id}\nTimestamp: ${chunk.start_time || 'N/A'}s\nContent: ${chunk.text}`
      ).join('\n\n')}`
    : '\n\nNo relevant transcript content found.';

  const historySection = conversationHistory.length > 0
    ? `\n\nCONVERSATION HISTORY:\n${conversationHistory
        .slice(-maxHistoryMessages)
        .map(msg => `${msg.role.toUpperCase()}: ${msg.content}`)
        .join('\n')}`
    : '';

  const questionTypeInstructions = getQuestionTypeInstructions(questionType);
  
  return `${baseInstructions}${questionTypeInstructions}${historySection}${transcriptSection}\n\nUSER QUESTION: ${query}\n\nRESPONSE:`;
}

function getQuestionTypeInstructions(questionType: QuestionType): string {
  switch (questionType) {
    case 'moment':
      return `\n- Focus on finding the specific moment or video where this was discussed
- Include video title and timestamp when possible
- Be precise about the location of information`;
      
    case 'clarification':
      return `\n- Refer to the previous conversation context
- Clarify or expand on what was previously discussed
- Connect your answer to the ongoing conversation`;
      
    case 'followUp':
      return `\n- Build on the previous conversation
- Answer in the context of what was already discussed
- Keep the conversational flow natural`;
      
    case 'general':
      return `\n- Provide a broad overview of the topic
- Draw from multiple videos if relevant
- Give a comprehensive but concise answer`;
      
    case 'conceptual':
    default:
      return `\n- Explain the concept clearly and thoroughly
- Use examples from the videos when available
- Be educational and detailed in your response`;
  }
}

// ============================================
// CHUNK FORMATTING
// ============================================
export function formatChunksForPrompt(chunks: TranscriptChunk[]): string {
  if (chunks.length === 0) return 'No relevant content found.';
  
  return chunks.map((chunk, index) => {
    const timestamp = formatTimestamp(chunk.start_time);
    return `[${index + 1}] Video ID: ${chunk.video_id} at ${timestamp}\n${chunk.text}`;
  }).join('\n\n');
}

function formatTimestamp(seconds: number | null): string {
  if (seconds === null || seconds === undefined) return 'N/A';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}