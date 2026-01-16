-- Migration: Fix duplicate voice transcripts with same timestamp
-- This removes duplicate messages that have identical content, role, AND timestamp
-- which indicates they were saved twice due to the response.audio_transcript.done event firing twice

CREATE OR REPLACE FUNCTION fix_duplicate_voice_transcripts()
RETURNS void AS $$
DECLARE
  conv_record RECORD;
  current_item jsonb;
  result_array jsonb := '[]'::jsonb;
  seen_keys text[] := ARRAY[]::text[];
  item_key text;
BEGIN
  FOR conv_record IN 
    SELECT id, transcript FROM voice_conversations
  LOOP
    result_array := '[]'::jsonb;
    seen_keys := ARRAY[]::text[];
    
    FOR current_item IN 
      SELECT value FROM jsonb_array_elements(conv_record.transcript)
    LOOP
      -- Create unique key from role, content, and timestamp
      item_key := (current_item->>'role') || '|' || 
                  (current_item->>'content') || '|' || 
                  (current_item->>'timestamp');
      
      -- Only add if we haven't seen this exact message before
      IF NOT (item_key = ANY(seen_keys)) THEN
        result_array := result_array || jsonb_build_array(current_item);
        seen_keys := array_append(seen_keys, item_key);
      END IF;
    END LOOP;
    
    -- Update the record with deduplicated transcript
    UPDATE voice_conversations 
    SET transcript = result_array,
        updated_at = now()
    WHERE id = conv_record.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Run the deduplication
SELECT fix_duplicate_voice_transcripts();

-- Drop the function after use
DROP FUNCTION fix_duplicate_voice_transcripts();
