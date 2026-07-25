-- The profile page's "Investor profile" tab reported not saving. The
-- likely root cause: investor_profiles (added defensively months ago
-- because it was already queried by code but absent from this repo's
-- migrations) was, like public.profiles turned out to be, never actually
-- applied to the live project. Re-run here, safe regardless of prior
-- state, using EXCEPTION WHEN duplicate_object for policies rather than
-- an IF NOT EXISTS-via-SELECT guard — more robust against partial re-runs,
-- the same lesson already applied to every later migration in this repo.
CREATE TABLE IF NOT EXISTS public.investor_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  age_range TEXT,
  investment_goal TEXT,
  time_horizon TEXT,
  risk_tolerance TEXT,
  experience_level TEXT,
  onboarding_skipped BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.investor_profiles TO authenticated;
GRANT ALL ON public.investor_profiles TO service_role;
ALTER TABLE public.investor_profiles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "own investor profile select" ON public.investor_profiles FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "own investor profile insert" ON public.investor_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "own investor profile update" ON public.investor_profiles FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- portfolio_snapshots (upsertSnapshot/getSnapshots) shares the same
-- "queried by code, absent from migrations" history — ensure it too.
CREATE TABLE IF NOT EXISTS public.portfolio_snapshots (
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  total_value NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, snapshot_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.portfolio_snapshots TO authenticated;
GRANT ALL ON public.portfolio_snapshots TO service_role;
ALTER TABLE public.portfolio_snapshots ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "own snapshots" ON public.portfolio_snapshots FOR ALL
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS portfolio_snapshots_user_idx ON public.portfolio_snapshots(user_id, snapshot_date DESC);
