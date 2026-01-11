// Question type classification and pattern matching
import { QuestionType } from "../types/common.ts";

// ============================================
// QUESTION TYPE CLASSIFICATION
// ============================================
export function classifyQuestion(query: string, hasHistory: boolean): QuestionType {
  
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
// CITATION DISPLAY LOGIC
// ============================================
export function shouldShowCitations(questionType: QuestionType, query: string): boolean {
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