-- Per-topic rules, set by whoever creates the topic (same idea as
-- subreddit rules on Reddit, set by that subreddit's mods) — replaces the
-- one-size-fits-all static rules list previously hardcoded in the UI.
-- No RLS change needed: the existing "community channels own update"
-- policy (auth.uid() = created_by) already limits editing rules to the
-- topic's own creator, which is exactly the intended behavior.
ALTER TABLE public.community_channels
  ADD COLUMN IF NOT EXISTS rules TEXT[] NOT NULL DEFAULT '{}';
