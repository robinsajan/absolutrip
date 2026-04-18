import SettlePageClient from "./SettlePageClient";

export function generateStaticParams() {
  return [{ tripId: "_fallback" }];
}

export default function SettlePage() {
  return <SettlePageClient />;
}
