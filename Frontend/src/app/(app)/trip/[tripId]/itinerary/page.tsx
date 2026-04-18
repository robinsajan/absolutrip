import ItineraryPageClient from "./ItineraryPageClient";

export function generateStaticParams() {
  return [{ tripId: "_fallback" }];
}

export default function ItineraryPage() {
  return <ItineraryPageClient />;
}
