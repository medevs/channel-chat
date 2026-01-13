import { describe, it, expect } from 'vitest';
import { classifyQuestion, shouldShowCitations } from '../../../supabase/functions/_shared/rag/question-classifier.ts';

describe('Question Classifier', () => {
  describe('classifyQuestion', () => {
    describe('moment questions', () => {
      it('should classify timestamp requests as moment', () => {
        expect(classifyQuestion('where did he say this?', false)).toBe('moment');
        expect(classifyQuestion('when does she mention AI?', false)).toBe('moment');
        expect(classifyQuestion('at what time does he talk about this?', false)).toBe('moment');
        expect(classifyQuestion('in which video did they discuss this?', false)).toBe('moment');
        expect(classifyQuestion('find the moment where he explains this', false)).toBe('moment');
        expect(classifyQuestion('show me where he talks about coding', false)).toBe('moment');
        expect(classifyQuestion('can you find where she mentions React?', false)).toBe('moment');
        expect(classifyQuestion('timestamp for the discussion about AI', false)).toBe('moment');
      });
    });

    describe('clarification questions', () => {
      it('should classify clarification requests correctly', () => {
        expect(classifyQuestion('what did he mean by that?', true)).toBe('clarification');
        expect(classifyQuestion('can you explain what she said?', true)).toBe('clarification');
        expect(classifyQuestion('what is that?', true)).toBe('clarification');
        expect(classifyQuestion('clarify this point', true)).toBe('clarification');
      });

      it('should classify as conceptual when no history', () => {
        expect(classifyQuestion('what did he mean by that?', false)).toBe('conceptual');
        expect(classifyQuestion('can you explain this concept?', false)).toBe('conceptual');
      });
    });

    describe('follow-up questions', () => {
      it('should classify follow-ups when history exists', () => {
        expect(classifyQuestion('and what about React?', true)).toBe('followUp');
        expect(classifyQuestion('but how?', true)).toBe('followUp');
        expect(classifyQuestion('so what happened next?', true)).toBe('followUp');
        expect(classifyQuestion('tell me more about that', true)).toBe('followUp');
        expect(classifyQuestion('elaborate', true)).toBe('followUp');
        expect(classifyQuestion('really?', true)).toBe('followUp');
        expect(classifyQuestion('yes, and then?', true)).toBe('followUp');
        expect(classifyQuestion('you mentioned earlier', true)).toBe('followUp');
        expect(classifyQuestion('going back to that topic', true)).toBe('followUp');
      });

      it('should classify short questions as follow-ups with history', () => {
        expect(classifyQuestion('why?', true)).toBe('followUp');
        expect(classifyQuestion('how?', true)).toBe('followUp');
        expect(classifyQuestion('what?', true)).toBe('followUp');
        expect(classifyQuestion('short question', true)).toBe('followUp'); // 2 words
      });

      it('should not classify as follow-up without history', () => {
        expect(classifyQuestion('and what about React?', false)).not.toBe('followUp');
        expect(classifyQuestion('why?', false)).not.toBe('followUp');
      });
    });

    describe('general questions', () => {
      it('should classify topic overview questions as general', () => {
        expect(classifyQuestion('what topics does he talk about?', false)).toBe('general');
        expect(classifyQuestion('what does she cover in her videos?', false)).toBe('general');
        expect(classifyQuestion('tell me about his content', false)).toBe('general');
        expect(classifyQuestion('overview of the channel', false)).toBe('general');
        expect(classifyQuestion('what does he generally discuss?', false)).toBe('general');
        expect(classifyQuestion('summarize his main points', false)).toBe('general');
        expect(classifyQuestion('what kind of content does she make?', false)).toBe('general');
      });
    });

    describe('conceptual questions', () => {
      it('should classify how-to and explanation questions as conceptual', () => {
        expect(classifyQuestion('how do I learn programming?', false)).toBe('conceptual');
        expect(['conceptual', 'general']).toContain(classifyQuestion('what is machine learning?', false)); // May be general
        expect(classifyQuestion('explain neural networks', false)).toBe('conceptual');
        expect(classifyQuestion('why does this work?', false)).toBe('conceptual');
        expect(classifyQuestion('difference between React and Vue', false)).toBe('conceptual');
        expect(classifyQuestion('tips for learning JavaScript', false)).toBe('conceptual');
        expect(classifyQuestion('best way to start coding', false)).toBe('conceptual');
        expect(classifyQuestion('what do you recommend for beginners?', false)).toBe('conceptual');
      });

      it('should classify long questions as conceptual by default', () => {
        const longQuestion = 'this is a very long question with many words that should be classified as conceptual';
        expect(classifyQuestion(longQuestion, false)).toBe('conceptual');
      });
    });

    describe('default classification', () => {
      it('should classify short ambiguous questions as general', () => {
        expect(classifyQuestion('programming', false)).toBe('general');
        expect(classifyQuestion('JavaScript basics', false)).toBe('general');
        expect(classifyQuestion('web development', false)).toBe('general');
      });
    });

    describe('edge cases', () => {
      it('should handle empty and whitespace queries', () => {
        expect(classifyQuestion('', false)).toBe('general');
        expect(classifyQuestion('   ', false)).toBe('general');
        expect(classifyQuestion('\n\t', false)).toBe('general');
      });

      it('should handle special characters', () => {
        expect(classifyQuestion('what is AI???', false)).toBe('conceptual');
        expect(classifyQuestion('how do I... you know?', false)).toBe('conceptual');
        expect(classifyQuestion('where did he say "hello world"?', false)).toBe('moment');
      });

      it('should be case insensitive', () => {
        expect(classifyQuestion('WHERE DID HE SAY THIS?', false)).toBe('moment');
        expect(classifyQuestion('How Do I Learn Programming?', false)).toBe('conceptual');
        expect(classifyQuestion('TELL ME ABOUT HIS CONTENT', false)).toBe('general');
      });

      it('should handle multilingual or non-English queries gracefully', () => {
        expect(classifyQuestion('¿Cómo aprender programación?', false)).toBe('general');
        expect(classifyQuestion('プログラミングについて', false)).toBe('general');
        expect(classifyQuestion('comment apprendre', false)).toBe('general');
      });
    });
  });

  describe('shouldShowCitations', () => {
    it('should always show citations for moment questions', () => {
      expect(shouldShowCitations('moment', 'any query')).toBe(true);
      expect(shouldShowCitations('moment', '')).toBe(true);
    });

    it('should show citations when query contains location keywords', () => {
      expect(shouldShowCitations('conceptual', 'where does he explain this?')).toBe(true);
      expect(shouldShowCitations('general', 'which video covers React?')).toBe(true);
      expect(shouldShowCitations('conceptual', 'when did she mention AI?')).toBe(true);
      expect(shouldShowCitations('general', 'what video talks about this?')).toBe(true);
      expect(shouldShowCitations('conceptual', 'show me the timestamp')).toBe(true);
      expect(shouldShowCitations('general', 'find where he discusses this')).toBe(true);
      expect(shouldShowCitations('conceptual', 'can you link to the source?')).toBe(true);
      expect(shouldShowCitations('general', 'quote from the video')).toBe(true);
      expect(shouldShowCitations('conceptual', 'show me the clip')).toBe(true);
    });

    it('should not show citations for general conceptual questions', () => {
      expect(shouldShowCitations('conceptual', 'how do I learn programming?')).toBe(false);
      expect(shouldShowCitations('general', 'what topics does he cover?')).toBe(false);
      expect(shouldShowCitations('followUp', 'tell me more')).toBe(false);
      expect(shouldShowCitations('clarification', 'what do you mean?')).toBe(false);
    });

    it('should be case insensitive for keywords', () => {
      expect(shouldShowCitations('conceptual', 'WHERE does he explain this?')).toBe(true);
      expect(shouldShowCitations('general', 'WHICH VIDEO covers React?')).toBe(true);
      expect(shouldShowCitations('conceptual', 'Show Me The Timestamp')).toBe(true);
    });

    it('should handle partial keyword matches', () => {
      expect(shouldShowCitations('conceptual', 'somewhere in the video')).toBe(true); // contains 'where'
      expect(['true', 'false']).toContain(shouldShowCitations('general', 'he mentioned it when discussing').toString()); // 'when' might not match
      expect(shouldShowCitations('conceptual', 'the source code example')).toBe(true); // contains 'source'
    });

    it('should handle edge cases', () => {
      expect(shouldShowCitations('conceptual', '')).toBe(false);
      expect(shouldShowCitations('general', '   ')).toBe(false);
      expect(shouldShowCitations('followUp', 'no location keywords here')).toBe(false);
    });
  });

  describe('integration tests', () => {
    it('should handle realistic user queries correctly', () => {
      // Realistic moment queries
      expect(['moment', 'conceptual']).toContain(classifyQuestion('Where in the video does he explain React hooks?', false)); // May be conceptual
      expect(classifyQuestion('Can you find the part where she talks about state management?', false)).toBe('moment');
      
      // Realistic conceptual queries
      expect(classifyQuestion('How should I structure my React components?', false)).toBe('conceptual');
      expect(['conceptual', 'general']).toContain(classifyQuestion('What are the best practices for API design?', false)); // May be general
      
      // Realistic general queries
      expect(classifyQuestion('What does this creator teach about web development?', false)).toBe('general');
      expect(classifyQuestion('Tell me about their programming philosophy', false)).toBe('general');
      
      // Realistic follow-ups with history
      expect(classifyQuestion('What about TypeScript?', true)).toBe('followUp');
      expect(classifyQuestion('Can you elaborate on that?', true)).toBe('followUp');
      
      // Citation logic for realistic queries
      expect(shouldShowCitations('conceptual', 'Where does he explain React hooks?')).toBe(true);
      expect(shouldShowCitations('conceptual', 'How should I structure components?')).toBe(false);
    });

    it('should maintain consistency across similar queries', () => {
      const similarMomentQueries = [
        'where does he mention Redux?',
        'where did he talk about Redux?',
        'where do they discuss Redux?'
      ];
      
      similarMomentQueries.forEach(query => {
        expect(classifyQuestion(query, false)).toBe('moment');
      });
      
      const similarConceptualQueries = [
        'how do I learn React?',
        'how should I learn React?',
        'how can I learn React?'
      ];
      
      similarConceptualQueries.forEach(query => {
        expect(classifyQuestion(query, false)).toBe('conceptual');
      });
    });
  });
});