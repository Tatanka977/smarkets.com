import { supabase } from "@/integrations/supabase/client";

export interface CommunityChannel {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  created_by: string;
  post_count: number;
  created_at: string;
}

export interface PortfolioSnapshotHolding {
  ticker: string;
  name: string;
  category: string;
  sector: string | null;
  value: number;
  weightPct: number;
  dayChangePct: number | null;
}

export interface PortfolioSnapshotMetrics {
  weightedReturn: number;
  weightedVol: number;
  weightedBeta: number;
  weightedDividendYield: number;
  weightedDayChangePct: number;
  sharpe: number;
  hhi: number;
  sectorCount: number;
  geoCount: number;
}

export interface PortfolioSnapshotAlert {
  sev: "HIGH" | "MED" | "LOW" | "OK";
  title: string;
  detail: string;
  metric: string;
}

export interface PortfolioSnapshotAllocationSlice {
  name: string;
  value: number;
  pct: number;
}

export interface PortfolioSnapshot {
  totalValue: number;
  baseCurrency: string;
  sourceName: string;
  holdings: PortfolioSnapshotHolding[];
  // Optional: posts shared before this shape existed only have the fields
  // above — every reader must tolerate these being absent, not just empty.
  metrics?: PortfolioSnapshotMetrics;
  alerts?: PortfolioSnapshotAlert[];
  allocationByCategory?: PortfolioSnapshotAllocationSlice[];
  allocationBySector?: PortfolioSnapshotAllocationSlice[];
  allocationByGeo?: PortfolioSnapshotAllocationSlice[];
}

export type CommunityPostType = "portfolio_review" | "question" | "discussion" | "market_talk";

export interface CommunityPost {
  id: string;
  user_id: string;
  channel_id: string | null;
  author_name: string;
  title: string;
  body: string;
  post_type: CommunityPostType;
  score: number;
  comment_count: number;
  portfolio_snapshot: PortfolioSnapshot | null;
  created_at: string;
  // Present only on rows from listAllCommunityPosts (the aggregated Home
  // feed), which embeds the parent channel via the community_posts ->
  // community_channels FK so each card can show a channel badge without a
  // second round trip.
  community_channels?: { name: string; slug: string } | null;
}

export interface CommunityComment {
  id: string;
  post_id: string;
  user_id: string;
  author_name: string;
  body: string;
  score: number;
  created_at: string;
}

function slugifyChannel(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30);
  return base.length >= 3 ? base : `canale-${base}`.slice(0, 30);
}

export async function listChannels(): Promise<CommunityChannel[]> {
  const { data, error } = await supabase
    .from("community_channels")
    .select("*")
    .order("post_count", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as CommunityChannel[];
}

export async function createChannel(
  { data }: { data: { name: string; description?: string } }
): Promise<CommunityChannel> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) throw new Error("Not signed in");
  const name = data.name.trim();
  if (!name) throw new Error("Channel name is required");
  const { data: row, error } = await supabase
    .from("community_channels")
    .insert({ created_by: user.id, name, description: data.description?.trim() || null, slug: slugifyChannel(name) })
    .select()
    .single();
  if (error) {
    if ((error as any).code === "23505") throw new Error("A channel with a very similar name already exists — try another one.");
    throw error;
  }
  return row as CommunityChannel;
}

export async function deleteCommunityChannel({ data }: { data: { id: string } }): Promise<{ ok: true }> {
  const { error } = await supabase.from("community_channels").delete().eq("id", data.id);
  if (error) throw error;
  return { ok: true };
}

export async function listCommunityPosts(
  { data }: { data: { sort: "recent" | "top"; channelId: string } }
): Promise<CommunityPost[]> {
  let q = supabase.from("community_posts").select("*").eq("channel_id", data.channelId);
  q = data.sort === "top"
    ? q.order("score", { ascending: false }).order("created_at", { ascending: false })
    : q.order("created_at", { ascending: false });
  const { data: rows, error } = await q;
  if (error) throw error;
  return (rows || []) as CommunityPost[];
}

// The Reddit-style Home feed: posts across every channel, each annotated
// with its parent channel's name/slug via the community_posts ->
// community_channels FK (Supabase embeds it in one round trip). "trending"
// is deliberately simple — top score within the last 3 days — rather than
// a decayed hot-score formula, since this app's traffic doesn't need one.
export async function listAllCommunityPosts(
  { data }: { data: { sort: "recent" | "popular" | "trending" } }
): Promise<CommunityPost[]> {
  let q = supabase.from("community_posts").select("*, community_channels(name, slug)");
  if (data.sort === "trending") {
    const since = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    q = q.gte("created_at", since).order("score", { ascending: false }).order("created_at", { ascending: false });
  } else if (data.sort === "popular") {
    q = q.order("score", { ascending: false }).order("created_at", { ascending: false });
  } else {
    q = q.order("created_at", { ascending: false });
  }
  const { data: rows, error } = await q.limit(50);
  if (error) throw error;
  return (rows || []) as CommunityPost[];
}

export async function getCommunityPost({ data }: { data: { id: string } }): Promise<CommunityPost | null> {
  const { data: row, error } = await supabase
    .from("community_posts")
    .select("*, community_channels(name, slug)")
    .eq("id", data.id)
    .maybeSingle();
  if (error) throw error;
  return row as CommunityPost | null;
}

export async function createCommunityPost(
  { data }: { data: { title: string; body: string; channelId: string; postType?: CommunityPostType; portfolioSnapshot?: PortfolioSnapshot | null } }
): Promise<CommunityPost> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) throw new Error("Not signed in");
  const title = data.title.trim();
  const body = data.body.trim();
  if (!title || !body) throw new Error("Title and body are required");
  if (!data.channelId) throw new Error("Select a channel");
  // author_name is intentionally omitted: a DB trigger resolves it
  // server-side from auth.users/profiles.username so a client can't
  // impersonate another name.
  const { data: row, error } = await supabase
    .from("community_posts")
    .insert({
      user_id: user.id, title, body, channel_id: data.channelId,
      post_type: data.postType || "discussion",
      portfolio_snapshot: data.portfolioSnapshot ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return row as CommunityPost;
}

// Real (not estimated) counts for the "About" sidebar box: distinct users
// who have ever posted or commented, and total posts — scoped to one
// channel, or the whole community when channelId is omitted ("All Topics").
// No dedicated view/RPC: post/comment volume here is small enough that
// fetching just the id/user_id columns and deduping client-side is simpler
// and cheaper than adding a materialized aggregate.
export async function getCommunityAbout(
  { data }: { data: { channelId?: string } }
): Promise<{ postCount: number; memberCount: number }> {
  let postsQuery = supabase.from("community_posts").select("id, user_id");
  if (data.channelId) postsQuery = postsQuery.eq("channel_id", data.channelId);
  const { data: posts, error: postsErr } = await postsQuery;
  if (postsErr) throw postsErr;
  const postRows = posts || [];

  const postIds = postRows.map((p: any) => p.id);
  let commentUserIds: string[] = [];
  if (postIds.length) {
    const { data: comments, error: commentsErr } = await supabase
      .from("community_comments")
      .select("user_id")
      .in("post_id", postIds);
    if (commentsErr) throw commentsErr;
    commentUserIds = (comments || []).map((c: any) => c.user_id);
  }

  const memberSet = new Set<string>([...postRows.map((p: any) => p.user_id), ...commentUserIds]);
  return { postCount: postRows.length, memberCount: memberSet.size };
}

// Real per-channel post counts over the last 7 days, for the "Trending
// Topics" sidebar box — channels are this app's "topics". Sorted
// descending, capped to the top 5; the caller decides what "too little
// data to be meaningful" means (e.g. total count below some threshold)
// since that's a display judgment, not a data-fetching one.
export async function getTrendingChannels(): Promise<{ id: string; name: string; count: number }[]> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("community_posts")
    .select("channel_id, community_channels(name)")
    .gte("created_at", since);
  if (error) throw error;

  const counts = new Map<string, { name: string; count: number }>();
  (data || []).forEach((p: any) => {
    if (!p.channel_id) return;
    const name = p.community_channels?.name || "Unknown";
    const cur = counts.get(p.channel_id) || { name, count: 0 };
    cur.count += 1;
    counts.set(p.channel_id, cur);
  });

  return Array.from(counts.entries())
    .map(([id, v]) => ({ id, name: v.name, count: v.count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

export async function deleteCommunityPost({ data }: { data: { id: string } }): Promise<{ ok: true }> {
  const { error } = await supabase.from("community_posts").delete().eq("id", data.id);
  if (error) throw error;
  return { ok: true };
}

export async function listCommunityComments({ data }: { data: { postId: string } }): Promise<CommunityComment[]> {
  const { data: rows, error } = await supabase
    .from("community_comments")
    .select("*")
    .eq("post_id", data.postId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (rows || []) as CommunityComment[];
}

export async function createCommunityComment(
  { data }: { data: { postId: string; body: string } }
): Promise<CommunityComment> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) throw new Error("Not signed in");
  const body = data.body.trim();
  if (!body) throw new Error("Comment cannot be empty");
  const { data: row, error } = await supabase
    .from("community_comments")
    .insert({ post_id: data.postId, user_id: user.id, body })
    .select()
    .single();
  if (error) throw error;
  return row as CommunityComment;
}

export async function deleteCommunityComment({ data }: { data: { id: string } }): Promise<{ ok: true }> {
  const { error } = await supabase.from("community_comments").delete().eq("id", data.id);
  if (error) throw error;
  return { ok: true };
}

export async function listMyVotes({ data }: { data: { postIds: string[] } }): Promise<Record<string, number>> {
  if (!data.postIds.length) return {};
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) return {};
  const { data: rows, error } = await supabase
    .from("community_votes")
    .select("post_id,value")
    .eq("user_id", user.id)
    .in("post_id", data.postIds);
  if (error) throw error;
  return Object.fromEntries((rows || []).map((r: any) => [r.post_id, r.value]));
}

export async function setVote({ data }: { data: { postId: string; value: 1 | -1 } }): Promise<{ ok: true }> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) throw new Error("Not signed in");
  const { error } = await supabase
    .from("community_votes")
    .upsert({ post_id: data.postId, user_id: user.id, value: data.value }, { onConflict: "post_id,user_id" });
  if (error) throw error;
  return { ok: true };
}

export async function removeVote({ data }: { data: { postId: string } }): Promise<{ ok: true }> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) throw new Error("Not signed in");
  const { error } = await supabase
    .from("community_votes")
    .delete()
    .eq("post_id", data.postId)
    .eq("user_id", user.id);
  if (error) throw error;
  return { ok: true };
}

export async function listMyCommentVotes({ data }: { data: { commentIds: string[] } }): Promise<Record<string, number>> {
  if (!data.commentIds.length) return {};
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) return {};
  const { data: rows, error } = await supabase
    .from("community_comment_votes")
    .select("comment_id,value")
    .eq("user_id", user.id)
    .in("comment_id", data.commentIds);
  if (error) throw error;
  return Object.fromEntries((rows || []).map((r: any) => [r.comment_id, r.value]));
}

export async function setCommentVote({ data }: { data: { commentId: string; value: 1 | -1 } }): Promise<{ ok: true }> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) throw new Error("Not signed in");
  const { error } = await supabase
    .from("community_comment_votes")
    .upsert({ comment_id: data.commentId, user_id: user.id, value: data.value }, { onConflict: "comment_id,user_id" });
  if (error) throw error;
  return { ok: true };
}

export async function removeCommentVote({ data }: { data: { commentId: string } }): Promise<{ ok: true }> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) throw new Error("Not signed in");
  const { error } = await supabase
    .from("community_comment_votes")
    .delete()
    .eq("comment_id", data.commentId)
    .eq("user_id", user.id);
  if (error) throw error;
  return { ok: true };
}
