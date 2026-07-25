-- Lets a community post carry a point-in-time snapshot of a portfolio
-- (the user's current live holdings, or one of their saved portfolios) so
-- other members can view it and comment. A snapshot, not a live reference:
-- the source holdings/portfolios stay private as before, only the subset
-- the user actively chose to share at post time becomes public — so this
-- needs no RLS change on community_posts, the existing public-read /
-- own-row-write policy already covers this new column too.
ALTER TABLE public.community_posts ADD COLUMN IF NOT EXISTS portfolio_snapshot JSONB;
