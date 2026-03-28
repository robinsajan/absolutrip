"use client";

import Link from "next/link";
import { usePathname, useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store";
import { useAuth } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { Trip } from "@/types";

interface TripHeaderProps {
  trip?: Trip;
  title?: string;
}

export function TripHeader({ trip, title }: TripHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const tripId = params.tripId as string;
  const { user } = useAuth();
  const { setShowAddOption } = useAppStore();

  const copyInviteCode = async () => {
    if (!trip) return;
    await navigator.clipboard.writeText(trip.invite_code);
    toast.success("Invite code copied!");
  };

  const tripDates = trip?.start_date && trip?.end_date
    ? `${format(parseISO(trip.start_date), "MMM d")} - ${format(parseISO(trip.end_date), "MMM d")}`
    : "Dates not set";

  return (
    <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border-b border-slate-100 dark:border-slate-800 px-6 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex flex-col min-w-0">
          <h2 className="text-lg font-black text-black dark:text-white truncate tracking-tight lowercase">
            {title || trip?.name || "Trip"}
          </h2>
          <p className="text-[8px] text-slate-400 font-black uppercase tracking-[0.2em] flex items-center gap-1">
            <span className="material-symbols-outlined text-[10px]">event</span>
            {tripDates}
          </p>
        </div>

        {/* Global Nav */}
        <nav className="hidden lg:flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl ring-1 ring-slate-200 dark:ring-slate-700">
          {[
            { name: "Compare", href: `explore`, icon: "dashboard_customize" },
            { name: "Budget", href: `budget`, icon: "receipt_long" },
            { name: "Expense", href: `ledger`, icon: "payments" },
          ].map((tab) => {
            const fullHref = `/trip/${tripId}/${tab.href}`;
            const isActive = pathname === fullHref || pathname.startsWith(fullHref + "/");
            return (
              <Link
                key={tab.name}
                href={fullHref}
                className={cn(
                  "px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all",
                  isActive
                    ? "bg-white dark:bg-slate-700 text-primary shadow-sm"
                    : "text-slate-500 hover:text-primary"
                )}
              >
                <span className={cn("material-symbols-outlined text-sm", isActive ? "material-symbols-filled" : "outline-icon")}>
                  {tab.icon}
                </span>
                {tab.name}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          {trip?.invite_code && (
            <button
              onClick={copyInviteCode}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[9px] font-black uppercase tracking-tight text-slate-400 hover:text-primary transition-all"
            >
              <span className="material-symbols-outlined text-xs">content_copy</span>
              {trip.invite_code}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
