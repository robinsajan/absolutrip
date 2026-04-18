import LedgerPageClient from "./LedgerPageClient";

export function generateStaticParams() {
  return [{ tripId: "_fallback" }];
}

export default function LedgerPage() {
  return <LedgerPageClient />;
}
