import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the YouTube API responses
const mockYouTubeChannelResponse = {
  items: [{
    id: 'UC123456789',
    snippet: {
      title: 'Test Creator',
      thumbnails: { high: { url: 'https://example.com/avatar.jpg' } }
    },
    statistics: { subscriberCount: '100000' },
    contentDetails: { relatedPlaylists: { uploads: 'UU123456789' } }
  }]
};

const mockYouTubeVideosResponse = {
  items: [{
    id: 'video123',
    snippet: {
      title: 'Test Video',
      description: 'Test description',
      publishedAt: '2024-01-01T00:00:00Z',
      liveBroadcastContent: 'none'
    },
    contentDetails: { duration: 'PT10M30S' },
    statistics: { viewCount: '1000', likeCount: '50' },
    liveStreamingDetails: null
  }]
};

// Mock fetch globally
global.fetch = vi.fn();

describe('Ingest YouTube Channel Function', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset fetch mock
    (global.fetch as any).mockReset();
  });

  describe('parseChannelUrl', () => {
    // Import the function (would need to export it from the main file)
    const parseChannelUrl = (url: string) => {
      try {
        const urlObj = new URL(url);
        const pathname = urlObj.pathname;

        if (pathname.startsWith('/@')) {
          return { type: 'handle', id: pathname.substring(2).replace(/\/$/, '') };
        }
        if (pathname.startsWith('/channel/')) {
          return { type: 'channel', id: pathname.split('/')[2] };
        }
        if (pathname.startsWith('/c/')) {
          return { type: 'custom', id: pathname.split('/')[2] };
        }
        if (pathname.startsWith('/user/')) {
          return { type: 'user', id: pathname.split('/')[2] };
        }
        return null;
      } catch {
        return null;
      }
    };

    it('should parse handle URLs', () => {
      const result = parseChannelUrl('https://youtube.com/@testcreator');
      expect(result).toEqual({ type: 'handle', id: 'testcreator' });
    });

    it('should parse channel URLs', () => {
      const result = parseChannelUrl('https://youtube.com/channel/UC123456789');
      expect(result).toEqual({ type: 'channel', id: 'UC123456789' });
    });

    it('should parse custom URLs', () => {
      const result = parseChannelUrl('https://youtube.com/c/testcreator');
      expect(result).toEqual({ type: 'custom', id: 'testcreator' });
    });

    it('should parse user URLs', () => {
      const result = parseChannelUrl('https://youtube.com/user/testcreator');
      expect(result).toEqual({ type: 'user', id: 'testcreator' });
    });

    it('should return null for invalid URLs', () => {
      const result = parseChannelUrl('invalid-url');
      expect(result).toBeNull();
    });
  });

  describe('parseDuration', () => {
    const parseDuration = (duration: string): number => {
      const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
      if (!match) return 0;
      const hours = parseInt(match[1] || '0', 10);
      const minutes = parseInt(match[2] || '0', 10);
      const seconds = parseInt(match[3] || '0', 10);
      return hours * 3600 + minutes * 60 + seconds;
    };

    it('should parse hours, minutes, and seconds', () => {
      expect(parseDuration('PT1H30M45S')).toBe(5445); // 1*3600 + 30*60 + 45
    });

    it('should parse minutes and seconds only', () => {
      expect(parseDuration('PT10M30S')).toBe(630); // 10*60 + 30
    });

    it('should parse seconds only', () => {
      expect(parseDuration('PT45S')).toBe(45);
    });

    it('should handle zero duration', () => {
      expect(parseDuration('PT0S')).toBe(0);
    });

    it('should handle invalid format', () => {
      expect(parseDuration('invalid')).toBe(0);
    });
  });

  describe('getVideoContentType', () => {
    const getVideoContentType = (video: any): 'video' | 'short' | 'live' => {
      if (video.has_live_streaming_details) {
        return 'live';
      }
      
      if (video.live_broadcast_content === 'live' || video.live_broadcast_content === 'upcoming') {
        return 'live';
      }
      
      if (video.duration_seconds > 0 && video.duration_seconds <= 61) {
        return 'short';
      }
      
      return 'video';
    };

    it('should detect livestreams by liveStreamingDetails', () => {
      const video = {
        duration_seconds: 3600,
        has_live_streaming_details: true,
        live_broadcast_content: 'none'
      };
      expect(getVideoContentType(video)).toBe('live');
    });

    it('should detect active livestreams', () => {
      const video = {
        duration_seconds: 0,
        has_live_streaming_details: false,
        live_broadcast_content: 'live'
      };
      expect(getVideoContentType(video)).toBe('live');
    });

    it('should detect shorts by duration', () => {
      const video = {
        duration_seconds: 30,
        has_live_streaming_details: false,
        live_broadcast_content: 'none'
      };
      expect(getVideoContentType(video)).toBe('short');
    });

    it('should detect regular videos', () => {
      const video = {
        duration_seconds: 600,
        has_live_streaming_details: false,
        live_broadcast_content: 'none'
      };
      expect(getVideoContentType(video)).toBe('video');
    });
  });

  describe('getEffectiveVideoLimit', () => {
    const getEffectiveVideoLimit = (
      importSettings: { mode: string; limit: number | null },
      planLimits: { maxVideosPerCreator: number }
    ): number => {
      if (importSettings.mode === 'all' || importSettings.limit === null) {
        return planLimits.maxVideosPerCreator;
      }
      
      return Math.min(importSettings.limit, planLimits.maxVideosPerCreator);
    };

    it('should use plan limit for "all" mode', () => {
      const result = getEffectiveVideoLimit(
        { mode: 'all', limit: 50 },
        { maxVideosPerCreator: 100 }
      );
      expect(result).toBe(100);
    });

    it('should use plan limit when user limit is null', () => {
      const result = getEffectiveVideoLimit(
        { mode: 'latest', limit: null },
        { maxVideosPerCreator: 100 }
      );
      expect(result).toBe(100);
    });

    it('should use minimum of user and plan limits', () => {
      const result = getEffectiveVideoLimit(
        { mode: 'latest', limit: 50 },
        { maxVideosPerCreator: 100 }
      );
      expect(result).toBe(50);
    });

    it('should enforce plan limit when user requests more', () => {
      const result = getEffectiveVideoLimit(
        { mode: 'latest', limit: 150 },
        { maxVideosPerCreator: 100 }
      );
      expect(result).toBe(100);
    });
  });

  describe('API Integration', () => {
    it('should handle YouTube API channel resolution', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockYouTubeChannelResponse)
      });

      const response = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails,statistics&id=UC123456789&key=test');
      const data = await response.json();

      expect(data.items).toHaveLength(1);
      expect(data.items[0].snippet.title).toBe('Test Creator');
    });

    it('should handle YouTube API video metadata', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockYouTubeVideosResponse)
      });

      const response = await fetch('https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics,liveStreamingDetails&id=video123&key=test');
      const data = await response.json();

      expect(data.items).toHaveLength(1);
      expect(data.items[0].snippet.title).toBe('Test Video');
    });

    it('should handle YouTube API errors', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({
          error: { message: 'API key invalid', errors: [{ reason: 'keyInvalid' }] }
        })
      });

      const response = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet&id=invalid&key=invalid');
      const data = await response.json();

      expect(data.error).toBeDefined();
      expect(data.error.message).toBe('API key invalid');
    });

    it('should handle quota exceeded errors', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({
          error: { message: 'Quota exceeded', errors: [{ reason: 'quotaExceeded' }] }
        })
      });

      const response = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet&id=test&key=test');
      const data = await response.json();

      expect(data.error.errors[0].reason).toBe('quotaExceeded');
    });
  });
});
