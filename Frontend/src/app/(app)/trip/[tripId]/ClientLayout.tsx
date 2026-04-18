"use client";

import { useEffect } from "react";
import { useParams, usePathname } from "next/navigation";
import { MobileTabBar, DesktopSidebar, TripHeader } from "@/components/navigation";
import { useTrip } from "@/lib/hooks";
import { useAppStore } from "@/lib/store";
import { FullPageLoader } from "@/components/common/FullPageLoader";

export default function TripLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const tripId = params.tripId as string;
  const pathname = usePathname();
  const { trip, isLoading } = useTrip(tripId);
  const setActiveTrip = useAppStore((state) => state.setActiveTrip);

  useEffect(() => {
    if (trip) {
      setActiveTrip(trip);
    }
    return () => {
      setActiveTrip(null);
    };
  }, [trip, setActiveTrip]);

  if (isLoading) {
    return <FullPageLoader />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TripHeader trip={trip} />

      <main className="flex-1 font-sans pb-32 md:pb-0">
        {children}
      </main>

      <MobileTabBar tripId={tripId} />
    </div>
  );
}
