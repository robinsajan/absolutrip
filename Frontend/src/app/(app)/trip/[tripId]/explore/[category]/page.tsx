import CategoryPageClient from "./CategoryPageClient";

export function generateStaticParams() {
  // This page has two parameters: tripId and category
  return [{ tripId: "_fallback", category: "_fallback" }];
}

export default function CategoryPage() {
  return <CategoryPageClient />;
}
