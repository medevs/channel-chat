import { beforeAll, afterAll, vi } from 'vitest';

// Test utilities with flexible types for mocking
// deno-lint-ignore-file no-explicit-any
/* eslint-disable @typescript-eslint/no-explicit-any */

// Global test setup
beforeAll(() => {
  // Set up environment variables for testing
  process.env.VITE_SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'http://localhost:54321';
  process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-role-key';
  process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'test-openai-key';
  process.env.YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || 'test-youtube-key';
  process.env.TRANSCRIPT_API_KEY = process.env.TRANSCRIPT_API_KEY || 'test-transcript-key';

  // Mock console methods to reduce noise in tests
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'info').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  
  // Don't mock console.error as we want to see actual errors
});

afterAll(() => {
  // Restore console methods
  vi.restoreAllMocks();
});

// Global fetch mock setup
global.fetch = vi.fn();

// Mock crypto.randomUUID for consistent testing
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => 'test-uuid-' + Math.random().toString(36).substring(2, 15)
  }
});

// Mock setTimeout and setInterval for testing
vi.mock('timers', () => ({
  setTimeout: vi.fn((fn, delay) => {
    return setTimeout(fn, Math.min(delay, 100)); // Cap delays at 100ms for faster tests
  }),
  setInterval: vi.fn(),
  clearTimeout: vi.fn(),
  clearInterval: vi.fn()
}));

// Helper function to create mock Supabase responses
export const createMockSupabaseResponse = (data: any, error: any = null) => ({
  data,
  error,
  status: error ? 400 : 200,
  statusText: error ? 'Bad Request' : 'OK'
});

// Helper function to create mock fetch responses
export const createMockFetchResponse = (data: any, status: number = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  statusText: status === 200 ? 'OK' : 'Error',
  json: () => Promise.resolve(data),
  text: () => Promise.resolve(JSON.stringify(data)),
  headers: new Map([['content-type', 'application/json']])
});

// Test utilities
export const testUtils = {
  // Generate test IDs
  generateTestId: (prefix: string = 'test') => `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
  
  // Wait for async operations
  wait: (ms: number = 100) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Create test channel data
  createTestChannel: (overrides: any = {}) => ({
    channel_id: testUtils.generateTestId('UC'),
    channel_name: 'Test Creator',
    channel_url: 'https://youtube.com/channel/test',
    avatar_url: 'https://example.com/avatar.jpg',
    subscriber_count: '1000',
    uploads_playlist_id: 'UU123',
    ingestion_status: 'completed',
    indexed_videos: 1,
    total_videos: 1,
    ...overrides
  }),
  
  // Create test video data
  createTestVideo: (channelId: string, overrides: any = {}) => ({
    video_id: testUtils.generateTestId('video'),
    channel_id: channelId,
    title: 'Test Video',
    description: 'Test description',
    published_at: new Date().toISOString(),
    duration: 'PT10M',
    duration_seconds: 600,
    thumbnail_url: 'https://example.com/thumb.jpg',
    view_count: 1000,
    like_count: 50,
    content_type: 'video',
    ...overrides
  }),
  
  // Create test transcript data
  createTestTranscript: (videoId: string, channelId: string, overrides: any = {}) => ({
    video_id: videoId,
    channel_id: channelId,
    full_text: 'This is a test transcript with sample content.',
    segments: [
      { text: 'This is a test transcript', start: 0, end: 3 },
      { text: 'with sample content', start: 3, end: 6 }
    ],
    source_type: 'caption',
    extraction_status: 'completed',
    confidence: 0.95,
    ...overrides
  }),
  
  // Create test chunk data
  createTestChunk: (transcriptId: string, videoId: string, channelId: string, overrides: any = {}) => ({
    transcript_id: transcriptId,
    video_id: videoId,
    channel_id: channelId,
    chunk_index: 0,
    text: 'This is a test transcript with sample content.',
    start_time: 0,
    end_time: 6,
    token_count: 8,
    embedding: JSON.stringify(Array(1536).fill(0.5)),
    embedding_status: 'completed',
    ...overrides
  })
};

// Export for use in tests
export { vi };
