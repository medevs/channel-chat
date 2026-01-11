import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';

// Integration tests for the complete edge function pipeline
describe('Edge Functions Integration Tests', () => {
  let supabase: any;
  let testChannelId: string;
  let testVideoId: string;
  let testUserId: string;

  beforeAll(async () => {
    // Initialize Supabase client for testing
    supabase = createClient(
      process.env.VITE_SUPABASE_URL || 'http://localhost:54321',
      process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-key'
    );

    // Create test data
    testUserId = 'test-user-' + Date.now();
    testChannelId = 'UC' + Math.random().toString(36).substring(2, 15);
    testVideoId = 'test-video-' + Date.now();
  });

  afterAll(async () => {
    // Cleanup test data
    if (supabase) {
      await supabase.from('transcript_chunks').delete().eq('channel_id', testChannelId);
      await supabase.from('transcripts').delete().eq('channel_id', testChannelId);
      await supabase.from('videos').delete().eq('channel_id', testChannelId);
      await supabase.from('channels').delete().eq('channel_id', testChannelId);
      await supabase.from('user_creators').delete().eq('user_id', testUserId);
    }
  });

  describe('Complete Ingestion Pipeline', () => {
    it('should complete full pipeline from channel URL to searchable chunks', async () => {
      // Step 1: Ingest YouTube Channel
      const ingestResponse = await fetch('http://localhost:54321/functions/v1/ingest-youtube-channel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          channelUrl: `https://youtube.com/channel/${testChannelId}`,
          userId: testUserId,
          contentTypes: { videos: true, shorts: false, lives: false },
          importSettings: { mode: 'latest', limit: 5 }
        }),
      });

      expect(ingestResponse.ok).toBe(true);
      const ingestData = await ingestResponse.json();
      expect(ingestData.success).toBe(true);
      expect(ingestData.channel).toBeDefined();

      // Verify channel was created
      const { data: channel } = await supabase
        .from('channels')
        .select('*')
        .eq('channel_id', testChannelId)
        .single();

      expect(channel).toBeDefined();
      expect(channel.ingestion_status).toBe('pending');

      // Step 2: Extract Transcripts (simulate with test data)
      await supabase.from('videos').insert({
        video_id: testVideoId,
        channel_id: testChannelId,
        title: 'Test Video',
        description: 'Test description',
        published_at: new Date().toISOString(),
        duration: 'PT10M30S',
        duration_seconds: 630,
        thumbnail_url: 'https://example.com/thumb.jpg',
        view_count: 1000,
        like_count: 50,
        content_type: 'video'
      });

      const extractResponse = await fetch('http://localhost:54321/functions/v1/extract-transcripts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          channelId: testChannelId
        }),
      });

      expect(extractResponse.ok).toBe(true);
      const extractData = await extractResponse.json();
      expect(extractData.success).toBe(true);

      // Step 3: Generate Embeddings
      const pipelineResponse = await fetch('http://localhost:54321/functions/v1/run-pipeline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          channel_id: testChannelId,
          process_all: true
        }),
      });

      expect(pipelineResponse.ok).toBe(true);
      const pipelineData = await pipelineResponse.json();
      expect(pipelineData.success).toBe(true);

      // Verify chunks were created
      const { data: chunks } = await supabase
        .from('transcript_chunks')
        .select('*')
        .eq('channel_id', testChannelId);

      expect(chunks).toBeDefined();
      expect(chunks.length).toBeGreaterThan(0);

      // Step 4: Test RAG Chat
      const chatResponse = await fetch('http://localhost:54321/functions/v1/rag-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          query: 'What topics do you cover?',
          channel_id: testChannelId,
          creator_name: 'Test Creator',
          user_id: testUserId
        }),
      });

      expect(chatResponse.ok).toBe(true);
      const chatData = await chatResponse.json();
      expect(chatData.answer).toBeDefined();
      expect(chatData.confidence).toBeDefined();
    }, 30000); // 30 second timeout for integration test
  });

  describe('Rate Limiting Integration', () => {
    it('should enforce rate limits across functions', async () => {
      const requests = [];
      
      // Make multiple rapid requests to test rate limiting
      for (let i = 0; i < 15; i++) {
        requests.push(
          fetch('http://localhost:54321/functions/v1/rag-chat', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            },
            body: JSON.stringify({
              query: `Test query ${i}`,
              channel_id: testChannelId,
              user_id: testUserId
            }),
          })
        );
      }

      const responses = await Promise.all(requests);
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      
      // Should have some rate limited responses
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle invalid channel URLs gracefully', async () => {
      const response = await fetch('http://localhost:54321/functions/v1/ingest-youtube-channel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          channelUrl: 'invalid-url',
          userId: testUserId
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Invalid YouTube channel URL');
    });

    it('should handle missing required parameters', async () => {
      const response = await fetch('http://localhost:54321/functions/v1/rag-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          // Missing query parameter
          channel_id: testChannelId
        }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Query is required');
    });

    it('should handle database connection errors', async () => {
      // Test with invalid Supabase URL
      const response = await fetch('http://localhost:54321/functions/v1/rag-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer invalid-key',
        },
        body: JSON.stringify({
          query: 'Test query',
          channel_id: testChannelId
        }),
      });

      // Should handle auth errors gracefully
      expect([401, 403, 500]).toContain(response.status);
    });
  });

  describe('Concurrency Control Integration', () => {
    it('should prevent concurrent ingestion of same channel', async () => {
      const requests = [];
      
      // Start multiple ingestion requests for the same channel
      for (let i = 0; i < 3; i++) {
        requests.push(
          fetch('http://localhost:54321/functions/v1/ingest-youtube-channel', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            },
            body: JSON.stringify({
              channelUrl: `https://youtube.com/channel/UC_CONCURRENT_TEST_${Date.now()}`,
              userId: `test-user-${i}`
            }),
          })
        );
      }

      const responses = await Promise.all(requests);
      const concurrencyBlocked = responses.filter(r => r.status === 423);
      
      // Should have some requests blocked due to concurrency control
      expect(concurrencyBlocked.length).toBeGreaterThan(0);
    });
  });

  describe('Data Consistency Integration', () => {
    it('should maintain data consistency across pipeline stages', async () => {
      // Create test channel
      const { data: channel } = await supabase
        .from('channels')
        .insert({
          channel_id: `UC_CONSISTENCY_${Date.now()}`,
          channel_name: 'Consistency Test Channel',
          channel_url: 'https://youtube.com/channel/test',
          avatar_url: 'https://example.com/avatar.jpg',
          subscriber_count: '1000',
          uploads_playlist_id: 'UU123',
          ingestion_status: 'completed',
          indexed_videos: 1,
          total_videos: 1
        })
        .select()
        .single();

      // Create test video
      const { data: video } = await supabase
        .from('videos')
        .insert({
          video_id: `video_consistency_${Date.now()}`,
          channel_id: channel.channel_id,
          title: 'Consistency Test Video',
          description: 'Test description',
          published_at: new Date().toISOString(),
          duration: 'PT5M',
          duration_seconds: 300,
          thumbnail_url: 'https://example.com/thumb.jpg',
          view_count: 500,
          like_count: 25,
          content_type: 'video'
        })
        .select()
        .single();

      // Create test transcript
      const { data: transcript } = await supabase
        .from('transcripts')
        .insert({
          video_id: video.video_id,
          channel_id: channel.channel_id,
          full_text: 'This is a test transcript with multiple segments.',
          segments: [
            { text: 'This is a test transcript', start: 0, end: 3 },
            { text: 'with multiple segments', start: 3, end: 6 }
          ],
          source_type: 'caption',
          extraction_status: 'completed',
          confidence: 0.95
        })
        .select()
        .single();

      // Create test chunks
      await supabase
        .from('transcript_chunks')
        .insert([
          {
            transcript_id: transcript.id,
            video_id: video.video_id,
            channel_id: channel.channel_id,
            chunk_index: 0,
            text: 'This is a test transcript with multiple segments.',
            start_time: 0,
            end_time: 6,
            token_count: 8,
            embedding: JSON.stringify(Array(1536).fill(0.1)),
            embedding_status: 'completed'
          }
        ]);

      // Verify data consistency
      const { data: channelData } = await supabase
        .from('channels')
        .select('*')
        .eq('id', channel.id)
        .single();

      const { data: videoData } = await supabase
        .from('videos')
        .select('*')
        .eq('channel_id', channel.channel_id);

      const { data: transcriptData } = await supabase
        .from('transcripts')
        .select('*')
        .eq('channel_id', channel.channel_id);

      const { data: chunkData } = await supabase
        .from('transcript_chunks')
        .select('*')
        .eq('channel_id', channel.channel_id);

      // Verify relationships
      expect(channelData).toBeDefined();
      expect(videoData).toHaveLength(1);
      expect(transcriptData).toHaveLength(1);
      expect(chunkData).toHaveLength(1);
      expect(videoData[0].channel_id).toBe(channelData.channel_id);
      expect(transcriptData[0].video_id).toBe(videoData[0].video_id);
      expect(chunkData[0].transcript_id).toBe(transcriptData[0].id);

      // Cleanup
      await supabase.from('transcript_chunks').delete().eq('channel_id', channel.channel_id);
      await supabase.from('transcripts').delete().eq('channel_id', channel.channel_id);
      await supabase.from('videos').delete().eq('channel_id', channel.channel_id);
      await supabase.from('channels').delete().eq('channel_id', channel.channel_id);
    });
  });

  describe('Performance Integration', () => {
    it('should complete pipeline within reasonable time limits', async () => {
      const startTime = Date.now();

      // Test a complete small-scale pipeline
      const response = await fetch('http://localhost:54321/functions/v1/rag-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          query: 'Quick test query',
          channel_id: testChannelId,
          user_id: testUserId
        }),
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(response.ok).toBe(true);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});
