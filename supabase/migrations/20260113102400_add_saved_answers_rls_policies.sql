-- Add RLS policies for saved_answers table

-- Users can view their own saved answers
CREATE POLICY "Users can view their own saved answers"
ON public.saved_answers
FOR SELECT
USING (auth.uid() = user_id);

-- Users can save their own answers
CREATE POLICY "Users can save their own answers"
ON public.saved_answers
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own saved answers
CREATE POLICY "Users can delete their own saved answers"
ON public.saved_answers
FOR DELETE
USING (auth.uid() = user_id);

-- Add unique constraint to prevent duplicate saves
ALTER TABLE public.saved_answers 
ADD CONSTRAINT unique_user_message_save 
UNIQUE (user_id, message_id);

-- Add comment
COMMENT ON TABLE public.saved_answers IS 'Stores user-saved AI chat answers for later reference';
