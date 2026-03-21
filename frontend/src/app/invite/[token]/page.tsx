// Server Component — required to export generateStaticParams with output: 'export'.
// Tokens are runtime UUIDs so we return [] (no pages pre-rendered at build time).
// All logic lives in InvitePageClient which is resolved client-side via useParams.
export function generateStaticParams() {
  return [];
}

import InvitePageClient from "./InvitePageClient";

export default function InvitePage() {
  return <InvitePageClient />;
}
