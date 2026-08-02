-- Shortens the 3 seeded lesson bodies in "Money & Saving Fundamentals" —
-- the originals ran long for a quiz-style lesson where attention is short.
-- Matched by title (unique among seeded lessons); question/options/
-- correct_option_index are untouched and still hold given the shorter text.
UPDATE public.lessons SET body =
  'Before investing, most educators suggest building an emergency fund: money in an easily accessible account, separate from your investments. Its job is covering surprises — a medical bill, a job loss — without forcing you to sell investments at a bad time.'
  WHERE title = 'The emergency fund';

UPDATE public.lessons SET body =
  'Saving means keeping money safe and accessible — priority is stability. Investing means buying assets that can grow over time but can also lose value short-term. Save what you need soon; invest what you can leave untouched for years.'
  WHERE title = 'Saving vs investing';

UPDATE public.lessons SET body =
  'Time is one of an investor''s biggest advantages. Once invested, growth can itself start growing — compounding. The earlier you start, the more time that snowball has to work, which is why ''I''ll invest once I have more'' is such a common trap.'
  WHERE title = 'The cost of waiting';
