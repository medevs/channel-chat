-- Migration: Deduplicate voice conversation transcripts
-- This removes consecutive duplicate messages that were created due to a bug
-- where response.audio_transcript.done event fired twice

-- Create temporary function to deduplicate transcripts
CREATE OR REPLACE FUNCTION deduplicate_voice_transcripts()
RETURNS void AS $$
DECLARE
  conv_record RECORD;
  deduped_transcript jsonb;
  prev_item jsonb;
  current_item jsonb;
  result_array jsonb := '[]'::jsonb;
BEGIN
  FOR conv_record IN 
    SELECT id, transcript FROM voice_conversations
  LOOP
    result_array := '[]'::jsonb;
    prev_item := NULL;
    
    FOR current_item IN 
      SELECT value FROM jsonb_array_elements(conv_record.transcript)
    LOOP
      -- Only add if different from previous item
      IF prev_item IS NULL OR 
         prev_item->>'content' != current_item->>'content' OR
         prev_item->>'role' != current_item->>'role' THEN
        result_array := result_array || jsonb_build_array(current_item);
      END IF;
      prev_item := current_item;
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
SELECT deduplicate_voice_transcripts();

-- Drop the function after use
DROP FUNCTION deduplicate_voice_transcripts();
