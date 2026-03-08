"use client";

import { useParams } from "next/navigation";
import { BudgetDashboard } from "@/components/budget";

export default function BudgetOverviewPage() {
  const params = useParams();
  const tripId = Number(params.tripId);

  return <BudgetDashboard tripId={tripId} initialTab="overview" />;
}
