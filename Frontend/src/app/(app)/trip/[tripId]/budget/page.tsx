"use client";

import { useParams } from "next/navigation";
import { TripBudgetPlanner } from "@/components/budget/TripBudgetPlanner";

export default function BudgetOverviewPage() {
  const params = useParams();
  const tripId = params.tripId as string;

  return (
    <div className="max-w-7xl mx-auto p-6 md:p-12 space-y-12 bg-slate-50 dark:bg-slate-950 min-h-screen">
      <div className="hidden md:block space-y-4">
        <h1 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white tracking-tighter italic">
          Your Trip <span className="text-primary italic font-serif">Budget</span>
        </h1>
        <p className="text-lg text-slate-500 max-w-2xl font-medium">
          Plan your stay, optimize with AI, and track everything in one place.
        </p>
      </div>
      <TripBudgetPlanner tripId={tripId} />
    </div>
  );
}
