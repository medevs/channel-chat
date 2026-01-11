import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Test function called');
    
    const body = await req.json();
    console.log('Request body:', body);

    const YOUTUBE_API_KEY = Deno.env.get('YOUTUBE_API_KEY');
    console.log('YouTube API key exists:', !!YOUTUBE_API_KEY);

    // Test a simple YouTube API call
    if (YOUTUBE_API_KEY) {
      const testUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet&forHandle=ColeMedin&key=${YOUTUBE_API_KEY}`;
      console.log('Testing YouTube API...');
      
      const response = await fetch(testUrl);
      const data = await response.json();
      
      console.log('YouTube API response status:', response.status);
      console.log('YouTube API response:', JSON.stringify(data, null, 2));

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Test successful',
          youtubeApiWorking: !data.error,
          channelData: data.items?.[0] || null
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'YouTube API key not found'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Test error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false,
        stack: error instanceof Error ? error.stack : undefined
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
