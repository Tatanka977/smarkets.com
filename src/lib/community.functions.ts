import { supabase } from "@/integrations/supabase/client";

export interface CommunityPost {
  id: string;
  user_id: string;
  author_name: string;
  title: string;
  body: string;
  score: number;
  comment_count: number;
  created_at: string;
}

export interface CommunityComment {
  id: string;
  post_id: string;
  user_id: string;
  author_name: string;
  body: string;
  created_at: string;
}

export async function listCommunityPosts({ data }: { data: { sort: "recent" | "top" } }): Promise<CommunityPost[]> {
  let q = supabase.from("community_posts").select("*");
  q = data.sort === "top"
    ? q.order("score", { ascending: false }).order("created_at", { ascending: false })
    : q.order("created_at", { ascending: false });
  const { data: rows, error } = await q;
  if (error) throw error;
  return (rows || []) as CommunityPost[];
}

export async function getCommunityPost({ data }: { data: { id: string } }): Promise<CommunityPost | null> {
  const { data: row, error } = await supabase
    .from("community_posts")
    .select("*")
    .eq("id", data.id)
    .maybeSingle();
  if (error) throw error;
  return row as CommunityPost | null;
}

export async function createCommunityPost(
  { data }: { data: { title: string; body: string } }
): Promise<CommunityPost> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData?.user;
  if (!user) throw new Error("Not signed in");
  const title = data.title.trim();
  const body = data.body.trim();
  if (!title || !body) throw new Error("Titolo e testo sono obbligatori");
  // author_name is intentionally omitted: a DB trigger resolves it
  // server-side from auth.users so a client can't impersonate another name.
  const { data: row, error } = await supabase
    .from("community_posts")
    .insert({ user_id: user.id, title, body })
    .select()
    .single();
  if (error) throw error;
  return row as CommunityPost;
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
  if (!body) throw new Error("Il commento non può essere vuoto");
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
