-- Add context_qa field to stories table to store AI-generated questions and answers
ALTER TABLE stories ADD COLUMN context_qa JSONB DEFAULT '[]'::jsonb;