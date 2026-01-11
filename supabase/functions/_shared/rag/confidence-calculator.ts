// Confidence scoring for RAG responses
import { TranscriptChunk, QuestionType, ConfidenceLevel } from "../types/common.ts";

// ============================================
// CONFIDENCE CONFIGURATION
// ============================================
export interface ConfidenceThresholds {
  high: number;
  medium: number;
}

export const DEFAULT_CONFIDENCE_THRESHOLDS: ConfidenceThresholds = {
  high: 0.8,
  medium: 0.6,
};

// ============================================
// CONFIDENCE CALCULATION
// ============================================
export interface ConfidenceFactors {
  chunkRelevance: number;      // 0-1: How relevant are the chunks
  chunkCount: number;          // Number of supporting chunks
  questionType: QuestionType;  // Type affects confidence baseline
  queryLength: number;         // Longer queries often more specific
  topSimilarity: number;       // Highest similarity score
  avgSimilarity: number;       // Average similarity across chunks
}

export function calculateConfidence(
  chunks: TranscriptChunk[],
  questionType: QuestionType,
  query: string,
  thresholds: ConfidenceThresholds = DEFAULT_CONFIDENCE_THRESHOLDS
): ConfidenceLevel {
  if (chunks.length === 0) return 'low';
  
  const factors: ConfidenceFactors = {
    chunkRelevance: calculateChunkRelevance(chunks),
    chunkCount: chunks.length,
    questionType,
    queryLength: query.split(' ').length,
    topSimilarity: Math.max(...chunks.map(c => c.similarity || 0)),
    avgSimilarity: chunks.reduce((sum, c) => sum + (c.similarity || 0), 0) / chunks.length,
  };
  
  const score = computeConfidenceScore(factors);
  return scoreToLevel(score, thresholds);
}

function calculateChunkRelevance(chunks: TranscriptChunk[]): number {
  if (chunks.length === 0) return 0;
  
  // Weight by similarity scores if available
  const similarities = chunks.map(c => c.similarity || 0.5);
  const avgSimilarity = similarities.reduce((sum, sim) => sum + sim, 0) / similarities.length;
  
  // Boost if we have multiple supporting chunks
  const countBoost = Math.min(chunks.length / 3, 1) * 0.1;
  
  return Math.min(avgSimilarity + countBoost, 1);
}

function computeConfidenceScore(factors: ConfidenceFactors): number {
  let score = 0;
  
  // Base score from similarity (40% weight)
  score += factors.avgSimilarity * 0.4;
  
  // Top similarity bonus (20% weight)
  score += factors.topSimilarity * 0.2;
  
  // Question type modifier (20% weight)
  const typeModifier = getQuestionTypeModifier(factors.questionType);
  score += typeModifier * 0.2;
  
  // Chunk count bonus (10% weight) - more chunks = more confidence
  const chunkBonus = Math.min(factors.chunkCount / 5, 1) * 0.1;
  score += chunkBonus;
  
  // Query specificity bonus (10% weight)
  const specificityBonus = Math.min(factors.queryLength / 10, 1) * 0.1;
  score += specificityBonus;
  
  return Math.min(score, 1);
}

function getQuestionTypeModifier(questionType: QuestionType): number {
  switch (questionType) {
    case 'moment':
      return 0.9; // High confidence for specific moments
    case 'conceptual':
      return 0.8; // Good confidence for concept explanations
    case 'general':
      return 0.7; // Moderate confidence for general topics
    case 'followUp':
      return 0.6; // Lower confidence without full context
    case 'clarification':
      return 0.5; // Lowest confidence for clarifications
    default:
      return 0.7;
  }
}

function scoreToLevel(score: number, thresholds: ConfidenceThresholds): ConfidenceLevel {
  if (score >= thresholds.high) return 'high';
  if (score >= thresholds.medium) return 'medium';
  return 'low';
}

// ============================================
// CONFIDENCE DISPLAY
// ============================================
export function getConfidenceMessage(level: ConfidenceLevel, chunkCount: number): string {
  const chunkText = chunkCount === 1 ? '1 source' : `${chunkCount} sources`;
  
  switch (level) {
    case 'high':
      return `High confidence (${chunkText})`;
    case 'medium':
      return `Medium confidence (${chunkText})`;
    case 'low':
      return `Low confidence (${chunkText})`;
    default:
      return `Based on ${chunkText}`;
  }
}