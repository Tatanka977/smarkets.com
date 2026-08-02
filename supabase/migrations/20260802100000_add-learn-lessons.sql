-- "Learn" — a Duolingo-style guided lesson path (groups → steps → lessons,
-- each lesson a short body + one multiple-choice question), plus per-user
-- progress and a daily streak. Lesson content is public/non-secret —
-- nothing here is a graded exam, so hiding the correct answer from anyone
-- who can read the table buys nothing — while progress/streaks are
-- private per user. Written defensively (IF NOT EXISTS / EXCEPTION WHEN
-- duplicate_object) so this file is safe to run again from the top.

CREATE TABLE IF NOT EXISTS public.lesson_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.lesson_groups TO anon;
GRANT SELECT ON public.lesson_groups TO authenticated;
GRANT ALL ON public.lesson_groups TO service_role;
ALTER TABLE public.lesson_groups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lesson groups public read" ON public.lesson_groups;
CREATE POLICY "lesson groups public read" ON public.lesson_groups FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.lesson_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.lesson_groups ON DELETE CASCADE,
  title TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS lesson_steps_group_idx ON public.lesson_steps(group_id, order_index);
GRANT SELECT ON public.lesson_steps TO anon;
GRANT SELECT ON public.lesson_steps TO authenticated;
GRANT ALL ON public.lesson_steps TO service_role;
ALTER TABLE public.lesson_steps ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lesson steps public read" ON public.lesson_steps;
CREATE POLICY "lesson steps public read" ON public.lesson_steps FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step_id UUID NOT NULL REFERENCES public.lesson_steps ON DELETE CASCADE,
  title TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  body TEXT NOT NULL,
  question TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_option_index INTEGER NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS lessons_step_idx ON public.lessons(step_id, order_index);
GRANT SELECT ON public.lessons TO anon;
GRANT SELECT ON public.lessons TO authenticated;
GRANT ALL ON public.lessons TO service_role;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lessons public read" ON public.lessons;
CREATE POLICY "lessons public read" ON public.lessons FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.user_lesson_progress (
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.lessons ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  correct_on_first_try BOOLEAN NOT NULL,
  PRIMARY KEY (user_id, lesson_id)
);
GRANT SELECT, INSERT, UPDATE ON public.user_lesson_progress TO authenticated;
GRANT ALL ON public.user_lesson_progress TO service_role;
ALTER TABLE public.user_lesson_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own lesson progress select" ON public.user_lesson_progress;
CREATE POLICY "own lesson progress select" ON public.user_lesson_progress FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "own lesson progress insert" ON public.user_lesson_progress;
CREATE POLICY "own lesson progress insert" ON public.user_lesson_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "own lesson progress update" ON public.user_lesson_progress;
CREATE POLICY "own lesson progress update" ON public.user_lesson_progress FOR UPDATE USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.user_learn_streaks (
  user_id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_activity_date DATE
);
GRANT SELECT, INSERT, UPDATE ON public.user_learn_streaks TO authenticated;
GRANT ALL ON public.user_learn_streaks TO service_role;
ALTER TABLE public.user_learn_streaks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own learn streak select" ON public.user_learn_streaks;
CREATE POLICY "own learn streak select" ON public.user_learn_streaks FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "own learn streak insert" ON public.user_learn_streaks;
CREATE POLICY "own learn streak insert" ON public.user_learn_streaks FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "own learn streak update" ON public.user_learn_streaks;
CREATE POLICY "own learn streak update" ON public.user_learn_streaks FOR UPDATE USING (auth.uid() = user_id);

-- ── Initial seed ────────────────────────────────────────────────────────
-- Group 1 ("Money & Saving Fundamentals") is fully populated and
-- published: 1 step with 3 real lessons, plus 4 more empty (title-only)
-- steps in that same group. Groups 2-10 are empty, unpublished shells —
-- title + order_index only, no steps — since their lesson_steps titles
-- haven't been provided yet; adding those is a separate future migration,
-- not invented here. Guarded by "table is empty" so this only ever seeds
-- once, regardless of how many times this file is re-run.
DO $$
DECLARE
  g1_id UUID;
  s1_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.lesson_groups) THEN

    INSERT INTO public.lesson_groups (title, description, order_index, is_published)
    VALUES ('Money & Saving Fundamentals', 'The basics of saving, budgeting and getting ready to invest.', 1, true)
    RETURNING id INTO g1_id;

    INSERT INTO public.lesson_steps (group_id, title, order_index)
    VALUES (g1_id, 'Why saving matters', 1)
    RETURNING id INTO s1_id;

    INSERT INTO public.lessons (step_id, title, order_index, body, question, options, correct_option_index, is_published) VALUES
      (s1_id, 'The emergency fund', 1,
       'Before investing, most educators suggest building an emergency fund: money in an easily accessible account, separate from your investments. Its job is covering surprises — a medical bill, a job loss — without forcing you to sell investments at a bad time.',
       'What is the main purpose of an emergency fund?',
       '["To earn the highest possible return", "To cover unexpected expenses without selling investments at a bad time", "To pay for daily groceries", "To avoid ever using a bank account"]'::jsonb,
       1, true),
      (s1_id, 'Saving vs investing', 2,
       'Saving means keeping money safe and accessible — priority is stability. Investing means buying assets that can grow over time but can also lose value short-term. Save what you need soon; invest what you can leave untouched for years.',
       'Which statement best describes the difference between saving and investing?',
       '["They are the same thing", "Saving prioritizes safety and accessibility; investing accepts more short-term risk for potential long-term growth", "Investing is only for wealthy people", "Saving always earns more than investing"]'::jsonb,
       1, true),
      (s1_id, 'The cost of waiting', 3,
       'Time is one of an investor''s biggest advantages. Once invested, growth can itself start growing — compounding. The earlier you start, the more time that snowball has to work, which is why ''I''ll invest once I have more'' is such a common trap.',
       'Why does starting to invest earlier matter, according to this lesson?',
       '["Earlier investors get better customer service", "It gives compounding more time to work", "Markets are less risky for early investors", "It guarantees higher returns"]'::jsonb,
       1, true);

    INSERT INTO public.lesson_steps (group_id, title, order_index) VALUES
      (g1_id, 'Where money lives', 2),
      (g1_id, 'Budgeting basics', 3),
      (g1_id, 'Debt basics', 4),
      (g1_id, 'Setting a goal', 5);

    INSERT INTO public.lesson_groups (title, order_index, is_published) VALUES
      ('How Markets Work', 2, false),
      ('Stocks & Ownership', 3, false),
      ('Bonds & Fixed Income', 4, false),
      ('Funds & Diversification', 5, false),
      ('Risk & Volatility', 6, false),
      ('Portfolio Construction & Asset Allocation', 7, false),
      ('Reading Financial Data & Ratios', 8, false),
      ('Behavioral Finance & Investor Psychology', 9, false),
      ('Macro Context', 10, false);

  END IF;
END $$;
