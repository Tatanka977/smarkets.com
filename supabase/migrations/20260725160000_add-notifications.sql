-- In-app notification tray: community activity (new comment on your post)
-- and price alerts (fired from the client's existing watchlist
-- target_price/direction check) both land here instead of only as a
-- browser Notification, which most users never grant permission for.
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('post_comment', 'price_alert')),
  title TEXT NOT NULL,
  body TEXT,
  link_type TEXT CHECK (link_type IS NULL OR link_type IN ('post', 'symbol')),
  link_id TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- INSERT is own-row-only for the client's own price-alert writes; the
-- comment-reply trigger below inserts a notification for a DIFFERENT user
-- (the post's owner, not the commenter) via SECURITY DEFINER, which — like
-- every other cross-user trigger write in this schema (post/comment score
-- recalc) — runs as the migration-owning role and bypasses RLS entirely,
-- so it isn't blocked by this own-row INSERT policy.
DO $$ BEGIN
  CREATE POLICY "own notifications select" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "own notifications insert" ON public.notifications FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "own notifications update" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "own notifications delete" ON public.notifications FOR DELETE USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS notifications_user_recent_idx ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_unread_idx ON public.notifications(user_id) WHERE read = false;

-- Notify a post's owner when someone else comments on it. Self-comments
-- (replying on your own post) don't notify — nothing to tell the owner
-- they don't already know.
CREATE OR REPLACE FUNCTION public.community_notify_post_comment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  post_owner UUID;
  post_title TEXT;
BEGIN
  SELECT user_id, title INTO post_owner, post_title FROM public.community_posts WHERE id = NEW.post_id;
  IF post_owner IS NOT NULL AND post_owner <> NEW.user_id THEN
    INSERT INTO public.notifications (user_id, type, title, body, link_type, link_id)
    VALUES (
      post_owner,
      'post_comment',
      'New comment on "' || left(COALESCE(post_title, 'your post'), 80) || '"',
      NEW.author_name || ': ' || left(NEW.body, 140),
      'post',
      NEW.post_id::text
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS community_comments_notify ON public.community_comments;
CREATE TRIGGER community_comments_notify
  AFTER INSERT ON public.community_comments
  FOR EACH ROW EXECUTE FUNCTION public.community_notify_post_comment();
