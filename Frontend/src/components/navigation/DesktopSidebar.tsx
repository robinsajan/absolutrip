"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import useSWR from "swr";
import { Compass, Calculator, Receipt, Wallet, ArrowLeft, Settings, Users, Copy, Map } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useAppStore } from "@/lib/store";
import { trips as tripsApi } from "@/lib/api/endpoints";
import type { Trip } from "@/types";

interface DesktopSidebarProps {
  tripId: string;
  trip?: Trip;
}

const tabs = [
  { name: "Explore", href: "explore", icon: Compass, description: "Discover options" },
  { name: "Budget", href: "budget", icon: Calculator, description: "Track costs" },
  { name: "Ledger", href: "ledger", icon: Receipt, description: "View expenses" },
  { name: "Settle", href: "settle", icon: Wallet, description: "Pay debts" },
];

export function DesktopSidebar({ tripId, trip }: DesktopSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAppStore();

  const isOwner = trip?.created_by === user?.id;

  const { data: requestsData } = useSWR(
    isOwner && tripId ? `join-requests-${tripId}` : null,
    () => tripsApi.getJoinRequests(Number(tripId))
  );

  const pendingCount = requestsData?.requests?.length || 0;

  const copyInviteCode = async () => {
    if (!trip) return;
    await navigator.clipboard.writeText(trip.invite_code);
    toast.success("Invite code copied!");
  };

  return (
    <aside className="sticky top-0 hidden h-screen w-64 flex-col border-r border-primary/10 bg-white dark:bg-slate-900 lg:flex shrink-0">
      <div className="p-6 flex flex-col h-full">
        {/* All Trips Back Button */}
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 mb-6 rounded-lg text-slate-500 hover:text-primary transition-colors"
          onClick={() => router.push("/trips")}
        >
          <span className="material-symbols-outlined mr-2 text-sm">arrow_back</span>
          All Trips
        </Button>

        {/* Brand */}
        <div className="flex items-center gap-3 mb-8">
          <div className="size-10 bg-primary rounded-full flex items-center justify-center text-white shadow-lg shadow-primary/20">
            <span className="material-symbols-outlined">travel_explore</span>
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl font-bold font-serif text-primary leading-tight">absoluTrip</h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Manage Trip</p>
          </div>
        </div>

        {/* Main Nav */}
        <nav className="flex flex-col gap-1 grow overflow-y-auto pr-2 scrollbar-hide">
          {/* Explore */}
          <Link
            href={`/trip/${tripId}/explore`}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all font-medium",
              pathname.includes("/explore")
                ? "bg-primary/10 text-primary font-bold shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:bg-primary/5 hover:text-primary"
            )}
          >
            <span className="material-symbols-outlined">explore</span>
            <span>Explore</span>
          </Link>

          {/* Budget Group */}
          <div className="flex flex-col gap-1 mt-1">
            <Link
              href={`/trip/${tripId}/budget`}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all font-medium",
                pathname.includes("/budget")
                  ? "bg-primary/10 text-primary font-bold shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:bg-primary/5 hover:text-primary"
              )}
            >
              <span className="material-symbols-outlined">payments</span>
              <span>Budget</span>
            </Link>
            <div className="pl-6 flex flex-col gap-1">
              <Link
                href={`/trip/${tripId}/ledger`}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 text-sm transition-colors rounded-md",
                  pathname.includes("/ledger")
                    ? "text-primary font-bold bg-primary/5"
                    : "text-slate-500 hover:text-primary"
                )}
              >
                <span className="material-symbols-outlined text-sm">receipt_long</span>
                Expense
              </Link>
            </div>
          </div>

          {/* Members */}
          <Link
            href={`/trip/${tripId}/members`}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all font-medium relative",
              pathname.includes("/members")
                ? "bg-primary/10 text-primary font-bold shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:bg-primary/5 hover:text-primary"
            )}
          >
            <span className="material-symbols-outlined">group</span>
            <span>Members</span>
            {pendingCount > 0 && (
              <span className="absolute right-2 top-1/2 -translate-y-1/2 size-5 bg-red-500 text-white text-[10px] flex items-center justify-center rounded-full border-2 border-white dark:border-slate-900">
                {pendingCount}
              </span>
            )}
          </Link>
        </nav>

        {/* Bottom Nav */}
        <div className="border-t border-primary/10 pt-4 flex flex-col gap-1">
          <Link
            href={`/trip/${tripId}/settings`}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all font-medium",
              pathname.includes("/settings")
                ? "bg-primary/10 text-primary font-bold"
                : "text-slate-600 dark:text-slate-400 hover:bg-primary/5 hover:text-primary"
            )}
          >
            <span className="material-symbols-outlined">settings</span>
            <span>Settings</span>
          </Link>
        </div>
      </div>
    </aside>
  );
}
