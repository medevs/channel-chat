import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

// End-to-end tests that simulate real user workflows
describe('End-to-End User Workflows', () => {
  let supabase: any;
  let testUserId: string;
  let testChannelId: string;

  beforeAll(async () => {
    supabase = createClient(
      process.env.VITE_SUPABASE_URL || 'http://localhost:54321',
      process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-key'
    );

    testUserId = 'e2e-user-' + Date.now();
    testChannelId = 'UC' + Math.random().toString(36).substring(2, 15);
  });

  afterAll(async () => {
    // Cleanup all test data
    if (supabase) {
      await supabase.from('transcript_chunks').delete().eq('channel_id', testChannelId);
      await supabase.from('transcripts').delete().eq('channel_id', testChannelId);
      await supabase.from('videos').delete().eq('channel_id', testChannelId);
      await supabase.from('user_creators').delete().eq('user_id', testUserId);
      await supabase.from('channels').delete().eq('channel_id', testChannelId);
    }
  });

  describe('New User Onboarding Flow', () => {
    it('should complete full user journey from channel addition to chat', async () => {
      // Step 1: User adds their first creator
      const addCreatorResponse = await fetch('http://localhost:54321/functions/v1/ingest-youtube-channel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          channelUrl: `https://youtube.com/@testcreator${Date.now()}`,
          userId: testUserId,
          contentTypes: { videos: true, shorts: false, lives: false },
          importSettings: { mode: 'latest', limit: 5 }
        }),
      });

      expect(addCreatorResponse.ok).toBe(true);
      const creatorData = await addCreatorResponse.json();
      expect(creatorData.success).toBe(true);
      expect(creatorData.channel).toBeDefined();

      // Step 2: Verify user-creator relationship was created
      const { data: userCreators } = await supabase
        .from('user_creators')
        .select('*')
        .eq('user_id', testUserId);

      expect(userCreators).toHaveLength(1);

      // Step 3: Simulate transcript extraction completion
      await supabase.from('videos').insert({
        video_id: `e2e-video-${Date.now()}`,
        channel_id: creatorData.channel.channel_id,
        title: 'E2E Test Video',
        description: 'End-to-end test video',
        published_at: new Date().toISOString(),
        duration: 'PT8M45S',
        duration_seconds: 525,
        thumbnail_url: 'https://example.com/thumb.jpg',
        view_count: 2000,
        like_count: 100,
        content_type: 'video'
      });

      await supabase.from('transcripts').insert({
        video_id: `e2e-video-${Date.now()}`,
        channel_id: creatorData.channel.channel_id,
        full_text: 'Welcome to my channel. Today I will teach you about React hooks and state management.',
        segments: [
          { text: 'Welcome to my channel', start: 0, end: 3 },
          { text: 'Today I will teach you about React hooks', start: 3, end: 8 },
          { text: 'and state management', start: 8, end: 12 }
        ],
        source_type: 'caption',
        extraction_status: 'completed',
        confidence: 0.95
      });

      // Step 4: Generate embeddings
      const pipelineResponse = await fetch('http://localhost:54321/functions/v1/run-pipeline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          channel_id: creatorData.channel.channel_id,
          process_all: true
        }),
      });

      expect(pipelineResponse.ok).toBe(true);

      // Step 5: User starts chatting
      const chatResponse = await fetch('http://localhost:54321/functions/v1/rag-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          query: 'What do you teach about React?',
          channel_id: creatorData.channel.channel_id,
          creator_name: 'Test Creator',
          user_id: testUserId,
          conversation_history: []
        }),
      });

      expect(chatResponse.ok).toBe(true);
      const chatData = await chatResponse.json();
      expect(chatData.answer).toBeDefined();
      expect(chatData.answer.toLowerCase()).toContain('react');
      expect(chatData.confidence).toBeDefined();
    }, 45000);
  });

  describe('Multi-Turn Conversation Flow', () => {
    it('should handle follow-up questions with context', async () => {
      // Setup: Create channel with content
      const { data: channel } = await supabase
        .from('channels')
        .insert({
          channel_id: `UC_CONVERSATION_${Date.now()}`,
          channel_name: 'Conversation Test Creator',
          channel_url: 'https://youtube.com/channel/test',
          avatar_url: 'https://example.com/avatar.jpg',
          subscriber_count: '5000',
          uploads_playlist_id: 'UU123',
          ingestion_status: 'completed',
          indexed_videos: 2,
          total_videos: 2
        })
        .select()
        .single();

      await supabase.from('transcript_chunks').insert([
        {
          transcript_id: 'transcript-1',
          video_id: 'video-1',
          channel_id: channel.channel_id,
          chunk_index: 0,
          text: 'React hooks are a powerful feature that allows you to use state and lifecycle methods in functional components. The most commonly used hooks are useState and useEffect.',
          start_time: 0,
          end_time: 10,
          token_count: 25,
          embedding: JSON.stringify(Array(1536).fill(0.8)),
          embedding_status: 'completed'
        },
        {
          transcript_id: 'transcript-2',
          video_id: 'video-2',
          channel_id: channel.channel_id,
          chunk_index: 0,
          text: 'Performance optimization in React involves using React.memo, useMemo, and useCallback to prevent unnecessary re-renders.',
          start_time: 15,
          end_time: 25,
          token_count: 20,
          embedding: JSON.stringify(Array(1536).fill(0.7)),
          embedding_status: 'completed'
        }
      ]);

      // First question
      const firstResponse = await fetch('http://localhost:54321/functions/v1/rag-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          query: 'What are React hooks?',
          channel_id: channel.channel_id,
          creator_name: 'Test Creator',
          user_id: testUserId,
          conversation_history: []
        }),
      });

      expect(firstResponse.ok).toBe(true);
      const firstData = await firstResponse.json();
      expect(firstData.answer).toContain('hooks');

      // Follow-up question
      const followUpResponse = await fetch('http://localhost:54321/functions/v1/rag-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          query: 'What about performance?',
          channel_id: channel.channel_id,
          creator_name: 'Test Creator',
          user_id: testUserId,
          conversation_history: [
            { role: 'user', content: 'What are React hooks?' },
            { role: 'assistant', content: firstData.answer }
          ]
        }),
      });

      expect(followUpResponse.ok).toBe(true);
      const followUpData = await followUpResponse.json();
      expect(followUpData.answer).toContain('performance');

      // Cleanup
      await supabase.from('transcript_chunks').delete().eq('channel_id', channel.channel_id);
      await supabase.from('channels').delete().eq('channel_id', channel.channel_id);
    });
  });

  describe('Error Recovery Flow', () => {
    it('should gracefully handle and recover from various error scenarios', async () => {
      // Test 1: Invalid channel URL
      const invalidUrlResponse = await fetch('http://localhost:54321/functions/v1/ingest-youtube-channel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          channelUrl: 'not-a-valid-url',
          userId: testUserId
        }),
      });

      expect(invalidUrlResponse.status).toBe(400);
      const errorData = await invalidUrlResponse.json();
      expect(errorData.error).toContain('Invalid YouTube channel URL');

      // Test 2: Chat without indexed content
      const noContentResponse = await fetch('http://localhost:54321/functions/v1/rag-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          query: 'Tell me about your content',
          channel_id: 'nonexistent-channel',
          user_id: testUserId
        }),
      });

      expect(noContentResponse.ok).toBe(true);
      const noContentData = await noContentResponse.json();
      expect(noContentData.answer).toContain('not been fully indexed');

      // Test 3: Rate limit recovery
      const rateLimitRequests = [];
      for (let i = 0; i < 20; i++) {
        rateLimitRequests.push(
          fetch('http://localhost:54321/functions/v1/rag-chat', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            },
            body: JSON.stringify({
              query: `Rate limit test ${i}`,
              channel_id: testChannelId,
              user_id: `rate-limit-user-${i}`
            }),
          })
        );
      }

      const rateLimitResponses = await Promise.all(rateLimitRequests);
      const rateLimited = rateLimitResponses.filter(r => r.status === 429);
      const successful = rateLimitResponses.filter(r => r.ok);

      expect(rateLimited.length).toBeGreaterThan(0);
      expect(successful.length).toBeGreaterThan(0);

      // Verify rate limit responses include retry information
      if (rateLimited.length > 0) {
        const rateLimitData = await rateLimited[0].json();
        expect(rateLimitData.retryable).toBe(true);
        expect(rateLimitData.retryAfterMs).toBeGreaterThan(0);
      }
    });
  });

  describe('Public Mode Flow', () => {
    it('should handle public (unauthenticated) users correctly', async () => {
      // Setup: Create public channel
      const { data: publicChannel } = await supabase
        .from('channels')
        .insert({
          channel_id: `UC_PUBLIC_${Date.now()}`,
          channel_name: 'Public Test Creator',
          channel_url: 'https://youtube.com/channel/public',
          avatar_url: 'https://example.com/avatar.jpg',
          subscriber_count: '10000',
          uploads_playlist_id: 'UU456',
          ingestion_status: 'completed',
          indexed_videos: 1,
          total_videos: 1,
          public_slug: 'public-test-creator'
        })
        .select()
        .single();

      await supabase.from('transcript_chunks').insert({
        transcript_id: 'public-transcript-1',
        video_id: 'public-video-1',
        channel_id: publicChannel.channel_id,
        chunk_index: 0,
        text: 'This is public content that anyone can access without authentication.',
        start_time: 0,
        end_time: 5,
        token_count: 12,
        embedding: JSON.stringify(Array(1536).fill(0.6)),
        embedding_status: 'completed'
      });

      // Test public chat
      const publicChatResponse = await fetch('http://localhost:54321/functions/v1/rag-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          query: 'What content do you have?',
          channel_id: publicChannel.channel_id,
          creator_name: 'Public Creator',
          public_mode: true,
          client_identifier: `public-client-${Date.now()}`
        }),
      });

      expect(publicChatResponse.ok).toBe(true);
      const publicChatData = await publicChatResponse.json();
      expect(publicChatData.answer).toBeDefined();

      // Test public rate limiting
      const publicRequests = [];
      const clientId = `public-rate-test-${Date.now()}`;
      
      for (let i = 0; i < 10; i++) {
        publicRequests.push(
          fetch('http://localhost:54321/functions/v1/rag-chat', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            },
            body: JSON.stringify({
              query: `Public query ${i}`,
              channel_id: publicChannel.channel_id,
              public_mode: true,
              client_identifier: clientId
            }),
          })
        );
      }

      const publicResponses = await Promise.all(publicRequests);
      const publicRateLimited = publicResponses.filter(r => r.status === 403);
      
      // Should hit public rate limits faster than authenticated users
      expect(publicRateLimited.length).toBeGreaterThan(0);

      // Cleanup
      await supabase.from('transcript_chunks').delete().eq('channel_id', publicChannel.channel_id);
      await supabase.from('channels').delete().eq('channel_id', publicChannel.channel_id);
    });
  });

  describe('Data Migration and Upgrade Flow', () => {
    it('should handle existing data during function upgrades', async () => {
      // Create legacy-style data
      const { data: legacyChannel } = await supabase
        .from('channels')
        .insert({
          channel_id: `UC_LEGACY_${Date.now()}`,
          channel_name: 'Legacy Creator',
          channel_url: 'https://youtube.com/channel/legacy',
          avatar_url: 'https://example.com/avatar.jpg',
          subscriber_count: '1000',
          uploads_playlist_id: 'UU789',
          ingestion_status: 'completed',
          indexed_videos: 1,
          total_videos: 1
        })
        .select()
        .single();

      // Create chunks without some new fields
      await supabase.from('transcript_chunks').insert({
        transcript_id: 'legacy-transcript-1',
        video_id: 'legacy-video-1',
        channel_id: legacyChannel.channel_id,
        chunk_index: 0,
        text: 'Legacy content that was indexed before the upgrade.',
        start_time: null, // No timestamp data
        end_time: null,
        token_count: 10,
        embedding: JSON.stringify(Array(1536).fill(0.5)),
        embedding_status: 'completed'
      });

      // Test that upgraded functions handle legacy data
      const legacyChatResponse = await fetch('http://localhost:54321/functions/v1/rag-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          query: 'What is your legacy content about?',
          channel_id: legacyChannel.channel_id,
          creator_name: 'Legacy Creator',
          user_id: testUserId
        }),
      });

      expect(legacyChatResponse.ok).toBe(true);
      const legacyChatData = await legacyChatResponse.json();
      expect(legacyChatData.answer).toBeDefined();
      expect(legacyChatData.citations).toBeDefined();
      
      // Should handle missing timestamps gracefully
      if (legacyChatData.citations.length > 0) {
        expect(legacyChatData.citations[0].hasTimestamp).toBe(false);
      }

      // Cleanup
      await supabase.from('transcript_chunks').delete().eq('channel_id', legacyChannel.channel_id);
      await supabase.from('channels').delete().eq('channel_id', legacyChannel.channel_id);
    });
  });
});
