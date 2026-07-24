-- Community channels ("canali", Reddit-style but without borrowing any
-- Reddit branding/terminology) + real user-chosen usernames.
-- Written defensively (IF NOT EXISTS, or EXCEPTION WHEN duplicate_object
-- for constraints/policies, which Postgres has no IF NOT EXISTS form for)
-- so the whole file is safe to run again from the top even if it partially
-- applied on a previous attempt.

-- ── Ensure public.profiles exists ──────────────────────────────────────
-- Expected to already exist (created by this repo's very first migration),
-- but the live project apparently never got it — this migration ALTERs
-- profiles below, which fails outright if the table is missing. Recreated
-- here identical to that original migration; safe no-op if it does exist.
-- Also recreates handle_new_user()/its trigger (same reasoning — if the
-- table was missing, this trigger almost certainly is too, meaning new
-- signups have been silently getting no profile row at all) and backfills
-- a profiles row for any existing auth.users that predate it.
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "own profile select" ON public.profiles FOR SELECT USING (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "own profile insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "own profile update" ON public.profiles FOR UPDATE USING (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (NEW.id,
          COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)),
          NEW.raw_user_meta_data->>'avatar_url')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

INSERT INTO public.profiles (id, display_name, avatar_url)
SELECT id,
       COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', split_part(email,'@',1)),
       raw_user_meta_data->>'avatar_url'
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- ── Channels ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.community_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),
  description TEXT CHECK (description IS NULL OR char_length(description) <= 300),
  created_by UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  post_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (slug)
);

DO $$ BEGIN
  ALTER TABLE public.community_channels
    ADD CONSTRAINT community_channels_slug_format CHECK (slug ~ '^[a-z0-9-]{3,30}$');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

GRANT SELECT ON public.community_channels TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_channels TO authenticated;
GRANT ALL ON public.community_channels TO service_role;
ALTER TABLE public.community_channels ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "community channels public read" ON public.community_channels FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "community channels own insert" ON public.community_channels FOR INSERT WITH CHECK (auth.uid() = created_by);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "community channels own update" ON public.community_channels FOR UPDATE USING (auth.uid() = created_by);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "community channels own delete" ON public.community_channels FOR DELETE USING (auth.uid() = created_by);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ── Posts now belong to a channel ──────────────────────────────────────
-- Nullable rather than NOT NULL: a hard NOT NULL would need every existing
-- row backfilled atomically in the same migration, and that backfill can
-- only run once at least one auth.users row exists (created_by is a FK).
-- The app always sets channel_id when creating a post going forward; any
-- pre-existing NULL rows are backfilled into the seeded default channel
-- below when possible.
ALTER TABLE public.community_posts
  ADD COLUMN IF NOT EXISTS channel_id UUID REFERENCES public.community_channels ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS community_posts_channel_recent_idx ON public.community_posts(channel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS community_posts_channel_top_idx ON public.community_posts(channel_id, score DESC, created_at DESC);

-- Seed a default "generale" channel and backfill any channel-less posts
-- into it, so the community isn't empty of channels right after upgrade.
DO $$
DECLARE
  default_channel_id UUID;
  seed_user_id UUID;
BEGIN
  SELECT id INTO default_channel_id FROM public.community_channels WHERE slug = 'generale';
  IF default_channel_id IS NULL THEN
    SELECT id INTO seed_user_id FROM auth.users ORDER BY created_at ASC LIMIT 1;
    IF seed_user_id IS NOT NULL THEN
      INSERT INTO public.community_channels (slug, name, description, created_by)
      VALUES ('generale', 'Generale', 'Discussioni generali su mercati, portafogli e strategie.', seed_user_id)
      RETURNING id INTO default_channel_id;
    END IF;
  END IF;

  IF default_channel_id IS NOT NULL THEN
    UPDATE public.community_posts SET channel_id = default_channel_id WHERE channel_id IS NULL;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.community_recalc_channel_post_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  target_channel UUID := COALESCE(NEW.channel_id, OLD.channel_id);
BEGIN
  IF target_channel IS NOT NULL THEN
    UPDATE public.community_channels
    SET post_count = (SELECT COUNT(*) FROM public.community_posts WHERE channel_id = target_channel)
    WHERE id = target_channel;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS community_posts_channel_recalc ON public.community_posts;
CREATE TRIGGER community_posts_channel_recalc
  AFTER INSERT OR DELETE ON public.community_posts
  FOR EACH ROW EXECUTE FUNCTION public.community_recalc_channel_post_count();

-- ── Usernames ───────────────────────────────────────────────────────────
-- A real, user-chosen, unique handle — separate from profiles.display_name
-- (which is free-form and not unique). Nullable: existing users are
-- prompted to pick one the first time they try to post/comment/create a
-- channel; until then community_set_author_name() below falls back to
-- their auth.users-derived name.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username TEXT;

DO $$ BEGIN
  ALTER TABLE public.profiles ADD CONSTRAINT profiles_username_unique UNIQUE (username);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE public.profiles ADD CONSTRAINT profiles_username_format CHECK (username IS NULL OR username ~ '^[a-z0-9_]{3,20}$');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Replaces the version from the previous migration: now prefers the
-- user's chosen profiles.username over the auth.users-derived name.
-- Definition-owner SECURITY DEFINER already lets this read auth.users and
-- (now also) profiles regardless of either table's own-row-only RLS —
-- same mechanism the pre-existing handle_new_user() trigger relies on.
-- Note: this only stamps author_name at INSERT time, so a username chosen
-- *after* a post/comment was published does not retroactively rename it —
-- same tradeoff already accepted for the denormalized author_name design.
CREATE OR REPLACE FUNCTION public.community_set_author_name()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  resolved_name TEXT;
BEGIN
  SELECT COALESCE(
    (SELECT username FROM public.profiles WHERE id = NEW.user_id),
    (SELECT COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', split_part(email,'@',1))
       FROM auth.users WHERE id = NEW.user_id),
    'Utente'
  ) INTO resolved_name;
  NEW.author_name := resolved_name;
  RETURN NEW;
END;
$$;
