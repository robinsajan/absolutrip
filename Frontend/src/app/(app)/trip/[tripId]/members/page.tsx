import MembersPageClient from "./MembersPageClient";

export function generateStaticParams() {
  return [{ tripId: "_fallback" }];
}

export default function MembersPage() {
  return <MembersPageClient />;
}
