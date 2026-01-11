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
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    const YOUTUBE_API_KEY = Deno.env.get('YOUTUBE_API_KEY');
    
    const results = {
      openai: { hasKey: !!OPENAI_API_KEY, working: false },
      youtube: { hasKey: !!YOUTUBE_API_KEY, working: false }
    };

    // Test OpenAI API
    if (OPENAI_API_KEY) {
      try {
        const response = await fetch('https://api.openai.com/v1/models', {
          headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}` }
        });
        results.openai.working = response.ok;
      } catch (e) {
        results.openai.error = String(e);
      }
    }

    // Test YouTube API
    if (YOUTUBE_API_KEY) {
      try {
        const response = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=snippet&id=UCColeMedin&key=${YOUTUBE_API_KEY}`);
        results.youtube.working = response.ok;
      } catch (e) {
        results.youtube.error = String(e);
      }
    }

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
