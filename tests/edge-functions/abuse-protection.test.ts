import { describe, it, expect, beforeEach } from 'vitest';
import {
  createLogger,
  checkRateLimit,
  generateRequestHash,
  validateRequest,
  createErrorResponse,
  ErrorCodes,
} from '../../supabase/functions/_shared/abuse-protection.ts';

describe('Abuse Protection Utilities', () => {
  beforeEach(() => {
    // Clear rate limit cache between tests
    const rateLimitCache = new Map();
  });

  describe('createLogger', () => {
    it('should create logger with function name and request ID', () => {
      const logger = createLogger('test-function', 'req-123');
      expect(logger).toHaveProperty('info');
      expect(logger).toHaveProperty('error');
      expect(logger).toHaveProperty('warn');
      expect(logger).toHaveProperty('debug');
    });

    it('should log messages with proper structure', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const logger = createLogger('test-function', 'req-123');
      
      logger.info('Test message', { key: 'value' });
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('"function":"test-function"')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('"requestId":"req-123"')
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('checkRateLimit', () => {
    it('should allow requests within limit', () => {
      const result = checkRateLimit('test-key', 10, 1);
      
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9);
      expect(result.resetAt).toBeInstanceOf(Date);
    });

    it('should block requests exceeding limit', () => {
      // Make requests up to limit
      for (let i = 0; i < 10; i++) {
        checkRateLimit('test-key-2', 10, 1);
      }
      
      const result = checkRateLimit('test-key-2', 10, 1);
      
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should reset after window expires', () => {
      // Mock Date.now to simulate time passage
      const originalNow = Date.now;
      let mockTime = 1000000;
      Date.now = () => mockTime;

      // Fill up the limit
      for (let i = 0; i < 5; i++) {
        checkRateLimit('test-key-3', 5, 1);
      }
      
      // Should be blocked
      let result = checkRateLimit('test-key-3', 5, 1);
      expect(result.allowed).toBe(false);
      
      // Advance time past window (1 minute = 60000ms)
      mockTime += 61000;
      
      // Should be allowed again
      result = checkRateLimit('test-key-3', 5, 1);
      expect(result.allowed).toBe(true);
      
      Date.now = originalNow;
    });
  });

  describe('generateRequestHash', () => {
    it('should generate consistent hash for same data', () => {
      const data = { channelUrl: 'test', userId: '123' };
      const hash1 = generateRequestHash(data);
      const hash2 = generateRequestHash(data);
      
      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[0-9a-f]+$/);
    });

    it('should generate different hashes for different data', () => {
      const data1 = { channelUrl: 'test1', userId: '123' };
      const data2 = { channelUrl: 'test2', userId: '123' };
      
      const hash1 = generateRequestHash(data1);
      const hash2 = generateRequestHash(data2);
      
      expect(hash1).not.toBe(hash2);
    });

    it('should handle key order independence', () => {
      const data1 = { a: '1', b: '2' };
      const data2 = { b: '2', a: '1' };
      
      const hash1 = generateRequestHash(data1);
      const hash2 = generateRequestHash(data2);
      
      expect(hash1).toBe(hash2);
    });
  });

  describe('validateRequest', () => {
    it('should validate required fields', () => {
      const body = { channelUrl: 'test', userId: '123' };
      const required = ['channelUrl', 'userId'];
      
      const result = validateRequest(body, required);
      
      expect(result.valid).toBe(true);
      expect(result.missingFields).toEqual([]);
    });

    it('should detect missing fields', () => {
      const body = { channelUrl: 'test' };
      const required = ['channelUrl', 'userId'];
      
      const result = validateRequest(body, required);
      
      expect(result.valid).toBe(false);
      expect(result.missingFields).toEqual(['userId']);
    });

    it('should handle empty and null values', () => {
      const body = { channelUrl: '', userId: null, other: undefined };
      const required = ['channelUrl', 'userId', 'other'];
      
      const result = validateRequest(body, required);
      
      expect(result.valid).toBe(false);
      expect(result.missingFields).toEqual(['channelUrl', 'userId', 'other']);
    });
  });

  describe('createErrorResponse', () => {
    it('should create structured error response', () => {
      const response = createErrorResponse(
        'Test error',
        ErrorCodes.RATE_LIMITED,
        429,
        { detail: 'test' },
        true,
        5000
      );
      
      expect(response).toBeInstanceOf(Response);
      expect(response.status).toBe(429);
      
      // Check headers
      const headers = Object.fromEntries(response.headers.entries());
      expect(headers['content-type']).toBe('application/json');
      expect(headers['retry-after']).toBe('5');
    });

    it('should handle response without retry', () => {
      const response = createErrorResponse(
        'Test error',
        ErrorCodes.INVALID_REQUEST,
        400
      );
      
      expect(response.status).toBe(400);
      
      const headers = Object.fromEntries(response.headers.entries());
      expect(headers['retry-after']).toBeUndefined();
    });
  });
});
