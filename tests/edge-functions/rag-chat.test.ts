import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('RAG Chat Function', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Question Classification', () => {
    const classifyQuestion = (query: string, hasHistory: boolean): string => {
      const q = query.toLowerCase().trim();
      
      // Moment-based patterns
      const momentPatterns = [
        /where\s+(did|does|do)\s+(he|she|they|you|i)\s+(say|mention|talk|discuss)/i,
        /when\s+(did|does|do)\s+(he|she|they|you|i)\s+(say|mention|talk|discuss)/i,
        /at\s+what\s+(time|point|moment)/i,
        /timestamp/i,
        /find\s+(the\s+)?(moment|part|section)/i,
      ];
      if (momentPatterns.some(p => p.test(query))) {
        return 'moment';
      }
      
      // Clarification patterns
      const clarificationPatterns = [
        /what\s+(did|does|do)\s+(he|she|they|you|i)\s+mean\s+by/i,
        /can\s+you\s+explain/i,
        /clarify/i,
      ];
      if (clarificationPatterns.some(p => p.test(query))) {
        return hasHistory ? 'clarification' : 'conceptual';
      }
      
      // Follow-up patterns
      const followUpPatterns = [
        /^(and|but|so|also|what about|how about)/i,
        /^(why|how|what)\s*\?*$/i,
        /tell\s+me\s+more/i,
      ];
      if (hasHistory && (followUpPatterns.some(p => p.test(query)) || query.split(' ').length <= 5)) {
        return 'followUp';
      }
      
      // General patterns
      const generalPatterns = [
        /what\s+(topics?|does|do)\s+(he|she|they|you)\s+(talk|cover|discuss)/i,
        /tell\s+me\s+about/i,
        /overview/i,
      ];
      if (generalPatterns.some(p => p.test(query))) {
        return 'general';
      }
      
      // Conceptual patterns
      const conceptualPatterns = [
        /how\s+(do|does|can|should)/i,
        /what\s+is\s+(the|a|your)/i,
        /explain/i,
        /why\s+(do|does|is|are)/i,
      ];
      if (conceptualPatterns.some(p => p.test(query))) {
        return 'conceptual';
      }
      
      return query.split(' ').length > 8 ? 'conceptual' : 'general';
    };

    it('should classify moment-based questions', () => {
      expect(classifyQuestion('Where did you say that about React?', false)).toBe('moment');
      expect(classifyQuestion('When did he mention the timestamp?', false)).toBe('moment');
      expect(classifyQuestion('At what time does this happen?', false)).toBe('moment');
      expect(classifyQuestion('Find the moment where he talks about this', false)).toBe('moment');
    });

    it('should classify clarification questions', () => {
      expect(classifyQuestion('What did you mean by that?', true)).toBe('clarification');
      expect(classifyQuestion('Can you explain that concept?', false)).toBe('conceptual');
      expect(classifyQuestion('Can you clarify this point?', true)).toBe('clarification');
    });

    it('should classify follow-up questions', () => {
      expect(classifyQuestion('And what about performance?', true)).toBe('followUp');
      expect(classifyQuestion('But how?', true)).toBe('followUp');
      expect(classifyQuestion('Tell me more', true)).toBe('followUp');
      expect(classifyQuestion('Why?', true)).toBe('followUp');
      expect(classifyQuestion('Short question', true)).toBe('followUp');
    });

    it('should classify general questions', () => {
      expect(classifyQuestion('What topics do you cover?', false)).toBe('general');
      expect(classifyQuestion('Tell me about your content', false)).toBe('general');
      expect(classifyQuestion('Give me an overview', false)).toBe('general');
    });

    it('should classify conceptual questions', () => {
      expect(classifyQuestion('How do I implement authentication?', false)).toBe('conceptual');
      expect(classifyQuestion('What is the best way to handle state?', false)).toBe('conceptual');
      expect(classifyQuestion('Explain the difference between these approaches', false)).toBe('conceptual');
      expect(classifyQuestion('Why does this pattern work better?', false)).toBe('conceptual');
    });

    it('should handle edge cases', () => {
      expect(classifyQuestion('', false)).toBe('general');
      expect(classifyQuestion('Single', false)).toBe('general');
      expect(classifyQuestion('This is a very long question with many words that should be classified as conceptual', false)).toBe('conceptual');
    });
  });

  describe('Query Expansion', () => {
    const expandFollowUpQuery = (
      query: string,
      conversationHistory: any[],
      questionType: string
    ): string => {
      const shouldExpand = ['followUp', 'clarification', 'moment'].includes(questionType) && conversationHistory.length > 0;
      
      if (!shouldExpand) {
        return query;
      }
      
      const recentHistory = conversationHistory.slice(-4);
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
      
      const words = query.trim().split(/\s+/);
      const isShortQuery = words.length <= 8;
      const referencesPriorContext = /\b(that|this|it|those|these|the same|what you|you said|you mentioned|earlier)\b/i.test(query);
      
      if ((isShortQuery || referencesPriorContext) && (lastUserQuery || lastAssistantAnswer)) {
        const combinedContext = `${lastUserQuery} ${lastAssistantAnswer}`;
        
        const stopWords = new Set(['that', 'this', 'with', 'have', 'from', 'about', 'what', 'where', 'when', 'which', 'would', 'could', 'should', 'there', 'their', 'been', 'being', 'your', 'also', 'just', 'more', 'some', 'very', 'will', 'only']);
        
        const topicKeywords = combinedContext
          .toLowerCase()
          .replace(/[^\w\s]/g, ' ')
          .split(/\s+/)
          .filter(w => w.length > 3 && !stopWords.has(w))
          .slice(0, 8)
          .join(' ');
        
        if (topicKeywords.trim()) {
          return `${query} ${topicKeywords}`;
        }
      }
      
      return query;
    };

    it('should expand follow-up queries with context', () => {
      const history = [
        { role: 'user', content: 'How do I implement React hooks?' },
        { role: 'assistant', content: 'React hooks are functions that let you use state and lifecycle features in functional components. The most common ones are useState and useEffect.' }
      ];

      const expanded = expandFollowUpQuery('What about performance?', history, 'followUp');
      
      expect(expanded).toContain('What about performance?');
      expect(expanded.length).toBeGreaterThan('What about performance?'.length);
      expect(expanded).toContain('React');
    });

    it('should expand clarification queries', () => {
      const history = [
        { role: 'user', content: 'Explain useState' },
        { role: 'assistant', content: 'useState is a React hook for managing component state' }
      ];

      const expanded = expandFollowUpQuery('What do you mean by that?', history, 'clarification');
      
      expect(expanded).toContain('What do you mean by that?');
      expect(expanded).toContain('useState');
    });

    it('should not expand non-expandable question types', () => {
      const history = [
        { role: 'user', content: 'Previous question' },
        { role: 'assistant', content: 'Previous answer' }
      ];

      const expanded = expandFollowUpQuery('What is React?', history, 'conceptual');
      
      expect(expanded).toBe('What is React?');
    });

    it('should not expand when no history exists', () => {
      const expanded = expandFollowUpQuery('Tell me more', [], 'followUp');
      
      expect(expanded).toBe('Tell me more');
    });

    it('should handle queries with prior context references', () => {
      const history = [
        { role: 'user', content: 'How does authentication work?' },
        { role: 'assistant', content: 'Authentication verifies user identity using tokens and sessions' }
      ];

      const expanded = expandFollowUpQuery('Can you explain that concept?', history, 'clarification');
      
      expect(expanded).toContain('authentication');
      expect(expanded).toContain('tokens');
    });
  });

  describe('Citation Generation', () => {
    const shouldShowCitations = (questionType: string, query: string): boolean => {
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
    };

    it('should show citations for moment questions', () => {
      expect(shouldShowCitations('moment', 'Where did you say that?')).toBe(true);
    });

    it('should show citations for location-based queries', () => {
      expect(shouldShowCitations('general', 'Which video covers React hooks?')).toBe(true);
      expect(shouldShowCitations('conceptual', 'Show me where you explain this')).toBe(true);
      expect(shouldShowCitations('general', 'Find the timestamp for this topic')).toBe(true);
    });

    it('should not show citations for general questions', () => {
      expect(shouldShowCitations('general', 'What do you think about React?')).toBe(false);
      expect(shouldShowCitations('conceptual', 'How do I learn programming?')).toBe(false);
    });
  });

  describe('Timestamp Formatting', () => {
    const formatTimestamp = (seconds: number | null | undefined): string => {
      if (seconds === null || seconds === undefined || isNaN(seconds) || seconds < 0) return '';
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    it('should format timestamps correctly', () => {
      expect(formatTimestamp(0)).toBe('0:00');
      expect(formatTimestamp(30)).toBe('0:30');
      expect(formatTimestamp(90)).toBe('1:30');
      expect(formatTimestamp(3661)).toBe('61:01');
    });

    it('should handle edge cases', () => {
      expect(formatTimestamp(null)).toBe('');
      expect(formatTimestamp(undefined)).toBe('');
      expect(formatTimestamp(NaN)).toBe('');
      expect(formatTimestamp(-5)).toBe('');
    });

    it('should handle decimal seconds', () => {
      expect(formatTimestamp(90.7)).toBe('1:30');
      expect(formatTimestamp(59.9)).toBe('0:59');
    });
  });

  describe('Timestamp Validation', () => {
    const hasValidTimestamps = (chunk: any): boolean => {
      return (
        chunk.start_time !== null && 
        chunk.end_time !== null && 
        !isNaN(chunk.start_time) &&
        !isNaN(chunk.end_time) &&
        chunk.end_time > chunk.start_time &&
        chunk.start_time >= 0
      );
    };

    it('should validate correct timestamps', () => {
      const chunk = { start_time: 10, end_time: 20 };
      expect(hasValidTimestamps(chunk)).toBe(true);
    });

    it('should reject null timestamps', () => {
      const chunk = { start_time: null, end_time: 20 };
      expect(hasValidTimestamps(chunk)).toBe(false);
    });

    it('should reject invalid time ranges', () => {
      const chunk = { start_time: 20, end_time: 10 };
      expect(hasValidTimestamps(chunk)).toBe(false);
    });

    it('should reject negative timestamps', () => {
      const chunk = { start_time: -5, end_time: 10 };
      expect(hasValidTimestamps(chunk)).toBe(false);
    });

    it('should reject NaN values', () => {
      const chunk = { start_time: NaN, end_time: 10 };
      expect(hasValidTimestamps(chunk)).toBe(false);
    });
  });

  describe('RAG Configuration', () => {
    const RAG_CONFIG = {
      retrieval: {
        general: { matchCount: 10, minThreshold: 0.25, preferredThreshold: 0.35 },
        conceptual: { matchCount: 8, minThreshold: 0.30, preferredThreshold: 0.40 },
        moment: { matchCount: 5, minThreshold: 0.35, preferredThreshold: 0.45 },
        followUp: { matchCount: 8, minThreshold: 0.28, preferredThreshold: 0.38 },
        clarification: { matchCount: 6, minThreshold: 0.32, preferredThreshold: 0.42 },
      },
      minSimilarityForConfidentAnswer: 0.40,
      minSimilarityForAnyAnswer: 0.25,
    };

    it('should have appropriate thresholds for different question types', () => {
      expect(RAG_CONFIG.retrieval.moment.minThreshold).toBeGreaterThan(RAG_CONFIG.retrieval.general.minThreshold);
      expect(RAG_CONFIG.retrieval.conceptual.preferredThreshold).toBeGreaterThan(RAG_CONFIG.retrieval.general.preferredThreshold);
    });

    it('should have consistent threshold ordering', () => {
      Object.values(RAG_CONFIG.retrieval).forEach(config => {
        expect(config.preferredThreshold).toBeGreaterThan(config.minThreshold);
      });
    });

    it('should have reasonable confidence thresholds', () => {
      expect(RAG_CONFIG.minSimilarityForConfidentAnswer).toBeGreaterThan(RAG_CONFIG.minSimilarityForAnyAnswer);
      expect(RAG_CONFIG.minSimilarityForAnyAnswer).toBeGreaterThan(0);
      expect(RAG_CONFIG.minSimilarityForConfidentAnswer).toBeLessThanOrEqual(1);
    });
  });

  describe('Confidence Level Determination', () => {
    const determineConfidence = (maxSimilarity: number): 'high' | 'medium' | 'low' => {
      const minSimilarityForConfidentAnswer = 0.40;
      const minSimilarityForAnyAnswer = 0.25;
      
      if (maxSimilarity >= minSimilarityForConfidentAnswer) return 'high';
      if (maxSimilarity >= minSimilarityForAnyAnswer) return 'medium';
      return 'low';
    };

    it('should determine high confidence correctly', () => {
      expect(determineConfidence(0.45)).toBe('high');
      expect(determineConfidence(0.40)).toBe('high');
    });

    it('should determine medium confidence correctly', () => {
      expect(determineConfidence(0.35)).toBe('medium');
      expect(determineConfidence(0.25)).toBe('medium');
    });

    it('should determine low confidence correctly', () => {
      expect(determineConfidence(0.20)).toBe('low');
      expect(determineConfidence(0.10)).toBe('low');
    });
  });
});
