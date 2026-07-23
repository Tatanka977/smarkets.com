export interface BlogPost {
  slug: string;
  title: string;
  date: string; // YYYY-MM-DD
  excerpt: string;
  content: string; // paragraphs separated by a blank line
  sourceUrl?: string; // optional link to the original article you referenced (e.g. Yahoo Finance)
  sourceName?: string; // e.g. "Yahoo Finance"
}

// Add new posts at the TOP of this array (most recent first).
// "slug" must be unique and URL-safe (lowercase, hyphens, no spaces).
export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "welcome-to-strategic-markets",
    title: "Welcome to Strategic Markets",
    date: "2026-07-22",
    excerpt: "Why we built a portfolio simulator that works whether you're just starting out or already investing.",
    content: `We built Strategic Markets to solve a simple problem: most portfolio tools only show you what you already own.

We wanted something that also lets you simulate before you act — whether you haven't invested yet and want to see what a portfolio might look like, or you already have holdings and want to understand your risk before adding something new.

More posts coming soon as we keep building.`,
  },
];

export function getPostBySlug(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}
