"use client";

import { useParams } from "next/navigation";
import { TripBudgetPlanner } from "@/components/budget/TripBudgetPlanner";
import { useAuth } from "@/lib/hooks";
import { BudgetTour } from "@/components/budget/BudgetTour";

export default function BudgetOverviewPage() {
  const params = useParams();
  const tripId = params.tripId as string;
  const { user, isLoading, updateTourStatus } = useAuth();
  
  console.log('BudgetOverviewPage - user:', user, 'loading:', isLoading);

  const handleCompleteTour = () => {
    updateTourStatus(false);
  };

  if (isLoading) return null;

  return (
    <div className="max-w-7xl mx-auto p-6 md:p-12 space-y-12 bg-slate-50 dark:bg-slate-950 min-h-screen">
      {user?.show_budget_tour === true && <BudgetTour onComplete={handleCompleteTour} />}

      <TripBudgetPlanner tripId={tripId} />
    </div>
  );
}
