import InvitePageClient from "./InvitePageClient";

// Required for output: 'export' with dynamic routes in Next.js 14.
// Tokens are runtime UUIDs — no pages are pre-rendered at build time.
export const dynamicParams = false;

export function generateStaticParams() {
  return [];
}

export default function InvitePage() {
  return <InvitePageClient />;
}
