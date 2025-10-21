-- Add memory_ids array to stories table to track which memories are used
ALTER TABLE public.stories 
  ADD COLUMN memory_ids UUID[] DEFAULT ARRAY[]::UUID[];