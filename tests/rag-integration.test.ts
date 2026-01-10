import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

describe('RAG System Integration Tests', () => {
  const CHANNEL_ID = 'UCMwVTLZIRRUyyVrkjDpn4pA';
  const USER_ID = 'b51d5ad0-20be-4c0d-a207-c75148146511';

  beforeAll(async () => {
    // Verify test data exists
    const { data: channel } = await supabase
      .from('channels')
      .select('*')
      .eq('channel_id', CHANNEL_ID)
      .single();
    
    expect(channel).toBeTruthy();
    expect(channel.ingestion_status).toBe('completed');
  });

  describe('Database Schema Validation', () => {
    it('should have channel data', async () => {
      const { data, error } = await supabase
        .from('channels')
        .select('*')
        .eq('channel_id', CHANNEL_ID)
        .single();

      expect(error).toBeNull();
      expect(data).toBeTruthy();
      expect(data.channel_name).toBe('Cole Medin');
      expect(data.indexed_videos).toBeGreaterThan(0);
    });

    it('should have video data', async () => {
      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .eq('channel_id', CHANNEL_ID);

      expect(error).toBeNull();
      expect(data).toBeTruthy();
      expect(data.length).toBeGreaterThan(0);
      expect(data[0]).toHaveProperty('video_id');
      expect(data[0]).toHaveProperty('title');
    });

    it('should have transcript data', async () => {
      const { data, error } = await supabase
        .from('transcripts')
        .select('*')
        .eq('channel_id', CHANNEL_ID)
        .eq('extraction_status', 'completed');

      expect(error).toBeNull();
      expect(data).toBeTruthy();
      expect(data.length).toBeGreaterThan(0);
      expect(data[0]).toHaveProperty('full_text');
      expect(data[0]).toHaveProperty('segments');
    });

    it('should have transcript chunks with embeddings', async () => {
      const { data, error } = await supabase
        .from('transcript_chunks')
        .select('*')
        .eq('channel_id', CHANNEL_ID)
        .eq('embedding_status', 'completed')
        .limit(5);

      expect(error).toBeNull();
      expect(data).toBeTruthy();
      expect(data.length).toBeGreaterThan(0);
      expect(data[0]).toHaveProperty('text');
      expect(data[0]).toHaveProperty('embedding');
      expect(data[0]).toHaveProperty('start_time');
      expect(data[0]).toHaveProperty('end_time');
    });
  });

  describe('RAG Chat Function', () => {
    async function callRagChat(query, expectedStatus = 200) {
      const response = await fetch(`${supabaseUrl}/functions/v1/rag-chat`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          channel_id: CHANNEL_ID,
          creator_name: 'Cole Medin',
          user_id: USER_ID,
          conversation_history: []
        }),
      });

      expect(response.status).toBe(expectedStatus);
      return response.json();
    }

    it('should handle general questions', async () => {
      const result = await callRagChat('What does Cole talk about?');
      
      expect(result).toHaveProperty('answer');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('evidence');
      expect(result.confidence).toMatch(/^(high|medium|low)$/);
      expect(result.evidence.chunksUsed).toBeGreaterThan(0);
      expect(result.isRefusal).toBe(false);
    });

    it('should handle location-based questions with citations', async () => {
      const result = await callRagChat('Where does Cole mention AI agents?');
      
      expect(result.confidence).toBe('high');
      expect(result.showCitations).toBe(true);
      expect(result.citations).toBeTruthy();
      expect(result.citations.length).toBeGreaterThan(0);
      
      // Validate citation structure
      const citation = result.citations[0];
      expect(citation).toHaveProperty('videoId');
      expect(citation).toHaveProperty('videoTitle');
      expect(citation).toHaveProperty('timestamp');
      expect(citation).toHaveProperty('startTime');
      expect(citation).toHaveProperty('similarity');
    });

    it('should refuse questions not covered in content', async () => {
      const result = await callRagChat('What is your favorite pizza topping?');
      
      expect(result.confidence).toBe('not_covered');
      expect(result.isRefusal).toBe(true);
      expect(result.citations).toHaveLength(0);
      expect(result.evidence.chunksUsed).toBe(0);
    });

    it('should handle empty queries', async () => {
      const result = await callRagChat('', 400);
      expect(result).toHaveProperty('error');
    });

    it('should handle very long queries', async () => {
      const longQuery = 'What does Cole think about '.repeat(50) + 'AI development?';
      const result = await callRagChat(longQuery);
      
      expect(result).toHaveProperty('answer');
      expect(result.confidence).toMatch(/^(high|medium|low|not_covered)$/);
    });
  });

  describe('Edge Function Integration', () => {
    it('should have all required Edge Functions deployed', async () => {
      const functions = [
        'ingest-youtube-channel',
        'extract-transcripts', 
        'run-pipeline',
        'rag-chat'
      ];

      for (const func of functions) {
        const response = await fetch(`${supabaseUrl}/functions/v1/${func}`, {
          method: 'OPTIONS',
          headers: { 'Authorization': `Bearer ${supabaseKey}` }
        });
        expect(response.status).toBe(200);
      }
    });
  });

  describe('Performance Tests', () => {
    async function callRagChat(query, expectedStatus = 200) {
      const response = await fetch(`${supabaseUrl}/functions/v1/rag-chat`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          channel_id: CHANNEL_ID,
          creator_name: 'Cole Medin',
          user_id: USER_ID,
          conversation_history: []
        }),
      });

      expect(response.status).toBe(expectedStatus);
      return response.json();
    }

    it('should respond to RAG queries within reasonable time', async () => {
      const startTime = Date.now();
      const result = await callRagChat('What does Cole talk about in his videos?');
      const endTime = Date.now();
      
      expect(result).toHaveProperty('answer');
      expect(endTime - startTime).toBeLessThan(10000); // 10 seconds max
    });

    it('should handle multiple concurrent requests', async () => {
      const queries = [
        'What does Cole talk about?',
        'How does Cole use AI?',
        'What are Cole\'s main topics?'
      ];

      const promises = queries.map(query => callRagChat(query));
      const results = await Promise.all(promises);

      results.forEach(result => {
        expect(result).toHaveProperty('answer');
        expect(result.confidence).toMatch(/^(high|medium|low|not_covered)$/);
      });
    });
  });
});
