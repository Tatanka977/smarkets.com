-- Notify a post/comment owner when someone else upvotes it. Mirrors the
-- existing community_notify_post_comment trigger. Self-votes and
-- downvotes don't notify — only a genuine transition INTO an upvote
-- (fresh insert with value=1, or a flip from a previous value to 1) fires,
-- so toggling the same upvote off/on repeatedly or downvoting doesn't spam
-- the owner.
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('post_comment', 'price_alert', 'post_vote', 'comment_vote'));

CREATE OR REPLACE FUNCTION public.community_notify_post_vote()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  post_owner UUID;
  post_title TEXT;
  voter_name TEXT;
BEGIN
  IF NEW.value = 1 AND (TG_OP = 'INSERT' OR OLD.value IS DISTINCT FROM NEW.value) THEN
    SELECT user_id, title INTO post_owner, post_title FROM public.community_posts WHERE id = NEW.post_id;
    IF post_owner IS NOT NULL AND post_owner <> NEW.user_id THEN
      SELECT username INTO voter_name FROM public.profiles WHERE id = NEW.user_id;
      INSERT INTO public.notifications (user_id, type, title, body, link_type, link_id)
      VALUES (
        post_owner,
        'post_vote',
        'New upvote on "' || left(COALESCE(post_title, 'your post'), 80) || '"',
        COALESCE(voter_name, 'Someone') || ' upvoted your post',
        'post',
        NEW.post_id::text
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS community_votes_notify ON public.community_votes;
CREATE TRIGGER community_votes_notify
  AFTER INSERT OR UPDATE ON public.community_votes
  FOR EACH ROW EXECUTE FUNCTION public.community_notify_post_vote();

CREATE OR REPLACE FUNCTION public.community_notify_comment_vote()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  comment_owner UUID;
  comment_post_id UUID;
  voter_name TEXT;
BEGIN
  IF NEW.value = 1 AND (TG_OP = 'INSERT' OR OLD.value IS DISTINCT FROM NEW.value) THEN
    SELECT user_id, post_id INTO comment_owner, comment_post_id FROM public.community_comments WHERE id = NEW.comment_id;
    IF comment_owner IS NOT NULL AND comment_owner <> NEW.user_id THEN
      SELECT username INTO voter_name FROM public.profiles WHERE id = NEW.user_id;
      INSERT INTO public.notifications (user_id, type, title, body, link_type, link_id)
      VALUES (
        comment_owner,
        'comment_vote',
        'New upvote on your comment',
        COALESCE(voter_name, 'Someone') || ' upvoted your comment',
        'post',
        comment_post_id::text
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS community_comment_votes_notify ON public.community_comment_votes;
CREATE TRIGGER community_comment_votes_notify
  AFTER INSERT OR UPDATE ON public.community_comment_votes
  FOR EACH ROW EXECUTE FUNCTION public.community_notify_comment_vote();
