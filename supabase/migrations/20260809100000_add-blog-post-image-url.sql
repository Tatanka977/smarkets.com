-- Optional cover image for blog posts, author-supplied (a pasted URL, never
-- generated) -- nullable so every post created before this migration keeps
-- working unchanged; the UI falls back to a CSS-only placeholder for those.
-- No new grants/policies needed: the table-level GRANT/RLS from
-- 20260803100000_add-blog-posts.sql already covers every column, this one
-- included.
ALTER TABLE public.blog_posts ADD COLUMN IF NOT EXISTS image_url TEXT;
