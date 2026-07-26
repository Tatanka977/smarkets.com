import { supabase } from "@/integrations/supabase/client";

export interface AppNotification {
  id: string;
  user_id: string;
  type: "post_comment" | "price_alert" | "post_vote" | "comment_vote";
  title: string;
  body: string | null;
  link_type: "post" | "symbol" | null;
  link_id: string | null;
  read: boolean;
  created_at: string;
}

export async function listNotifications(): Promise<AppNotification[]> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) return [];
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data || []) as AppNotification[];
}

export async function getUnreadNotificationCount(): Promise<number> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) return 0;
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("read", false);
  if (error) throw error;
  return count || 0;
}

export async function markNotificationRead({ data }: { data: { id: string } }): Promise<{ ok: true }> {
  const { error } = await supabase.from("notifications").update({ read: true }).eq("id", data.id);
  if (error) throw error;
  return { ok: true };
}

export async function markAllNotificationsRead(): Promise<{ ok: true }> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) return { ok: true };
  const { error } = await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
  if (error) throw error;
  return { ok: true };
}

// Used client-side for price alerts, fired from PortfolioTerminal's
// refreshPrices watchlist check — everything else (community activity)
// is created server-side by DB triggers.
export async function createNotification(
  { data }: { data: { type: "price_alert"; title: string; body?: string; linkType?: "symbol"; linkId?: string } }
): Promise<{ ok: true }> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) throw new Error("Not signed in");
  const { error } = await supabase.from("notifications").insert({
    user_id: user.id,
    type: data.type,
    title: data.title,
    body: data.body ?? null,
    link_type: data.linkType ?? null,
    link_id: data.linkId ?? null,
  });
  if (error) throw error;
  return { ok: true };
}
