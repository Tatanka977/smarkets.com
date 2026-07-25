-- Lets one moderator identity (OWNER_EMAIL, src/lib/admin.ts — the same
-- email that already gates blog authoring) delete ANY community post,
-- comment, or channel, not just their own, for reactive moderation.
-- Extends the existing "own row" DELETE policies rather than adding new
-- ones, since a DELETE policy is evaluated as a single boolean expression
-- per row; ALTER POLICY redefines that expression in place.
-- IMPORTANT: if OWNER_EMAIL ever changes, this must be updated to match —
-- the two are two independent copies of the same constant, not linked.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='community_posts' AND policyname='community posts own delete') THEN
    ALTER POLICY "community posts own delete" ON public.community_posts
      USING (auth.uid() = user_id OR (auth.jwt() ->> 'email') = 'strat.markets@gmail.com');
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='community_comments' AND policyname='community comments own delete') THEN
    ALTER POLICY "community comments own delete" ON public.community_comments
      USING (auth.uid() = user_id OR (auth.jwt() ->> 'email') = 'strat.markets@gmail.com');
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='community_channels' AND policyname='community channels own delete') THEN
    ALTER POLICY "community channels own delete" ON public.community_channels
      USING (auth.uid() = created_by OR (auth.jwt() ->> 'email') = 'strat.markets@gmail.com');
  END IF;
END $$;
