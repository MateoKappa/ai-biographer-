-- Fix foreign key constraint to reference auth.users instead of profiles

-- Drop existing foreign keys
ALTER TABLE public.memory_captures 
  DROP CONSTRAINT IF EXISTS memory_captures_user_id_fkey;

ALTER TABLE public.user_template_progress 
  DROP CONSTRAINT IF EXISTS user_template_progress_user_id_fkey;

-- Recreate foreign keys to reference auth.users
ALTER TABLE public.memory_captures 
  ADD CONSTRAINT memory_captures_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;

ALTER TABLE public.user_template_progress 
  ADD CONSTRAINT user_template_progress_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;

-- Update RLS policies to use auth.uid() directly
DROP POLICY IF EXISTS "Users can view their own memory captures" ON public.memory_captures;
DROP POLICY IF EXISTS "Users can create their own memory captures" ON public.memory_captures;
DROP POLICY IF EXISTS "Users can update their own memory captures" ON public.memory_captures;
DROP POLICY IF EXISTS "Users can delete their own memory captures" ON public.memory_captures;

CREATE POLICY "Users can view their own memory captures"
ON public.memory_captures
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own memory captures"
ON public.memory_captures
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own memory captures"
ON public.memory_captures
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own memory captures"
ON public.memory_captures
FOR DELETE
USING (auth.uid() = user_id);