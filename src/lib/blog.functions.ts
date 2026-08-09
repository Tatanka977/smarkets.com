import { supabase } from "@/integrations/supabase/client";

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  source_name?: string | null;
  source_url?: string | null;
  image_url?: string | null;
  created_at: string;
}

export async function listBlogPosts(): Promise<BlogPost[]> {
  const { data, error } = await supabase
    .from("blog_posts")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as BlogPost[];
}

export async function getBlogPostBySlug(slug: string): Promise<BlogPost | null> {
  const { data, error } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return data as BlogPost | null;
}

function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${base}-${suffix}`;
}

export async function createBlogPost(input: {
  title: string;
  content: string;
  excerpt?: string;
  sourceName?: string;
  sourceUrl?: string;
  imageUrl?: string;
}): Promise<BlogPost> {
  const excerpt = input.excerpt?.trim() || input.content.trim().split("\n")[0].slice(0, 180);
  const { data, error } = await supabase
    .from("blog_posts")
    .insert({
      slug: slugify(input.title),
      title: input.title.trim(),
      excerpt,
      content: input.content.trim(),
      source_name: input.sourceName || null,
      source_url: input.sourceUrl || null,
      image_url: input.imageUrl || null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as BlogPost;
}

export async function deleteBlogPost(id: string): Promise<void> {
  const { error } = await supabase.from("blog_posts").delete().eq("id", id);
  if (error) throw error;
}
