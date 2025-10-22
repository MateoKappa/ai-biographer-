-- Add animation_style column to stories table
ALTER TABLE stories ADD COLUMN IF NOT EXISTS animation_style text DEFAULT 'classic_cartoon';