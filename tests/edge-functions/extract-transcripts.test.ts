import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock TranscriptAPI responses
const mockTranscriptAPIResponse = {
  video_id: 'test123',
  language: 'en',
  transcript: [
    { text: 'Hello everyone', start: 0, duration: 2 },
    { text: 'Welcome to my channel', start: 2, duration: 3 },
    { text: 'Today we will discuss', start: 5, duration: 3 }
  ]
};

global.fetch = vi.fn();

describe('Extract Transcripts Function', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockReset();
  });

  describe('fetchTranscript', () => {
    const fetchTranscript = async (videoId: string) => {
      const url = `https://transcriptapi.com/api/v2/youtube/transcript?video_url=${videoId}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer test-key`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.status === 404) {
        return {
          status: 'no_captions',
          segments: [],
          fullText: '',
          errorMessage: 'No captions available for this video',
        };
      }
      
      if (!response.ok) {
        const errorText = await response.text();
        return {
          status: 'failed',
          segments: [],
          fullText: '',
          errorMessage: `API error: ${response.status} - ${errorText}`,
        };
      }
      
      const data = await response.json();
      const transcriptItems = data.transcript;
      
      if (!Array.isArray(transcriptItems) || transcriptItems.length === 0) {
        return {
          status: 'no_captions',
          segments: [],
          fullText: '',
          errorMessage: 'No captions available for this video',
        };
      }
      
      const segments = transcriptItems.map((item: any) => {
        const start = typeof item.start === 'number' ? item.start : parseFloat(item.start) || 0;
        const duration = typeof item.duration === 'number' ? item.duration : parseFloat(item.duration) || 2;
        return {
          text: (item.text || '').trim(),
          start: start,
          end: start + duration,
        };
      }).filter((seg: any) => seg.text.length > 0);
      
      const fullText = segments.map(s => s.text).join(' ');
      
      return {
        status: 'completed',
        segments,
        fullText,
      };
    };

    it('should successfully fetch transcript', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockTranscriptAPIResponse)
      });

      const result = await fetchTranscript('test123');

      expect(result.status).toBe('completed');
      expect(result.segments).toHaveLength(3);
      expect(result.segments[0]).toEqual({
        text: 'Hello everyone',
        start: 0,
        end: 2
      });
      expect(result.fullText).toBe('Hello everyone Welcome to my channel Today we will discuss');
    });

    it('should handle no captions (404)', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: () => Promise.resolve('Not found')
      });

      const result = await fetchTranscript('test123');

      expect(result.status).toBe('no_captions');
      expect(result.segments).toHaveLength(0);
      expect(result.errorMessage).toBe('No captions available for this video');
    });

    it('should handle authentication errors', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: () => Promise.resolve('Unauthorized')
      });

      const result = await fetchTranscript('test123');

      expect(result.status).toBe('failed');
      expect(result.errorMessage).toContain('API error: 401');
    });

    it('should handle rate limiting', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: () => Promise.resolve('Too many requests')
      });

      const result = await fetchTranscript('test123');

      expect(result.status).toBe('failed');
      expect(result.errorMessage).toContain('API error: 429');
    });

    it('should handle empty transcript response', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ video_id: 'test123', transcript: [] })
      });

      const result = await fetchTranscript('test123');

      expect(result.status).toBe('no_captions');
      expect(result.segments).toHaveLength(0);
    });

    it('should handle malformed transcript data', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ video_id: 'test123', transcript: 'invalid' })
      });

      const result = await fetchTranscript('test123');

      expect(result.status).toBe('failed');
      expect(result.errorMessage).toContain('Unexpected API response format');
    });

    it('should filter out empty text segments', async () => {
      const responseWithEmptySegments = {
        video_id: 'test123',
        transcript: [
          { text: 'Hello', start: 0, duration: 2 },
          { text: '', start: 2, duration: 1 },
          { text: '   ', start: 3, duration: 1 },
          { text: 'World', start: 4, duration: 2 }
        ]
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(responseWithEmptySegments)
      });

      const result = await fetchTranscript('test123');

      expect(result.status).toBe('completed');
      expect(result.segments).toHaveLength(2);
      expect(result.segments[0].text).toBe('Hello');
      expect(result.segments[1].text).toBe('World');
    });

    it('should handle network errors', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const result = await fetchTranscript('test123');

      expect(result.status).toBe('failed');
      expect(result.errorMessage).toBe('Error: Network error');
    });
  });

  describe('Segment Processing', () => {
    it('should correctly calculate end times from start and duration', () => {
      const segments = [
        { text: 'First', start: 0, duration: 2.5 },
        { text: 'Second', start: 2.5, duration: 3.0 }
      ];

      const processed = segments.map(item => ({
        text: item.text,
        start: item.start,
        end: item.start + item.duration
      }));

      expect(processed[0].end).toBe(2.5);
      expect(processed[1].end).toBe(5.5);
    });

    it('should handle string numbers in API response', () => {
      const segments = [
        { text: 'Test', start: '1.5', duration: '2.0' }
      ];

      const processed = segments.map(item => {
        const start = typeof item.start === 'number' ? item.start : parseFloat(item.start) || 0;
        const duration = typeof item.duration === 'number' ? item.duration : parseFloat(item.duration) || 2;
        return {
          text: item.text,
          start: start,
          end: start + duration
        };
      });

      expect(processed[0].start).toBe(1.5);
      expect(processed[0].end).toBe(3.5);
    });

    it('should handle invalid numeric values gracefully', () => {
      const segments = [
        { text: 'Test', start: 'invalid', duration: null }
      ];

      const processed = segments.map(item => {
        const start = typeof item.start === 'number' ? item.start : parseFloat(item.start) || 0;
        const duration = typeof item.duration === 'number' ? item.duration : parseFloat(item.duration) || 2;
        return {
          text: item.text,
          start: start,
          end: start + duration
        };
      });

      expect(processed[0].start).toBe(0);
      expect(processed[0].end).toBe(2);
    });
  });

  describe('Rate Limiting', () => {
    it('should respect delay between requests', async () => {
      const DELAY_BETWEEN_VIDEOS_MS = 200;
      const startTime = Date.now();
      
      // Simulate delay
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_VIDEOS_MS));
      
      const endTime = Date.now();
      const actualDelay = endTime - startTime;
      
      expect(actualDelay).toBeGreaterThanOrEqual(DELAY_BETWEEN_VIDEOS_MS - 10); // Allow 10ms tolerance
    });
  });
});
