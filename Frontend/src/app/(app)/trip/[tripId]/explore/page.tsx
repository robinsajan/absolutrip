import ExplorePageClient from "./ExplorePageClient";

export function generateStaticParams() {
  return [{ tripId: "_fallback" }];
}

export default function ExplorePage() {
  return <ExplorePageClient />;
}
