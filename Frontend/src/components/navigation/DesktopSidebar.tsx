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
    <aside className="sticky top-0 hidden h-screen w-64 flex-col border-r border-border bg-card lg:flex">
      <div className="border-b border-border p-4">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 mb-3 rounded-xl"
          onClick={() => router.push("/trips")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          All Trips
        </Button>
        {trip && (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
              <Map className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-lg font-semibold tracking-tight text-foreground">{trip.name}</h2>
              <button
                onClick={copyInviteCode}
                className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <Copy className="h-3 w-3" />
                {trip.invite_code}
              </button>
            </div>
          </div>
        )}
      </div>

      <nav className="flex-1 p-2">
        <ul className="space-y-1">
          {tabs.map((tab) => {
            const isActive = pathname.includes(`/trip/${tripId}/${tab.href}`);
            const Icon = tab.icon;

            return (
              <li key={tab.href}>
                <Link
                  href={`/trip/${tripId}/${tab.href}`}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2 transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <div>
                    <p className="font-medium">{tab.name}</p>
                    <p
                      className={cn(
                        "text-xs",
                        isActive ? "text-primary-foreground/80" : "text-muted-foreground"
                      )}
                    >
                      {tab.description}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <Separator />

      <div className="space-y-1 p-2">
        <Link
          href={`/trip/${tripId}/members`}
          className="flex items-center justify-between rounded-xl px-3 py-2 transition-colors hover:bg-accent"
        >
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5" />
            <span className="font-medium">Members</span>
          </div>
          {pendingCount > 0 && (
            <Badge variant="destructive" className="h-5 px-1.5">
              {pendingCount}
            </Badge>
          )}
        </Link>
        <Link
          href={`/trip/${tripId}/settings`}
          className="flex items-center gap-3 rounded-xl px-3 py-2 transition-colors hover:bg-accent"
        >
          <Settings className="h-5 w-5" />
          <span className="font-medium">Settings</span>
        </Link>
      </div>
    </aside>
  );
}
