-- A free-text bio for the profile page's "About me" box. Lives on the
-- existing profiles table (not investor_profiles, which is onboarding
-- data with its own distinct shape) since a bio is general identity
-- info, same category as display_name/username. No RLS change needed:
-- the existing own-row-only select/update policies already cover it.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio TEXT;
