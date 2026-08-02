-- Step titles for the 9 still-unpublished lesson_groups added in
-- 20260802100000_add-learn-lessons.sql. Structure only — no lesson
-- content (body/question/options) is added here, and the groups
-- themselves stay is_published = false, so these groups still render as
-- "Coming soon" in the Learn path and remain unreachable in the UI; this
-- just gets their step outline in place ahead of writing real lessons.
-- Idempotent: each block only inserts if the group exists and doesn't
-- already have steps, so this is safe to run again.
DO $$
DECLARE
  gid UUID;
BEGIN
  SELECT id INTO gid FROM public.lesson_groups WHERE title = 'How Markets Work';
  IF gid IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.lesson_steps WHERE group_id = gid) THEN
    INSERT INTO public.lesson_steps (group_id, title, order_index) VALUES
      (gid, 'What is a market?', 1),
      (gid, 'Buyers, sellers, and price', 2),
      (gid, 'Exchanges and how trades happen', 3),
      (gid, 'Market participants', 4),
      (gid, 'Bull and bear markets', 5);
  END IF;

  SELECT id INTO gid FROM public.lesson_groups WHERE title = 'Stocks & Ownership';
  IF gid IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.lesson_steps WHERE group_id = gid) THEN
    INSERT INTO public.lesson_steps (group_id, title, order_index) VALUES
      (gid, 'What is a stock?', 1),
      (gid, 'Shareholders and rights', 2),
      (gid, 'Dividends explained', 3),
      (gid, 'Market cap and valuation basics', 4),
      (gid, 'IPOs: going public', 5);
  END IF;

  SELECT id INTO gid FROM public.lesson_groups WHERE title = 'Bonds & Fixed Income';
  IF gid IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.lesson_steps WHERE group_id = gid) THEN
    INSERT INTO public.lesson_steps (group_id, title, order_index) VALUES
      (gid, 'What is a bond?', 1),
      (gid, 'Interest rates and bond prices', 2),
      (gid, 'Credit ratings and default risk', 3),
      (gid, 'Types of bonds', 4),
      (gid, 'Bonds vs stocks', 5);
  END IF;

  SELECT id INTO gid FROM public.lesson_groups WHERE title = 'Funds & Diversification';
  IF gid IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.lesson_steps WHERE group_id = gid) THEN
    INSERT INTO public.lesson_steps (group_id, title, order_index) VALUES
      (gid, 'What is diversification?', 1),
      (gid, 'Mutual funds explained', 2),
      (gid, 'ETFs explained', 3),
      (gid, 'Index funds and passive investing', 4),
      (gid, 'Expense ratios and fees', 5);
  END IF;

  SELECT id INTO gid FROM public.lesson_groups WHERE title = 'Risk & Volatility';
  IF gid IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.lesson_steps WHERE group_id = gid) THEN
    INSERT INTO public.lesson_steps (group_id, title, order_index) VALUES
      (gid, 'What is risk?', 1),
      (gid, 'Understanding volatility', 2),
      (gid, 'Risk vs reward', 3),
      (gid, 'Time horizon and risk tolerance', 4),
      (gid, 'Managing downside risk', 5);
  END IF;

  SELECT id INTO gid FROM public.lesson_groups WHERE title = 'Portfolio Construction & Asset Allocation';
  IF gid IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.lesson_steps WHERE group_id = gid) THEN
    INSERT INTO public.lesson_steps (group_id, title, order_index) VALUES
      (gid, 'What is asset allocation?', 1),
      (gid, 'Building a balanced portfolio', 2),
      (gid, 'Rebalancing explained', 3),
      (gid, 'Correlation between assets', 4),
      (gid, 'Age and life-stage allocation', 5);
  END IF;

  SELECT id INTO gid FROM public.lesson_groups WHERE title = 'Reading Financial Data & Ratios';
  IF gid IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.lesson_steps WHERE group_id = gid) THEN
    INSERT INTO public.lesson_steps (group_id, title, order_index) VALUES
      (gid, 'Reading a stock quote', 1),
      (gid, 'Understanding the P/E ratio', 2),
      (gid, 'Earnings and revenue basics', 3),
      (gid, 'Reading a balance sheet', 4),
      (gid, 'Key financial ratios', 5);
  END IF;

  SELECT id INTO gid FROM public.lesson_groups WHERE title = 'Behavioral Finance & Investor Psychology';
  IF gid IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.lesson_steps WHERE group_id = gid) THEN
    INSERT INTO public.lesson_steps (group_id, title, order_index) VALUES
      (gid, 'Why we make irrational decisions', 1),
      (gid, 'Loss aversion', 2),
      (gid, 'Herd mentality', 3),
      (gid, 'Overconfidence bias', 4),
      (gid, 'Staying disciplined during volatility', 5);
  END IF;

  SELECT id INTO gid FROM public.lesson_groups WHERE title = 'Macro Context';
  IF gid IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.lesson_steps WHERE group_id = gid) THEN
    INSERT INTO public.lesson_steps (group_id, title, order_index) VALUES
      (gid, 'What is inflation?', 1),
      (gid, 'Interest rates and the economy', 2),
      (gid, 'Central banks explained', 3),
      (gid, 'Economic cycles', 4),
      (gid, 'How global events affect markets', 5);
  END IF;
END $$;
