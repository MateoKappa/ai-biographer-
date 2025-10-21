-- Create memory templates table
CREATE TABLE public.memory_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT,
  category TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create template questions table
CREATE TABLE public.template_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.memory_templates(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('fact', 'emotion', 'reflection', 'sensitive')),
  order_index INTEGER NOT NULL,
  follow_up_hints TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create memory captures table (each answer becomes a memory)
CREATE TABLE public.memory_captures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES public.memory_templates(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.template_questions(id) ON DELETE CASCADE,
  answer_text TEXT NOT NULL,
  occurred_date DATE,
  sentiment TEXT,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user template progress tracking
CREATE TABLE public.user_template_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES public.memory_templates(id) ON DELETE CASCADE,
  last_question_id UUID REFERENCES public.template_questions(id),
  completed_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, template_id)
);

-- Enable RLS
ALTER TABLE public.memory_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_captures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_template_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies for memory_templates (public read)
CREATE POLICY "Anyone can view active templates"
ON public.memory_templates
FOR SELECT
USING (is_active = true);

-- RLS Policies for template_questions (public read)
CREATE POLICY "Anyone can view template questions"
ON public.template_questions
FOR SELECT
USING (true);

-- RLS Policies for memory_captures (user-specific)
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

-- RLS Policies for user_template_progress
CREATE POLICY "Users can view their own template progress"
ON public.user_template_progress
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own template progress"
ON public.user_template_progress
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own template progress"
ON public.user_template_progress
FOR UPDATE
USING (auth.uid() = user_id);

-- Trigger for auto-updating memory_captures.updated_at
CREATE TRIGGER update_memory_captures_updated_at
BEFORE UPDATE ON public.memory_captures
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for auto-updating user_template_progress.updated_at
CREATE TRIGGER update_user_template_progress_updated_at
BEFORE UPDATE ON public.user_template_progress
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed starter templates
INSERT INTO public.memory_templates (name, description, icon, category) VALUES
('Childhood Memories', 'Capture the small moments and big feelings from your early years', 'Baby', 'life_phase'),
('First Job', 'Your first steps into the working world—the people, surprises, and lessons', 'Briefcase', 'career'),
('A Love Story', 'How you met, what you share, and the moments that define your bond', 'Heart', 'relationships');

-- Seed questions for Childhood template (using $$ for string escaping)
WITH childhood_template AS (
  SELECT id FROM public.memory_templates WHERE name = 'Childhood Memories' LIMIT 1
)
INSERT INTO public.template_questions (template_id, question_text, question_type, order_index, follow_up_hints)
SELECT 
  (SELECT id FROM childhood_template),
  question,
  type,
  idx,
  hints
FROM (VALUES
  ('Where did you grow up? What did your home look like?', 'fact', 1, 'Consider describing the neighborhood, your room, or a special spot'),
  ('Who watched over you most when you were little? Describe them.', 'fact', 2, 'What did they do for you? What made them special?'),
  ('A favorite game or hiding place—what made it special?', 'emotion', 3, 'Why did you go there? How did it make you feel?'),
  ('A time you felt very proud as a kid—what happened?', 'emotion', 4, 'Who noticed? How old were you?'),
  ('Something that scared you—how did you deal with it?', 'sensitive', 5, 'Who helped you through it? What did you learn?'),
  ('Your best friend growing up—how did you meet?', 'fact', 6, 'What games did you play? What made them special?'),
  ('A family tradition you remember—what was it?', 'reflection', 7, 'Why was it important? Do you still do it?'),
  ('Your favorite food as a child—who made it for you?', 'emotion', 8, 'Can you still taste it? What does it remind you of?'),
  ('A birthday or holiday you will never forget—what happened?', 'emotion', 9, 'Who was there? What made it memorable?'),
  ('Something you collected or cherished—why was it precious?', 'reflection', 10, 'Do you still have it? What did it mean to you?'),
  ('A teacher or adult who encouraged you—what did they say or do?', 'fact', 11, 'How did it change you? Do you remember their name?'),
  ('A time you got in trouble—what did you learn?', 'reflection', 12, 'Were you scared? How did it end?'),
  ('Your first day of school—how did you feel?', 'emotion', 13, 'Who took you? What do you remember most?'),
  ('A pet or animal you loved—tell me about them.', 'emotion', 14, 'What was their name? What did they teach you?'),
  ('A book, movie, or story that stayed with you—why?', 'reflection', 15, 'How old were you? What did it make you feel or imagine?'),
  ('Something you made or built as a kid—what was it?', 'fact', 16, 'Who helped you? Are you still proud of it?'),
  ('A trip or adventure from childhood—where did you go?', 'emotion', 17, 'What surprised you? Who was with you?'),
  ('A song you remember from those years—what feeling does it bring?', 'reflection', 18, 'Where would you hear it? Who sang it?'),
  ('Something you wished for as a child—did it come true?', 'emotion', 19, 'Why did you want it? How did you feel when you got it (or did not)?'),
  ('Looking back, what would you tell your younger self?', 'reflection', 20, 'What do you wish you had known? What are you grateful for?')
) AS questions(question, type, idx, hints);

-- Seed questions for First Job template
WITH first_job_template AS (
  SELECT id FROM public.memory_templates WHERE name = 'First Job' LIMIT 1
)
INSERT INTO public.template_questions (template_id, question_text, question_type, order_index, follow_up_hints)
SELECT 
  (SELECT id FROM first_job_template),
  question,
  type,
  idx,
  hints
FROM (VALUES
  ('What was your very first job? How old were you?', 'fact', 1, 'Where was it? What did you do?'),
  ('How did you get the job—did you apply, or did someone help you?', 'fact', 2, 'Were you nervous during the interview or first day?'),
  ('What surprised you most about working for the first time?', 'reflection', 3, 'Something you did not expect about the job or workplace?'),
  ('Describe your first boss or manager—what were they like?', 'emotion', 4, 'Did they help you? What did you learn from them?'),
  ('A coworker you remember—why did they stand out?', 'fact', 5, 'Were they helpful, funny, difficult? What impact did they have?'),
  ('Your first paycheck—what did you do with the money?', 'emotion', 6, 'How did it feel to earn it? Did you treat yourself?'),
  ('A mistake you made early on—what happened?', 'sensitive', 7, 'How did you fix it? What did it teach you?'),
  ('Something you were really proud of accomplishing—what was it?', 'emotion', 8, 'Did anyone notice? How did it make you feel?'),
  ('A challenge you faced—how did you handle it?', 'reflection', 9, 'Was it a person, a task, or something unexpected?'),
  ('A typical day—walk me through what you would do.', 'fact', 10, 'Morning routine, tasks, breaks—what was it like?'),
  ('The best thing about that job—what did you enjoy most?', 'emotion', 11, 'The people? The work? The freedom?'),
  ('The worst thing—what made you want to quit?', 'reflection', 12, 'Or did you love it? What was hardest?'),
  ('A customer or client interaction you remember—what happened?', 'emotion', 13, 'Funny, difficult, heartwarming—why does it stick with you?'),
  ('Something you learned that you still use today—what is it?', 'reflection', 14, 'A skill, attitude, or life lesson?'),
  ('How long did you stay in that role? Why did you leave?', 'fact', 15, 'Better opportunity, burnout, or natural progression?'),
  ('A mentor or person who helped you grow—what did they do?', 'emotion', 16, 'Did you stay in touch? What advice did they give?'),
  ('Looking back, what would you do differently?', 'reflection', 17, 'Anything you would change or appreciate more?'),
  ('What did you dream of doing next after that first job?', 'emotion', 18, 'Did those dreams come true? How did they change?'),
  ('A funny or embarrassing moment—what happened?', 'emotion', 19, 'Can you laugh about it now? Who was there?'),
  ('If you could send a message to yourself on day one, what would it be?', 'reflection', 20, 'Encouragement, advice, or a warning?')
) AS questions(question, type, idx, hints);

-- Seed questions for Love Story template
WITH love_story_template AS (
  SELECT id FROM public.memory_templates WHERE name = 'A Love Story' LIMIT 1
)
INSERT INTO public.template_questions (template_id, question_text, question_type, order_index, follow_up_hints)
SELECT 
  (SELECT id FROM love_story_template),
  question,
  type,
  idx,
  hints
FROM (VALUES
  ('How did you first meet? Set the scene.', 'fact', 1, 'Where were you? What were you doing?'),
  ('First impression—what did you notice about them?', 'emotion', 2, 'Their look, voice, energy—what stood out?'),
  ('When did you realize this person was special?', 'reflection', 3, 'Was it instant, or did it grow over time?'),
  ('Your first date—where did you go? How did it feel?', 'emotion', 4, 'Nervous, excited, awkward? What happened?'),
  ('A moment when you thought, this is love—what happened?', 'emotion', 5, 'What did they say or do? How did you know?'),
  ('Something they did that surprised you early on—what was it?', 'reflection', 6, 'Good surprise, funny surprise, or challenging?'),
  ('A shared ritual or tradition that feels yours—what is it?', 'emotion', 7, 'Morning coffee, weekly walks, inside jokes?'),
  ('Your toughest moment as a couple—how did you navigate it?', 'sensitive', 8, 'What tested you? How did you come through?'),
  ('Something you learned about yourself through them—what is it?', 'reflection', 9, 'How did they help you see yourself differently?'),
  ('A trip or adventure you took together—what made it memorable?', 'emotion', 10, 'Where did you go? What happened there?'),
  ('Their family or friends—how did you first meet them?', 'fact', 11, 'Were you nervous? How did it go?'),
  ('Something they love that you did not understand at first—do you get it now?', 'reflection', 12, 'A hobby, passion, or quirk that grew on you?'),
  ('A gift they gave you that meant more than the object itself—what was it?', 'emotion', 13, 'Why was it meaningful? Do you still have it?'),
  ('A time they supported you when you really needed it—what did they do?', 'emotion', 14, 'How did it change things for you?'),
  ('Something you admire about them—what is it?', 'reflection', 15, 'Their kindness, humor, strength, creativity?'),
  ('A challenge they are facing now—how do you support them?', 'reflection', 16, 'What do they need from you? How do you show up?'),
  ('A song, place, or smell that makes you think of them—what is it?', 'emotion', 17, 'Why that association? What memory does it bring?'),
  ('Something you want to experience together in the future—what is it?', 'reflection', 18, 'A place, a milestone, a dream to share?'),
  ('If you could freeze one moment with them, which would it be?', 'emotion', 19, 'An everyday moment or a big occasion?'),
  ('What would you tell them if they were reading this right now?', 'reflection', 20, 'Gratitude, love, a promise, or a hope?')
) AS questions(question, type, idx, hints);