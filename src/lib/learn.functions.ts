import { supabase } from "@/integrations/supabase/client";

export interface Lesson {
  id: string;
  step_id: string;
  title: string;
  order_index: number;
  body: string;
  question: string;
  options: string[];
  correct_option_index: number;
}

export interface LessonStep {
  id: string;
  group_id: string;
  title: string;
  order_index: number;
  // Only PUBLISHED lessons — an empty array here means "no content yet",
  // rendered as a "coming soon" step regardless of unlock order (see
  // computeLearnPath in LearnPage.tsx).
  lessons: Lesson[];
}

export interface LessonGroup {
  id: string;
  title: string;
  description: string | null;
  order_index: number;
  is_published: boolean;
  steps: LessonStep[];
}

export interface LearnStreak {
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
}

export interface LearnData {
  groups: LessonGroup[];
  completedLessonIds: string[];
  streak: LearnStreak;
}

const EMPTY_STREAK: LearnStreak = { current_streak: 0, longest_streak: 0, last_activity_date: null };

// One combined fetch for the whole Learn tab: every group/step and their
// PUBLISHED lessons (content is public — see the migration's RLS notes —
// but the UI itself only ever shows/plays published lessons), plus the
// signed-in user's completed-lesson set and streak. The path/unlock state
// itself is computed client-side in LearnPage.tsx, not here, since it's
// pure render logic over this data rather than something worth a round trip.
export async function getLearnData(): Promise<LearnData> {
  const [{ data: groupsData, error: groupsErr }, { data: stepsData, error: stepsErr }, { data: lessonsData, error: lessonsErr }] = await Promise.all([
    supabase.from("lesson_groups").select("*").order("order_index"),
    supabase.from("lesson_steps").select("*").order("order_index"),
    supabase.from("lessons").select("*").eq("is_published", true).order("order_index"),
  ]);
  if (groupsErr) throw groupsErr;
  if (stepsErr) throw stepsErr;
  if (lessonsErr) throw lessonsErr;

  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;

  let completedLessonIds: string[] = [];
  let streak: LearnStreak = EMPTY_STREAK;

  if (user) {
    const [{ data: progressData }, { data: streakData }] = await Promise.all([
      supabase.from("user_lesson_progress").select("lesson_id").eq("user_id", user.id),
      supabase.from("user_learn_streaks").select("current_streak, longest_streak, last_activity_date").eq("user_id", user.id).maybeSingle(),
    ]);
    completedLessonIds = (progressData || []).map((r: any) => r.lesson_id);
    if (streakData) streak = streakData as LearnStreak;
  }

  const lessonsByStep = new Map<string, Lesson[]>();
  (lessonsData || []).forEach((l: any) => {
    const arr = lessonsByStep.get(l.step_id) || [];
    arr.push({ ...l, options: (l.options || []) as string[] });
    lessonsByStep.set(l.step_id, arr);
  });

  const stepsByGroup = new Map<string, LessonStep[]>();
  (stepsData || []).forEach((s: any) => {
    const arr = stepsByGroup.get(s.group_id) || [];
    arr.push({ ...s, lessons: lessonsByStep.get(s.id) || [] });
    stepsByGroup.set(s.group_id, arr);
  });

  const groups: LessonGroup[] = (groupsData || []).map((g: any) => ({
    ...g,
    steps: stepsByGroup.get(g.id) || [],
  }));

  return { groups, completedLessonIds, streak };
}

function isYesterday(dateStr: string, todayStr: string): boolean {
  const d = new Date(dateStr + "T00:00:00Z").getTime();
  const today = new Date(todayStr + "T00:00:00Z").getTime();
  return Math.round((today - d) / 86400000) === 1;
}

// Daily streak update: +1 if the last recorded activity was yesterday,
// unchanged if it was already today (so several lessons in one day only
// count once), reset to 1 after any gap of more than a day (or no prior
// activity at all).
async function touchLearnStreak(userId: string): Promise<LearnStreak> {
  const { data: existing } = await supabase
    .from("user_learn_streaks")
    .select("current_streak, longest_streak, last_activity_date")
    .eq("user_id", userId)
    .maybeSingle();

  const todayStr = new Date().toISOString().slice(0, 10);
  const last = existing?.last_activity_date as string | null | undefined;

  let current = existing?.current_streak ?? 0;
  if (last === todayStr) {
    // already counted today — no change
  } else if (last && isYesterday(last, todayStr)) {
    current += 1;
  } else {
    current = 1;
  }
  const longest = Math.max(existing?.longest_streak ?? 0, current);

  const { data: row, error } = await supabase
    .from("user_learn_streaks")
    .upsert({ user_id: userId, current_streak: current, longest_streak: longest, last_activity_date: todayStr })
    .select("current_streak, longest_streak, last_activity_date")
    .single();
  if (error) throw error;
  return row as LearnStreak;
}

// Records a lesson completion and updates the daily streak. correct_on_first_try
// is immutable once set (ignoreDuplicates: replaying an already-completed
// lesson later can't retroactively change whether the ORIGINAL attempt was
// right), but the streak still updates on every completion — replaying a
// lesson is still "showing up today".
export async function completeLesson({ data }: { data: { lessonId: string; correctOnFirstTry: boolean } }): Promise<LearnStreak> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) throw new Error("Not signed in");

  const { error: progressError } = await supabase
    .from("user_lesson_progress")
    .upsert(
      { user_id: user.id, lesson_id: data.lessonId, correct_on_first_try: data.correctOnFirstTry },
      { onConflict: "user_id,lesson_id", ignoreDuplicates: true }
    );
  if (progressError) throw progressError;

  return touchLearnStreak(user.id);
}
