// Test script for RAG functionality with Cole Medin channel
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const TEST_USER_ID = process.env.TEST_USER_ID;

async function testIngestion() {
  console.log("🚀 Testing RAG pipeline with Cole Medin channel");
  
  // Step 1: Test ingestion function
  console.log("\n1. Testing ingestion function...");
  const ingestResponse = await fetch(`${SUPABASE_URL}/functions/v1/ingest-youtube-channel`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      channelUrl: "https://www.youtube.com/@ColeMedin",
      userId: process.env.TEST_USER_ID || "test-user-id",
      videoLimit: 3
    })
  });
  
  const ingestResult = await ingestResponse.json();
  console.log("Ingestion result:", JSON.stringify(ingestResult, null, 2));
  
  if (!ingestResult.success) {
    console.error("❌ Ingestion failed:", ingestResult.error);
    return;
  }
  
  // Step 2: Wait for processing and check status
  console.log("\n2. Checking processing status...");
  // In a real implementation, we'd poll for status
  
  // Step 3: Test RAG chat
  console.log("\n3. Testing RAG chat...");
  const chatResponse = await fetch(`${SUPABASE_URL}/functions/v1/rag-chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: "What does Cole Medin say about building AI applications?",
      channel_id: "UCColeMedin", // This would be extracted from the channel
      creator_name: "Cole Medin",
      user_id: process.env.TEST_USER_ID || "test-user-id"
    })
  });
  
  const chatResult = await chatResponse.json();
  console.log("Chat result:", JSON.stringify(chatResult, null, 2));
  
  console.log("\n✅ RAG pipeline test completed");
}

testIngestion().catch(console.error);
