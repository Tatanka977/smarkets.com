-- OWNER_EMAIL (src/lib/admin.ts) moved from a personal Gmail address to
-- admin@s-markets.com now that the domain has real mailboxes. Re-points
-- the same three community moderation DELETE policies added in the
-- community-admin-moderation migration to the new address — ALTER POLICY
-- again simply redefines the USING clause in place.
-- IMPORTANT: if OWNER_EMAIL ever changes again, this must be updated to
-- match — the two are two independent copies of the same constant.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='community_posts' AND policyname='community posts own delete') THEN
    ALTER POLICY "community posts own delete" ON public.community_posts
      USING (auth.uid() = user_id OR (auth.jwt() ->> 'email') = 'admin@s-markets.com');
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='community_comments' AND policyname='community comments own delete') THEN
    ALTER POLICY "community comments own delete" ON public.community_comments
      USING (auth.uid() = user_id OR (auth.jwt() ->> 'email') = 'admin@s-markets.com');
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='community_channels' AND policyname='community channels own delete') THEN
    ALTER POLICY "community channels own delete" ON public.community_channels
      USING (auth.uid() = created_by OR (auth.jwt() ->> 'email') = 'admin@s-markets.com');
  END IF;
END $$;
