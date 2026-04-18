"use client";

import { useParams } from "next/navigation";
import { TripLedgerView } from "@/components/ledger/TripLedgerView";

export default function LedgerPage() {
  const params = useParams();
  const tripId = params.tripId as string;

  return <TripLedgerView tripId={tripId} />;
}
