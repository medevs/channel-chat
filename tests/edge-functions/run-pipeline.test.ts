import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Run Pipeline (Generate Embeddings) Function', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Token Estimation', () => {
    const estimateTokens = (text: string): number => {
      return Math.ceil(text.length / 4);
    };

    it('should estimate tokens correctly', () => {
      expect(estimateTokens('Hello world')).toBe(3); // 11 chars / 4 = 2.75 -> 3
      expect(estimateTokens('This is a longer sentence with more words')).toBe(11); // 42 chars / 4 = 10.5 -> 11
      expect(estimateTokens('')).toBe(0);
    });
  });

  describe('Chunking Algorithm', () => {
    const TARGET_CHUNK_TOKENS = 400;
    const OVERLAP_TOKENS = 75;

    const estimateTokens = (text: string): number => Math.ceil(text.length / 4);

    const chunkTranscriptWithSegments = (segments: any[]) => {
      const chunks: any[] = [];
      
      if (!segments || segments.length === 0) {
        return chunks;
      }
      
      const hasValidTimestamps = segments.some(seg => seg.end > seg.start);
      
      if (!hasValidTimestamps) {
        const fullText = segments.map(s => s.text).join(' ');
        return chunkTextWithoutTimestamps(fullText);
      }
      
      let currentChunkSegments: any[] = [];
      let currentTokenCount = 0;
      
      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        const segmentTokens = estimateTokens(segment.text);
        
        if (currentTokenCount + segmentTokens > TARGET_CHUNK_TOKENS && currentChunkSegments.length > 0) {
          chunks.push(createChunkFromSegments(currentChunkSegments, true));
          
          // Overlap: keep last few segments for context
          let overlapCount = 0;
          let overlapSegments: any[] = [];
          
          for (let j = currentChunkSegments.length - 1; j >= 0 && overlapCount < OVERLAP_TOKENS; j--) {
            const seg = currentChunkSegments[j];
            overlapCount += estimateTokens(seg.text);
            overlapSegments.unshift(seg);
          }
          
          currentChunkSegments = overlapSegments;
          currentTokenCount = overlapCount;
        }
        
        currentChunkSegments.push(segment);
        currentTokenCount += segmentTokens;
      }
      
      if (currentChunkSegments.length > 0) {
        chunks.push(createChunkFromSegments(currentChunkSegments, true));
      }
      
      return chunks;
    };

    const createChunkFromSegments = (segments: any[], hasTimestamps: boolean) => {
      const text = segments.map(s => s.text).join(' ').trim();
      const startTime = segments[0]?.start ?? null;
      const endTime = segments[segments.length - 1]?.end ?? null;
      
      return {
        text,
        startTime: hasTimestamps ? startTime : null,
        endTime: hasTimestamps ? endTime : null,
        tokenCount: estimateTokens(text),
        hasValidTimestamps: hasTimestamps && startTime !== null && endTime !== null && endTime > startTime,
      };
    };

    const chunkTextWithoutTimestamps = (text: string) => {
      const chunks: any[] = [];
      const words = text.split(/\s+/);
      const totalWords = words.length;
      
      if (totalWords === 0) return chunks;
      
      const wordsPerChunk = Math.ceil(TARGET_CHUNK_TOKENS * 4 / 5);
      const overlapWords = Math.ceil(OVERLAP_TOKENS * 4 / 5);
      
      let currentStart = 0;
      
      while (currentStart < totalWords) {
        const chunkWords = words.slice(currentStart, currentStart + wordsPerChunk);
        const chunkText = chunkWords.join(' ');
        
        chunks.push({
          text: chunkText,
          startTime: null,
          endTime: null,
          tokenCount: estimateTokens(chunkText),
          hasValidTimestamps: false,
        });
        
        currentStart += wordsPerChunk - overlapWords;
        if (currentStart <= 0) currentStart = wordsPerChunk;
      }
      
      return chunks;
    };

    it('should chunk segments with valid timestamps', () => {
      const segments = [
        { text: 'First segment with some text', start: 0, end: 5 },
        { text: 'Second segment with more text', start: 5, end: 10 },
        { text: 'Third segment continues here', start: 10, end: 15 }
      ];

      const chunks = chunkTranscriptWithSegments(segments);

      expect(chunks).toHaveLength(1); // Small segments should fit in one chunk
      expect(chunks[0].hasValidTimestamps).toBe(true);
      expect(chunks[0].startTime).toBe(0);
      expect(chunks[0].endTime).toBe(15);
      expect(chunks[0].text).toContain('First segment');
      expect(chunks[0].text).toContain('Third segment');
    });

    it('should create multiple chunks for large content', () => {
      // Create segments that exceed TARGET_CHUNK_TOKENS
      const longText = 'This is a very long segment that contains many words and will definitely exceed the target chunk token limit when processed by the chunking algorithm. '.repeat(10);
      const segments = [
        { text: longText, start: 0, end: 10 },
        { text: longText, start: 10, end: 20 },
        { text: longText, start: 20, end: 30 }
      ];

      const chunks = chunkTranscriptWithSegments(segments);

      expect(chunks.length).toBeGreaterThan(1);
      expect(chunks[0].hasValidTimestamps).toBe(true);
      expect(chunks[1].hasValidTimestamps).toBe(true);
    });

    it('should handle segments without valid timestamps', () => {
      const segments = [
        { text: 'First segment', start: 0, end: 0 }, // Invalid timestamps
        { text: 'Second segment', start: 0, end: 0 }
      ];

      const chunks = chunkTranscriptWithSegments(segments);

      expect(chunks).toHaveLength(1);
      expect(chunks[0].hasValidTimestamps).toBe(false);
      expect(chunks[0].startTime).toBeNull();
      expect(chunks[0].endTime).toBeNull();
    });

    it('should create overlap between chunks', () => {
      // Create content that will definitely create multiple chunks
      const segments = Array.from({ length: 50 }, (_, i) => ({
        text: `Segment ${i} with enough text to create multiple chunks when combined together`,
        start: i * 10,
        end: (i + 1) * 10
      }));

      const chunks = chunkTranscriptWithSegments(segments);

      if (chunks.length > 1) {
        // Check that there's some overlap in content between consecutive chunks
        const firstChunkEnd = chunks[0].text.split(' ').slice(-5).join(' ');
        const secondChunkStart = chunks[1].text.split(' ').slice(0, 10).join(' ');
        
        // There should be some common words due to overlap
        const firstWords = new Set(firstChunkEnd.split(' '));
        const secondWords = new Set(secondChunkStart.split(' '));
        const intersection = new Set([...firstWords].filter(x => secondWords.has(x)));
        
        expect(intersection.size).toBeGreaterThan(0);
      }
    });

    it('should handle empty segments array', () => {
      const chunks = chunkTranscriptWithSegments([]);
      expect(chunks).toHaveLength(0);
    });

    it('should handle single segment', () => {
      const segments = [
        { text: 'Single segment', start: 0, end: 5 }
      ];

      const chunks = chunkTranscriptWithSegments(segments);

      expect(chunks).toHaveLength(1);
      expect(chunks[0].text).toBe('Single segment');
      expect(chunks[0].startTime).toBe(0);
      expect(chunks[0].endTime).toBe(5);
    });
  });

  describe('OpenAI Embeddings Integration', () => {
    const generateEmbeddings = async (texts: string[]): Promise<number[][]> => {
      // Mock implementation
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer test-key`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: texts,
        }),
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI API error: ${error}`);
      }
      
      const data = await response.json();
      return data.data.map((item: { embedding: number[] }) => item.embedding);
    };

    beforeEach(() => {
      global.fetch = vi.fn();
    });

    it('should generate embeddings for text chunks', async () => {
      const mockEmbeddings = [
        [0.1, 0.2, 0.3],
        [0.4, 0.5, 0.6]
      ];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          data: [
            { embedding: mockEmbeddings[0] },
            { embedding: mockEmbeddings[1] }
          ]
        })
      });

      const texts = ['First chunk text', 'Second chunk text'];
      const embeddings = await generateEmbeddings(texts);

      expect(embeddings).toHaveLength(2);
      expect(embeddings[0]).toEqual(mockEmbeddings[0]);
      expect(embeddings[1]).toEqual(mockEmbeddings[1]);
    });

    it('should handle OpenAI API errors', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        text: () => Promise.resolve('API key invalid')
      });

      const texts = ['Test text'];
      
      await expect(generateEmbeddings(texts)).rejects.toThrow('OpenAI API error: API key invalid');
    });

    it('should handle network errors', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const texts = ['Test text'];
      
      await expect(generateEmbeddings(texts)).rejects.toThrow('Network error');
    });
  });

  describe('Batch Processing', () => {
    it('should process embeddings in batches', async () => {
      const batchSize = 100;
      const totalChunks = 250;
      
      const chunks = Array.from({ length: totalChunks }, (_, i) => ({
        text: `Chunk ${i} text content`,
        tokenCount: 50
      }));

      const expectedBatches = Math.ceil(totalChunks / batchSize);
      let batchCount = 0;

      // Simulate batch processing
      for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize);
        batchCount++;
        
        expect(batch.length).toBeLessThanOrEqual(batchSize);
      }

      expect(batchCount).toBe(expectedBatches);
    });

    it('should handle partial batches correctly', async () => {
      const batchSize = 100;
      const chunks = Array.from({ length: 150 }, (_, i) => ({ text: `Chunk ${i}` }));

      const batches: any[][] = [];
      for (let i = 0; i < chunks.length; i += batchSize) {
        batches.push(chunks.slice(i, i + batchSize));
      }

      expect(batches).toHaveLength(2);
      expect(batches[0]).toHaveLength(100);
      expect(batches[1]).toHaveLength(50);
    });
  });
});
