// Single owner/moderator identity for this app: gates blog authoring
// (src/routes/blog.tsx) and Community moderation (delete-any-post/comment/
// channel in src/components/CommunityPage.tsx). This is a client-side
// convenience check only — the actual enforcement for Community
// moderation lives in the community-moderation-delete migration's RLS
// policies, which independently check the same email via auth.jwt().
// If this ever changes, update both.
export const OWNER_EMAIL = "admin@s-markets.com";
