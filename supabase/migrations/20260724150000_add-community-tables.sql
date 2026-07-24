-- Community discussion board: posts, threaded (one-level) comments, and
-- one-vote-per-user upvote/downvote on posts. Anyone (including signed-out
-- visitors) can read; only authenticated users can create content, and only
-- for their own rows. author_name is denormalized onto posts/comments at
-- insert time (same pattern as watchlist.name) so listing/reading never
-- needs to join against auth.users or profiles, which would otherwise
-- require loosening the profiles table's own-row-only RLS policy.
-- Written defensively (IF NOT EXISTS / guarded policy creation) so this is
-- safe to run even if parts of it already exist.

CREATE TABLE IF NOT EXISTS public.community_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 8000),
  score INTEGER NOT NULL DEFAULT 0,
  comment_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.community_posts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_posts TO authenticated;
GRANT ALL ON public.community_posts TO service_role;
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='community_posts' AND policyname='community posts public read') THEN
    CREATE POLICY "community posts public read" ON public.community_posts FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='community_posts' AND policyname='community posts own insert') THEN
    CREATE POLICY "community posts own insert" ON public.community_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='community_posts' AND policyname='community posts own update') THEN
    CREATE POLICY "community posts own update" ON public.community_posts FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='community_posts' AND policyname='community posts own delete') THEN
    CREATE POLICY "community posts own delete" ON public.community_posts FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS community_posts_created_idx ON public.community_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS community_posts_score_idx ON public.community_posts(score DESC, created_at DESC);

CREATE TABLE IF NOT EXISTS public.community_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.community_posts ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 3000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.community_comments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_comments TO authenticated;
GRANT ALL ON public.community_comments TO service_role;
ALTER TABLE public.community_comments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='community_comments' AND policyname='community comments public read') THEN
    CREATE POLICY "community comments public read" ON public.community_comments FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='community_comments' AND policyname='community comments own insert') THEN
    CREATE POLICY "community comments own insert" ON public.community_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='community_comments' AND policyname='community comments own update') THEN
    CREATE POLICY "community comments own update" ON public.community_comments FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='community_comments' AND policyname='community comments own delete') THEN
    CREATE POLICY "community comments own delete" ON public.community_comments FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS community_comments_post_idx ON public.community_comments(post_id, created_at ASC);

CREATE TABLE IF NOT EXISTS public.community_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.community_posts ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  value SMALLINT NOT NULL CHECK (value IN (-1, 1)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id)
);
-- No anon grant: votes are only relevant to signed-in users, and the
-- aggregate score is already public via community_posts.score.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_votes TO authenticated;
GRANT ALL ON public.community_votes TO service_role;
ALTER TABLE public.community_votes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='community_votes' AND policyname='community votes own select') THEN
    CREATE POLICY "community votes own select" ON public.community_votes FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='community_votes' AND policyname='community votes own insert') THEN
    CREATE POLICY "community votes own insert" ON public.community_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='community_votes' AND policyname='community votes own update') THEN
    CREATE POLICY "community votes own update" ON public.community_votes FOR UPDATE USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='community_votes' AND policyname='community votes own delete') THEN
    CREATE POLICY "community votes own delete" ON public.community_votes FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Denormalized aggregates on community_posts (score, comment_count) are
-- maintained by these triggers so listing posts never needs a COUNT/SUM
-- join, and so "top voted" can be a plain indexed ORDER BY. SECURITY
-- DEFINER is required because a voter/commenter is very often not the
-- post's own author, and the own-row-only UPDATE policy on community_posts
-- would otherwise block the aggregate write.
CREATE OR REPLACE FUNCTION public.community_recalc_post_score()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  target_post UUID := COALESCE(NEW.post_id, OLD.post_id);
BEGIN
  UPDATE public.community_posts
  SET score = COALESCE((SELECT SUM(value) FROM public.community_votes WHERE post_id = target_post), 0)
  WHERE id = target_post;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS community_votes_recalc ON public.community_votes;
CREATE TRIGGER community_votes_recalc
  AFTER INSERT OR UPDATE OR DELETE ON public.community_votes
  FOR EACH ROW EXECUTE FUNCTION public.community_recalc_post_score();

CREATE OR REPLACE FUNCTION public.community_recalc_comment_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  target_post UUID := COALESCE(NEW.post_id, OLD.post_id);
BEGIN
  UPDATE public.community_posts
  SET comment_count = (SELECT COUNT(*) FROM public.community_comments WHERE post_id = target_post)
  WHERE id = target_post;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS community_comments_recalc ON public.community_comments;
CREATE TRIGGER community_comments_recalc
  AFTER INSERT OR DELETE ON public.community_comments
  FOR EACH ROW EXECUTE FUNCTION public.community_recalc_comment_count();

-- author_name is DISPLAY data, not access control — but it's still shown
-- publicly as "who wrote this", so a client-supplied value would let any
-- signed-in user impersonate another display name. This trigger overwrites
-- whatever the client sent with the name resolved server-side from
-- auth.users, the same precedence used by the existing handle_new_user()
-- trigger (full_name -> name -> email local-part). Reused across both
-- tables since each has the same user_id/author_name column names.
CREATE OR REPLACE FUNCTION public.community_set_author_name()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  resolved_name TEXT;
BEGIN
  SELECT COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', split_part(email,'@',1), 'Utente')
    INTO resolved_name
    FROM auth.users WHERE id = NEW.user_id;
  NEW.author_name := COALESCE(resolved_name, 'Utente');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS community_posts_set_author ON public.community_posts;
CREATE TRIGGER community_posts_set_author
  BEFORE INSERT ON public.community_posts
  FOR EACH ROW EXECUTE FUNCTION public.community_set_author_name();

DROP TRIGGER IF EXISTS community_comments_set_author ON public.community_comments;
CREATE TRIGGER community_comments_set_author
  BEFORE INSERT ON public.community_comments
  FOR EACH ROW EXECUTE FUNCTION public.community_set_author_name();
