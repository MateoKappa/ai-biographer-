-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles are viewable by everyone
CREATE POLICY "Profiles are viewable by everyone" 
ON public.profiles 
FOR SELECT 
USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Users can insert their own profile
CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create stories table
CREATE TABLE public.stories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  story_text TEXT NOT NULL,
  photo_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

-- Users can view their own stories
CREATE POLICY "Users can view their own stories" 
ON public.stories 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can create their own stories
CREATE POLICY "Users can create their own stories" 
ON public.stories 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can update their own stories
CREATE POLICY "Users can update their own stories" 
ON public.stories 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Users can delete their own stories
CREATE POLICY "Users can delete their own stories" 
ON public.stories 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create cartoon_panels table
CREATE TABLE public.cartoon_panels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  scene_text TEXT NOT NULL,
  image_url TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cartoon_panels ENABLE ROW LEVEL SECURITY;

-- Users can view panels for their own stories
CREATE POLICY "Users can view their own cartoon panels" 
ON public.cartoon_panels 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.stories 
    WHERE stories.id = cartoon_panels.story_id 
    AND stories.user_id = auth.uid()
  )
);

-- Users can create panels for their own stories
CREATE POLICY "Users can create their own cartoon panels" 
ON public.cartoon_panels 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.stories 
    WHERE stories.id = cartoon_panels.story_id 
    AND stories.user_id = auth.uid()
  )
);

-- Users can delete panels for their own stories
CREATE POLICY "Users can delete their own cartoon panels" 
ON public.cartoon_panels 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.stories 
    WHERE stories.id = cartoon_panels.story_id 
    AND stories.user_id = auth.uid()
  )
);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates on profiles
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for automatic timestamp updates on stories
CREATE TRIGGER update_stories_updated_at
BEFORE UPDATE ON public.stories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for cartoon images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('cartoons', 'cartoons', true);

-- Create policies for cartoon uploads
CREATE POLICY "Cartoon images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'cartoons');

CREATE POLICY "Users can upload their own cartoons" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'cartoons' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own cartoons" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'cartoons' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own cartoons" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'cartoons' AND auth.uid()::text = (storage.foldername(name))[1]);