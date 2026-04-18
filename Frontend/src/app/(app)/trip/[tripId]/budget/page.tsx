import BudgetPageClient from "./BudgetPageClient";

export function generateStaticParams() {
  return [{ tripId: "_fallback" }];
}

export default function BudgetPage() {
  return <BudgetPageClient />;
}
