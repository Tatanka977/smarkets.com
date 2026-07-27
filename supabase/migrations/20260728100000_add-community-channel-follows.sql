-- Following a topic ("channel"), same idea as following a subreddit: a
-- plain join table between a user and the channels they follow. Own-only
-- (no public read, unlike posts/comments) since who-follows-what isn't
-- shown anywhere — it only drives each signed-in user's own "Following"
-- feed and the Home page's community callout.
CREATE TABLE IF NOT EXISTS public.community_channel_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  channel_id UUID NOT NULL REFERENCES public.community_channels ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, channel_id)
);
GRANT SELECT, INSERT, DELETE ON public.community_channel_follows TO authenticated;
GRANT ALL ON public.community_channel_follows TO service_role;
ALTER TABLE public.community_channel_follows ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "community channel follows own select" ON public.community_channel_follows FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "community channel follows own insert" ON public.community_channel_follows FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "community channel follows own delete" ON public.community_channel_follows FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS community_channel_follows_user_idx ON public.community_channel_follows(user_id);
