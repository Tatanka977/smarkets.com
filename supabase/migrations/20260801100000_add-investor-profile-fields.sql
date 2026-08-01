-- Extends investor_profiles with the new onboarding questions (see
-- INVESTOR_PROFILE_FIELDS in src/components/OnboardingQuestionnaire.tsx).
-- Additive, nullable TEXT columns, same as every existing column on this
-- table — no RLS/policy changes needed, they already cover the whole row.
ALTER TABLE public.investor_profiles
  ADD COLUMN IF NOT EXISTS has_started_investing TEXT,
  ADD COLUMN IF NOT EXISTS current_allocation_mix TEXT,
  ADD COLUMN IF NOT EXISTS interests TEXT,
  ADD COLUMN IF NOT EXISTS management_style TEXT,
  ADD COLUMN IF NOT EXISTS has_emergency_fund TEXT,
  ADD COLUMN IF NOT EXISTS familiar_with_metrics TEXT;
