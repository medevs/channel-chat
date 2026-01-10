#!/usr/bin/env node

/**
 * Final RAG System Validation
 * Comprehensive test of the complete RAG workflow
 */

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const CHANNEL_ID = process.env.TEST_CHANNEL_ID || 'UCMwVTLZIRRUyyVrkjDpn4pA';
const USER_ID = process.env.TEST_USER_ID || 'b51d5ad0-20be-4c0d-a207-c75148146511';

async function makeRequest(endpoint, data) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  return { status: response.status, data: await response.json() };
}

async function validateDatabase() {
  console.log('🔍 Validating Database State...');
  
  // Check channel
  const channelResponse = await fetch(`${SUPABASE_URL}/rest/v1/channels?channel_id=eq.${CHANNEL_ID}&select=*`, {
    headers: { 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'apikey': SUPABASE_ANON_KEY }
  });
  const channels = await channelResponse.json();
  
  if (!channels || channels.length === 0) {
    throw new Error('❌ Channel not found in database');
  }
  
  const channel = channels[0];
  console.log(`✅ Channel: ${channel.channel_name} (${channel.ingestion_status})`);
  console.log(`   Videos indexed: ${channel.indexed_videos}`);
  
  // Check videos
  const videosResponse = await fetch(`${SUPABASE_URL}/rest/v1/videos?channel_id=eq.${CHANNEL_ID}&select=count`, {
    headers: { 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'apikey': SUPABASE_ANON_KEY, 'Prefer': 'count=exact' }
  });
  const videoCount = videosResponse.headers.get('content-range')?.split('/')[1] || '0';
  console.log(`✅ Videos: ${videoCount} found`);
  
  // Check transcripts
  const transcriptsResponse = await fetch(`${SUPABASE_URL}/rest/v1/transcripts?channel_id=eq.${CHANNEL_ID}&extraction_status=eq.completed&select=count`, {
    headers: { 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'apikey': SUPABASE_ANON_KEY, 'Prefer': 'count=exact' }
  });
  const transcriptCount = transcriptsResponse.headers.get('content-range')?.split('/')[1] || '0';
  console.log(`✅ Transcripts: ${transcriptCount} completed`);
  
  // Check chunks
  const chunksResponse = await fetch(`${SUPABASE_URL}/rest/v1/transcript_chunks?channel_id=eq.${CHANNEL_ID}&embedding_status=eq.completed&select=count`, {
    headers: { 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'apikey': SUPABASE_ANON_KEY, 'Prefer': 'count=exact' }
  });
  const chunkCount = chunksResponse.headers.get('content-range')?.split('/')[1] || '0';
  console.log(`✅ Chunks with embeddings: ${chunkCount}`);
  
  return {
    channel: channel.channel_name,
    status: channel.ingestion_status,
    videos: parseInt(videoCount),
    transcripts: parseInt(transcriptCount),
    chunks: parseInt(chunkCount)
  };
}

async function testRAGQueries() {
  console.log('\n🧪 Testing RAG Queries...');
  
  const testCases = [
    {
      name: 'General Knowledge',
      query: 'What does Cole talk about in his videos?',
      expectConfidence: ['high', 'medium'],
      expectCitations: false
    },
    {
      name: 'Location-based Query',
      query: 'Where does Cole mention AI agents?',
      expectConfidence: ['high'],
      expectCitations: true
    },
    {
      name: 'Technical Question',
      query: 'How does Cole use AI coding assistance?',
      expectConfidence: ['high', 'medium'],
      expectCitations: false
    },
    {
      name: 'Timestamp Query',
      query: 'At what time does Cole talk about hackathons?',
      expectConfidence: ['high'],
      expectCitations: true
    },
    {
      name: 'Refusal Test',
      query: 'What is your favorite pizza topping?',
      expectConfidence: ['not_covered'],
      expectCitations: false
    }
  ];
  
  let passed = 0;
  
  for (const test of testCases) {
    console.log(`\n  Testing: ${test.name}`);
    console.log(`  Query: "${test.query}"`);
    
    try {
      const result = await makeRequest('rag-chat', {
        query: test.query,
        channel_id: CHANNEL_ID,
        creator_name: 'Cole Medin',
        user_id: USER_ID,
        conversation_history: []
      });
      
      if (result.status !== 200) {
        console.log(`  ❌ Request failed: ${result.status}`);
        continue;
      }
      
      const { answer, confidence, citations, evidence, isRefusal } = result.data;
      
      // Check confidence
      if (!test.expectConfidence.includes(confidence)) {
        console.log(`  ❌ Expected confidence ${test.expectConfidence.join(' or ')}, got ${confidence}`);
        continue;
      }
      
      // Check citations
      const hasCitations = citations && citations.length > 0;
      if (test.expectCitations && !hasCitations) {
        console.log(`  ❌ Expected citations but got none`);
        continue;
      }
      
      if (!test.expectCitations && hasCitations) {
        console.log(`  ⚠️  Got unexpected citations (${citations.length})`);
      }
      
      console.log(`  ✅ Confidence: ${confidence}`);
      console.log(`  ✅ Citations: ${citations.length}`);
      console.log(`  ✅ Evidence: ${evidence.chunksUsed} chunks, ${evidence.videosReferenced} videos`);
      console.log(`  ✅ Answer: ${answer.substring(0, 80)}...`);
      
      passed++;
      
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
    }
  }
  
  return { total: testCases.length, passed };
}

async function testEdgeFunctions() {
  console.log('\n🔧 Testing Edge Functions...');
  
  const functions = [
    'ingest-youtube-channel',
    'extract-transcripts',
    'run-pipeline',
    'rag-chat'
  ];
  
  let working = 0;
  
  for (const func of functions) {
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/${func}`, {
        method: 'OPTIONS',
        headers: { 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` }
      });
      
      if (response.status === 200) {
        console.log(`  ✅ ${func}`);
        working++;
      } else {
        console.log(`  ❌ ${func} (status: ${response.status})`);
      }
    } catch (error) {
      console.log(`  ❌ ${func} (error: ${error.message})`);
    }
  }
  
  return { total: functions.length, working };
}

async function main() {
  console.log('🚀 RAG System Final Validation');
  console.log('================================');
  
  try {
    // Validate database
    const dbStats = await validateDatabase();
    
    if (dbStats.status !== 'completed') {
      throw new Error(`❌ Channel ingestion not completed: ${dbStats.status}`);
    }
    
    if (dbStats.chunks === 0) {
      throw new Error('❌ No chunks with embeddings found');
    }
    
    // Test Edge Functions
    const funcStats = await testEdgeFunctions();
    
    if (funcStats.working !== funcStats.total) {
      console.log(`⚠️  Only ${funcStats.working}/${funcStats.total} Edge Functions working`);
    }
    
    // Test RAG queries
    const queryStats = await testRAGQueries();
    
    console.log('\n================================');
    console.log('📊 Final Results:');
    console.log(`   Database: ✅ ${dbStats.chunks} chunks ready`);
    console.log(`   Functions: ${funcStats.working}/${funcStats.total} working`);
    console.log(`   RAG Tests: ${queryStats.passed}/${queryStats.total} passed`);
    
    if (queryStats.passed === queryStats.total && funcStats.working === funcStats.total) {
      console.log('\n🎉 RAG System is fully functional!');
      console.log('   ✅ Channel ingestion complete');
      console.log('   ✅ Transcripts extracted');
      console.log('   ✅ Embeddings generated');
      console.log('   ✅ RAG chat working');
      console.log('   ✅ Citations and timestamps working');
      console.log('   ✅ Refusal system working');
      return true;
    } else {
      console.log('\n❌ Some issues found. Check the output above.');
      return false;
    }
    
  } catch (error) {
    console.error('\n❌ Validation failed:', error.message);
    return false;
  }
}

// Run validation
main().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
