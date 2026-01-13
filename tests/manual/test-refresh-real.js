// Test refresh functionality with environment variables
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testRefresh() {
  try {
    // Get first channel from database
    const { data: channels, error } = await supabase
      .from('channels')
      .select('*')
      .limit(1);

    if (error || !channels || channels.length === 0) {
      console.error('No channels found:', error);
      return;
    }

    const channel = channels[0];
    console.log('Testing refresh for channel:', channel.channel_name, 'ID:', channel.id);

    // Test refresh functionality
    const { data, error: functionError } = await supabase.functions.invoke('ingest-youtube-channel', {
      body: { 
        refresh: true,
        channelId: channel.id,
        userId: process.env.TEST_USER_ID || 'test-user-id',
      },
    });

    if (functionError) {
      console.error('Function error:', functionError);
      return;
    }

    console.log('Refresh result:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Test error:', err);
  }
}

testRefresh();
