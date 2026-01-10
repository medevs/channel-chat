/**
 * End-to-End RAG Functionality Test
 * Tests the complete RAG workflow with Cole Medin's channel
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
  
  const result = await response.json();
  return { status: response.status, data: result };
}

async function testRAGChat(query, expectedConfidence, shouldHaveCitations = false) {
  console.log(`\n🧪 Testing: "${query}"`);
  
  const result = await makeRequest('rag-chat', {
    query,
    channel_id: CHANNEL_ID,
    creator_name: 'Cole Medin',
    user_id: USER_ID,
    conversation_history: []
  });
  
  if (result.status !== 200) {
    console.error(`❌ Request failed: ${result.status}`, result.data);
    return false;
  }
  
  const { answer, confidence, citations, evidence, isRefusal } = result.data;
  
  console.log(`📝 Answer: ${answer.substring(0, 100)}...`);
  console.log(`🎯 Confidence: ${confidence}`);
  console.log(`📊 Evidence: ${evidence.chunksUsed} chunks, ${evidence.videosReferenced} videos`);
  console.log(`🔗 Citations: ${citations.length}`);
  
  // Validate confidence
  if (confidence !== expectedConfidence) {
    console.error(`❌ Expected confidence ${expectedConfidence}, got ${confidence}`);
    return false;
  }
  
  // Validate citations
  if (shouldHaveCitations && citations.length === 0) {
    console.error(`❌ Expected citations but got none`);
    return false;
  }
  
  if (citations.length > 0) {
    console.log(`📍 First citation: ${citations[0].videoTitle} at ${citations[0].timestamp}`);
  }
  
  console.log(`✅ Test passed`);
  return true;
}

async function runTests() {
  console.log('🚀 Starting End-to-End RAG Tests');
  console.log('=====================================');
  
  let passed = 0;
  let total = 0;
  
  // Test 1: General question (should get high confidence, no citations)
  total++;
  if (await testRAGChat(
    "What does Cole talk about in his videos?",
    "high",
    false
  )) passed++;
  
  // Test 2: Location-based question (should get citations)
  total++;
  if (await testRAGChat(
    "Where does Cole mention AI agents?",
    "high",
    true
  )) passed++;
  
  // Test 3: Specific technical question
  total++;
  if (await testRAGChat(
    "How does Cole use AI coding assistance?",
    "high",
    false
  )) passed++;
  
  // Test 4: Question that should be refused
  total++;
  if (await testRAGChat(
    "What is your favorite pizza topping?",
    "not_covered",
    false
  )) passed++;
  
  // Test 5: Moment-based question (should require high confidence)
  total++;
  if (await testRAGChat(
    "When does Cole talk about hackathons?",
    "high",
    true
  )) passed++;
  
  console.log('\n=====================================');
  console.log(`🏁 Tests completed: ${passed}/${total} passed`);
  
  if (passed === total) {
    console.log('🎉 All tests passed! RAG system is working correctly.');
  } else {
    console.log('❌ Some tests failed. Check the output above.');
  }
  
  return passed === total;
}

// Run the tests
runTests().catch(console.error);
