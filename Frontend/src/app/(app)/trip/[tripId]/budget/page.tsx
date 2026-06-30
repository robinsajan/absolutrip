"use client";

import { useParams } from "next/navigation";
import { useAuth } from "@/lib/hooks";
import { BudgetTour } from "@/components/budget/BudgetTour";
import { BudgetSpendTracker } from "@/components/budget/BudgetSpendTracker";

export default function BudgetOverviewPage() {
  const params = useParams();
  const tripId = params.tripId as string;
  const { user, isLoading, updateTourStatus } = useAuth();

  const handleCompleteTour = () => {
    updateTourStatus(false);
  };

  if (isLoading) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 md:px-8 md:py-10 bg-slate-50 dark:bg-slate-950 min-h-screen">
      {user?.show_budget_tour === true && <BudgetTour onComplete={handleCompleteTour} />}
      <BudgetSpendTracker tripId={tripId} />
    </div>
  );
}
