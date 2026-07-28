type Portfolio = { id: string; name: string; holdings: any[]; updated_at: string };
type Watchlist = { id: string; symbol: string; name?: string; category?: string; created_at: string; target_price?: number | null; direction?: "above" | "below" | null };
type Convo = { id: string; title: string; messages: any[]; updated_at: string };

import { supabase } from "@/integrations/supabase/client";

export async function savePortfolio({ data }: { data: { name: string; holdings: any[] } }): Promise<Portfolio> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) throw new Error("Not signed in");
  const { data: row, error } = await supabase
    .from("portfolios")
    .insert({ user_id: user.id, name: data.name, holdings: data.holdings })
    .select()
    .single();
  if (error) throw error;
  return row as Portfolio;
}

export async function listPortfolios(): Promise<Portfolio[]> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) return [];
  const { data, error } = await supabase
    .from("portfolios")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data || []) as Portfolio[];
}

export async function deletePortfolio({ data }: { data: { id: string } }): Promise<{ ok: true }> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) throw new Error("Not signed in");
  // RLS already scopes this to the caller's own rows — the explicit
  // user_id filter is defense in depth, not the primary guard.
  const { error } = await supabase.from("portfolios").delete().eq("id", data.id).eq("user_id", user.id);
  if (error) throw error;
  return { ok: true };
}

export async function addToWatchlist({ data }: { data: { symbol: string; name?: string; category?: string; target_price?: number | null; direction?: "above" | "below" | null } }): Promise<Watchlist> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) throw new Error("Not signed in");
  const { data: row, error } = await supabase
    .from("watchlist")
    .upsert({
      user_id: user.id, symbol: data.symbol, name: data.name, category: data.category,
      target_price: data.target_price ?? null, direction: data.direction ?? null,
    }, { onConflict: "user_id,symbol" })
    .select()
    .single();
  if (error) throw error;
  return row as Watchlist;
}

export async function listWatchlist(): Promise<Watchlist[]> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) return [];
  const { data, error } = await supabase
    .from("watchlist")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as Watchlist[];
}

export async function deleteWatchlist({ data }: { data: { id: string } }): Promise<{ ok: true }> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) throw new Error("Not signed in");
  const { error } = await supabase.from("watchlist").delete().eq("id", data.id).eq("user_id", user.id);
  if (error) throw error;
  return { ok: true };
}

export async function updateWatchlistAlert({ data }: { data: { id: string; target_price: number | null; direction: "above" | "below" | null } }): Promise<{ ok: true }> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) throw new Error("Not signed in");
  const { error } = await supabase
    .from("watchlist")
    .update({ target_price: data.target_price, direction: data.direction })
    .eq("id", data.id)
    .eq("user_id", user.id);
  if (error) throw error;
  return { ok: true };
}

export async function saveConversation({ data }: { data: { title: string; messages: any[] } }): Promise<Convo> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) throw new Error("Not signed in");
  const { data: row, error } = await supabase
    .from("ai_conversations")
    .insert({ user_id: user.id, title: data.title, messages: data.messages })
    .select()
    .single();
  if (error) throw error;
  return row as Convo;
}

export async function listConversations(): Promise<Convo[]> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) return [];
  const { data, error } = await supabase
    .from("ai_conversations")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data || []) as Convo[];
}

export async function deleteConversation({ data }: { data: { id: string } }): Promise<{ ok: true }> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) throw new Error("Not signed in");
  const { error } = await supabase.from("ai_conversations").delete().eq("id", data.id).eq("user_id", user.id);
  if (error) throw error;
  return { ok: true };
}

export interface MyProfile {
  display_name: string | null;
  username: string | null;
  bio: string | null;
  created_at: string;
}

// One round trip for everything the profile page's header needs: name,
// handle, bio, and the real signup date (profiles.created_at is set by
// the handle_new_user() trigger at the same moment auth.users gets the
// row, so it's an exact account-creation timestamp, not an approximation).
export async function getMyProfile(): Promise<MyProfile | null> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("display_name, username, bio, created_at")
    .eq("id", user.id)
    .maybeSingle();
  if (error) throw error;
  return data as MyProfile | null;
}

export async function updateProfile({ data }: { data: { display_name?: string; bio?: string } }): Promise<{ display_name?: string; bio?: string }> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) throw new Error("Not signed in");
  const update: Record<string, any> = { updated_at: new Date().toISOString() };
  if (data.display_name !== undefined) update.display_name = data.display_name;
  if (data.bio !== undefined) update.bio = data.bio;
  const { error } = await supabase.from("profiles").update(update).eq("id", user.id);
  if (error) throw error;
  return data;
}

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

export async function getMyUsername(): Promise<string | null> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .maybeSingle();
  if (error) throw error;
  return (data as any)?.username ?? null;
}

export async function setUsername({ data }: { data: { username: string } }): Promise<{ username: string }> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) throw new Error("Not signed in");
  const username = data.username.trim().toLowerCase();
  if (!USERNAME_RE.test(username)) {
    throw new Error("Username must be 3-20 characters: lowercase letters, numbers, underscore.");
  }
  // upsert rather than update: a profiles row should always exist (created
  // by the handle_new_user() signup trigger), but if one is ever missing
  // for a given user an update() would silently affect zero rows instead
  // of erroring, making the UI think the username saved when it didn't.
  const { error } = await supabase
    .from("profiles")
    .upsert({ id: user.id, username, updated_at: new Date().toISOString() }, { onConflict: "id" });
  if (error) {
    if ((error as any).code === "23505") throw new Error("Username already taken, choose another one.");
    throw error;
  }
  return { username };
}
export interface InvestorProfile {
  age_range?: string;
  investment_goal?: string;
  time_horizon?: string;
  risk_tolerance?: string;
  experience_level?: string;
  onboarding_skipped?: boolean;
}

export async function getInvestorProfile(): Promise<InvestorProfile | null> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) return null;
  const { data, error } = await supabase
    .from("investor_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw error;
  return data as InvestorProfile | null;
}

export async function saveInvestorProfile({ data }: { data: InvestorProfile }): Promise<InvestorProfile> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) throw new Error("Not signed in");
  const { data: row, error } = await supabase
    .from("investor_profiles")
    .upsert({ user_id: user.id, ...data, updated_at: new Date().toISOString() })
    .select()
    .single();
  if (error) throw error;
  return row as InvestorProfile;
}

export async function skipOnboarding(): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) return;
  await supabase.from("investor_profiles").upsert({ user_id: user.id, onboarding_skipped: true });
}
export async function upsertSnapshot({ data }: { data: { date: string; value: number } }): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) return;
  await supabase.from("portfolio_snapshots").upsert({
    user_id: user.id,
    snapshot_date: data.date,
    total_value: data.value,
  });
}

export async function getSnapshots(): Promise<{ snapshot_date: string; total_value: number }[]> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) return [];
  const { data, error } = await supabase
    .from("portfolio_snapshots")
    .select("snapshot_date, total_value")
    .eq("user_id", user.id)
    .order("snapshot_date", { ascending: true });
  if (error) throw error;
  return data || [];
}
