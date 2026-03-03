"use client";

import { useParams } from "next/navigation";
import { TripSettleView } from "@/components/settle/TripSettleView";

export default function SettlePage() {
  const params = useParams();
  const tripId = Number(params.tripId);

  return <TripSettleView tripId={tripId} />;
}
