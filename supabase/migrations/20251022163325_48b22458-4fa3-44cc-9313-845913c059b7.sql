-- Add temperature and desired_panels columns to stories table
ALTER TABLE stories 
ADD COLUMN temperature NUMERIC DEFAULT 0.7,
ADD COLUMN desired_panels INTEGER DEFAULT 3;

-- Add check constraint to ensure panels is between 1 and 8
ALTER TABLE stories
ADD CONSTRAINT check_panels_range CHECK (desired_panels >= 1 AND desired_panels <= 8);

-- Add check constraint to ensure temperature is between 0 and 1
ALTER TABLE stories
ADD CONSTRAINT check_temperature_range CHECK (temperature >= 0 AND temperature <= 1);

-- Update the status column to have a more meaningful default
ALTER TABLE stories 
ALTER COLUMN status SET DEFAULT 'draft';