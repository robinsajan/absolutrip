"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store";
import type { Trip } from "@/types";

interface TripHeaderProps {
  trip?: Trip;
  title?: string;
}

export function TripHeader({ trip, title }: TripHeaderProps) {
  const router = useRouter();
  const { showAddOption, setShowAddOption } = useAppStore();
  // const { format, parseISO } = require("date-fns"); // Removed require, now using import

  const copyInviteCode = async () => {
    if (!trip) return;
    await navigator.clipboard.writeText(trip.invite_code);
    toast.success("Invite code copied!");
  };

  const tripDates = trip?.start_date && trip?.end_date
    ? `${format(parseISO(trip.start_date), "MMM d")} - ${format(parseISO(trip.end_date), "MMM d, yyyy")}`
    : "Dates not set";

  return (
    <header className="sticky top-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-primary/10 px-4 lg:px-8 py-4 lg:py-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Mobile Back Button */}
          <Button
            variant="ghost"
            size="icon"
            className="rounded-xl lg:hidden"
            onClick={() => router.push("/trips")}
          >
            <span className="material-symbols-outlined text-xl">arrow_back</span>
          </Button>

          <div className="flex flex-col">
            <div className="flex items-center gap-2 lg:gap-3">
              <span className="material-symbols-outlined text-primary text-xl lg:text-2xl">restaurant</span>
              <h2 className="text-lg lg:text-2xl font-serif font-bold text-slate-900 dark:text-white truncate max-w-[150px] lg:max-w-none">
                {title || trip?.name || "Trip"}
              </h2>
            </div>
            <p className="text-[10px] lg:text-sm text-slate-500 font-medium flex items-center gap-1 mt-0.5">
              <span className="material-symbols-outlined text-[10px] lg:text-xs">calendar_today</span>
              {tripDates}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 lg:gap-4">
          <div className="relative hidden md:block">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
            <input
              className="pl-9 pr-4 py-2 bg-primary/5 border-none rounded-lg focus:ring-2 focus:ring-primary w-48 lg:w-64 text-sm placeholder:text-slate-400"
              placeholder="Search experiences..."
              type="text"
            />
          </div>

          <button
            onClick={copyInviteCode}
            className="hidden lg:flex items-center gap-1 px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-bold text-slate-500 hover:text-primary transition-all"
            title="Copy Invite Code"
          >
            <span className="material-symbols-outlined text-sm">content_copy</span>
            {trip?.invite_code}
          </button>

          <button
            onClick={() => setShowAddOption(true)}
            className="bg-primary text-white px-3 lg:px-5 py-2 lg:py-2.5 rounded-lg font-bold text-xs lg:text-sm flex items-center gap-1 lg:gap-2 hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
          >
            <span className="material-symbols-outlined text-sm lg:text-base">add_circle</span>
            <span className="hidden sm:inline">Add Option</span>
            <span className="sm:hidden text-lg mb-0.5">+</span>
          </button>
        </div>
      </div>
    </header>
  );
}
