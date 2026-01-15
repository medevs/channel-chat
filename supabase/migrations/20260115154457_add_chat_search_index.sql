-- Add GIN index for full-text search on chat messages
-- This improves performance for text search queries using ILIKE or full-text search

CREATE INDEX IF NOT EXISTS idx_chat_messages_content_search 
ON public.chat_messages 
USING gin(to_tsvector('english', content));

-- Also add a simple index for ILIKE queries (case-insensitive pattern matching)
CREATE INDEX IF NOT EXISTS idx_chat_messages_content_ilike 
ON public.chat_messages (content text_pattern_ops);
