-- Comment voting: one vote per user per comment, mirroring the existing
-- community_votes (post voting) table/trigger pattern almost exactly. A
-- separate table rather than a nullable comment_id column on
-- community_votes, because Postgres UNIQUE(post_id, user_id) doesn't
-- correctly enforce "one vote per user" when post_id is NULL — multiple
-- NULLs aren't considered equal, so the uniqueness guarantee would
-- silently stop working for comment rows sharing that table.
ALTER TABLE public.community_comments ADD COLUMN IF NOT EXISTS score INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.community_comment_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES public.community_comments ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  value SMALLINT NOT NULL CHECK (value IN (-1, 1)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (comment_id, user_id)
);
-- No anon grant: same reasoning as community_votes — votes are only
-- relevant to signed-in users, and the aggregate score is already public
-- via community_comments.score.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_comment_votes TO authenticated;
GRANT ALL ON public.community_comment_votes TO service_role;
ALTER TABLE public.community_comment_votes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "community comment votes own select" ON public.community_comment_votes FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "community comment votes own insert" ON public.community_comment_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "community comment votes own update" ON public.community_comment_votes FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "community comment votes own delete" ON public.community_comment_votes FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.community_recalc_comment_score()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  target_comment UUID := COALESCE(NEW.comment_id, OLD.comment_id);
BEGIN
  UPDATE public.community_comments
  SET score = COALESCE((SELECT SUM(value) FROM public.community_comment_votes WHERE comment_id = target_comment), 0)
  WHERE id = target_comment;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS community_comment_votes_recalc ON public.community_comment_votes;
CREATE TRIGGER community_comment_votes_recalc
  AFTER INSERT OR UPDATE OR DELETE ON public.community_comment_votes
  FOR EACH ROW EXECUTE FUNCTION public.community_recalc_comment_score();
