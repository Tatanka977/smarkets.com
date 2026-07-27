-- Post type tag (Portfolio Review / Question / Discussion / Market Talk),
-- shown as a colored pill on each post card in the redesigned Reddit-style
-- feed. Additive/defaulted column — existing rows (and the existing RLS
-- policies, which already cover the whole row) need no backfill or policy
-- change, same reasoning as the earlier portfolio_snapshot column-add.
ALTER TABLE public.community_posts
  ADD COLUMN IF NOT EXISTS post_type TEXT NOT NULL DEFAULT 'discussion';

DO $$ BEGIN
  ALTER TABLE public.community_posts
    ADD CONSTRAINT community_posts_post_type_check
    CHECK (post_type IN ('portfolio_review','question','discussion','market_talk'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
