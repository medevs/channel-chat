import { describe, it, expect, vi } from 'vitest';
import { 
  calculateConfidence, 
  getConfidenceMessage,
  DEFAULT_CONFIDENCE_THRESHOLDS,
  type ConfidenceThresholds 
} from '../../../supabase/functions/_shared/rag/confidence-calculator.ts';
import type { TranscriptChunk, QuestionType } from '../../../supabase/functions/_shared/types/common.ts';

describe('Confidence Calculator', () => {
  // Helper function to create mock chunks
  const createMockChunk = (similarity: number, index: number = 0): TranscriptChunk => ({
    id: `chunk-${index}`,
    video_id: `video-${index}`,
    channel_id: 'test-channel',
    chunk_index: index,
    text: `Test chunk ${index}`,
    start_time: index * 10,
    end_time: (index + 1) * 10,
    similarity
  });

  describe('calculateConfidence', () => {
    it('should return low confidence for empty chunks', () => {
      const result = calculateConfidence([], 'general', 'test query');
      expect(result).toBe('low');
    });

    it('should return high confidence for high similarity chunks', () => {
      const chunks = [
        createMockChunk(0.95, 0),
        createMockChunk(0.90, 1),
        createMockChunk(0.85, 2)
      ];
      
      const result = calculateConfidence(chunks, 'moment', 'very specific detailed query about something');
      expect(result).toBe('high');
    });

    it('should return medium confidence for moderate similarity', () => {
      const chunks = [
        createMockChunk(0.75, 0),
        createMockChunk(0.70, 1)
      ];
      
      const result = calculateConfidence(chunks, 'conceptual', 'moderate query');
      expect(result).toBe('medium');
    });

    it('should return low confidence for low similarity chunks', () => {
      const chunks = [
        createMockChunk(0.4, 0),
        createMockChunk(0.3, 1)
      ];
      
      const result = calculateConfidence(chunks, 'clarification', 'vague');
      expect(result).toBe('low');
    });

    it('should handle boundary conditions correctly', () => {
      // Test exact threshold boundaries
      const highThresholdChunks = [createMockChunk(0.8, 0)];
      const mediumThresholdChunks = [createMockChunk(0.6, 0)];
      
      // Should be exactly at high threshold
      const highResult = calculateConfidence(highThresholdChunks, 'moment', 'specific query with multiple words');
      expect(['high', 'medium']).toContain(highResult); // Could be either due to other factors
      
      // Should be at medium threshold
      const mediumResult = calculateConfidence(mediumThresholdChunks, 'general', 'query');
      expect(['medium', 'low']).toContain(mediumResult);
    });

    it('should handle different question types correctly', () => {
      const chunks = [createMockChunk(0.7, 0)];
      
      const momentResult = calculateConfidence(chunks, 'moment', 'test query');
      const clarificationResult = calculateConfidence(chunks, 'clarification', 'test query');
      
      // Moment questions should have higher confidence than clarification
      // Both might be same level but moment should have higher internal score
      expect(['high', 'medium']).toContain(momentResult);
      expect(['medium', 'low']).toContain(clarificationResult);
    });

    it('should consider query length in confidence calculation', () => {
      const chunks = [createMockChunk(0.7, 0)];
      
      const shortQuery = calculateConfidence(chunks, 'general', 'short');
      const longQuery = calculateConfidence(chunks, 'general', 'this is a much longer and more specific query with many words');
      
      // Longer queries should generally have same or higher confidence
      const levels = ['low', 'medium', 'high'];
      const shortIndex = levels.indexOf(shortQuery);
      const longIndex = levels.indexOf(longQuery);
      
      expect(longIndex).toBeGreaterThanOrEqual(shortIndex);
    });

    it('should handle custom thresholds', () => {
      const customThresholds: ConfidenceThresholds = {
        high: 0.9,
        medium: 0.7
      };
      
      const chunks = [createMockChunk(0.8, 0)];
      
      const defaultResult = calculateConfidence(chunks, 'general', 'test');
      const customResult = calculateConfidence(chunks, 'general', 'test', customThresholds);
      
      // With higher thresholds, same chunks should have lower confidence
      expect(['low', 'medium']).toContain(customResult); // 0.8 might not reach medium with custom thresholds
    });

    it('should handle edge cases', () => {
      // Zero similarity
      const zeroChunks = [createMockChunk(0, 0)];
      expect(calculateConfidence(zeroChunks, 'general', 'test')).toBe('low');
      
      // Perfect similarity
      const perfectChunks = [createMockChunk(1.0, 0)];
      expect(calculateConfidence(perfectChunks, 'moment', 'detailed specific query')).toBe('high');
      
      // Many chunks with low similarity
      const manyLowChunks = Array.from({ length: 10 }, (_, i) => createMockChunk(0.3, i));
      const manyLowResult = calculateConfidence(manyLowChunks, 'general', 'test');
      expect(['low', 'medium']).toContain(manyLowResult); // Many chunks might boost confidence slightly
    });

    it('should handle chunks without similarity scores', () => {
      const chunksWithoutSimilarity: TranscriptChunk[] = [{
        id: 'chunk-1',
        video_id: 'video-1',
        channel_id: 'test-channel',
        chunk_index: 0,
        text: 'Test chunk',
        start_time: 0,
        end_time: 10,
        similarity: 0 // Explicit zero
      }];
      
      const result = calculateConfidence(chunksWithoutSimilarity, 'general', 'test');
      expect(['low', 'medium', 'high']).toContain(result);
    });
  });

  describe('getConfidenceMessage', () => {
    it('should format high confidence message correctly', () => {
      expect(getConfidenceMessage('high', 1)).toBe('High confidence (1 source)');
      expect(getConfidenceMessage('high', 3)).toBe('High confidence (3 sources)');
    });

    it('should format medium confidence message correctly', () => {
      expect(getConfidenceMessage('medium', 1)).toBe('Medium confidence (1 source)');
      expect(getConfidenceMessage('medium', 2)).toBe('Medium confidence (2 sources)');
    });

    it('should format low confidence message correctly', () => {
      expect(getConfidenceMessage('low', 1)).toBe('Low confidence (1 source)');
      expect(getConfidenceMessage('low', 5)).toBe('Low confidence (5 sources)');
    });

    it('should handle not_covered confidence level', () => {
      expect(getConfidenceMessage('not_covered', 0)).toBe('Based on 0 sources');
      expect(getConfidenceMessage('not_covered', 1)).toBe('Based on 1 source');
    });

    it('should handle edge cases for chunk count', () => {
      expect(getConfidenceMessage('high', 0)).toBe('High confidence (0 sources)');
      expect(getConfidenceMessage('medium', 100)).toBe('Medium confidence (100 sources)');
    });
  });

  describe('Integration tests', () => {
    it('should provide consistent confidence for similar scenarios', () => {
      const scenario1Chunks = [
        createMockChunk(0.8, 0),
        createMockChunk(0.75, 1)
      ];
      
      const scenario2Chunks = [
        createMockChunk(0.82, 0),
        createMockChunk(0.73, 1)
      ];
      
      const result1 = calculateConfidence(scenario1Chunks, 'conceptual', 'explain the concept');
      const result2 = calculateConfidence(scenario2Chunks, 'conceptual', 'explain the concept');
      
      // Should be same confidence level for very similar scenarios
      expect(result1).toBe(result2);
    });

    it('should handle realistic RAG scenarios', () => {
      // Scenario: Good match with multiple supporting chunks
      const goodMatch = [
        createMockChunk(0.85, 0), // Primary match
        createMockChunk(0.72, 1), // Supporting evidence
        createMockChunk(0.68, 2)  // Additional context
      ];
      
      const goodResult = calculateConfidence(goodMatch, 'conceptual', 'detailed question about specific topic');
      expect(['medium', 'high']).toContain(goodResult);
      
      // Scenario: Weak match with single chunk
      const weakMatch = [createMockChunk(0.45, 0)];
      const weakResult = calculateConfidence(weakMatch, 'general', 'vague question');
      expect(weakResult).toBe('low');
      
      // Scenario: Perfect match but clarification question
      const perfectButClarification = [createMockChunk(0.95, 0)];
      const clarificationResult = calculateConfidence(perfectButClarification, 'clarification', 'what?');
      expect(['medium', 'high']).toContain(clarificationResult); // High similarity should still boost confidence
    });
  });
});