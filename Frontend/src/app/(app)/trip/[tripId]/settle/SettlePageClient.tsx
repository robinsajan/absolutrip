"use client";

import { useParams } from "next/navigation";
import { TripSettleView } from "@/components/settle/TripSettleView";

export default function SettlePage() {
  const params = useParams();
  const tripId = params.tripId as string;

  return <TripSettleView tripId={tripId} />;
}
