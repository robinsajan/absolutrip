"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { MobileTabBar, DesktopSidebar, TripHeader } from "@/components/navigation";
import { useTrip } from "@/lib/hooks";
import { useAppStore } from "@/lib/store";

export default function TripLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const tripId = params.tripId as string;
  const { trip, isLoading } = useTrip(Number(tripId));
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
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      <DesktopSidebar tripId={tripId} trip={trip} />
      
      <div className="flex-1 flex flex-col min-h-screen">
        <TripHeader trip={trip} />
        
        <main className="flex-1 pb-20 lg:pb-0">
          {children}
        </main>
        
        <MobileTabBar tripId={tripId} />
      </div>
    </div>
  );
}
