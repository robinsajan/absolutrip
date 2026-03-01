"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Copy, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { Trip } from "@/types";

interface TripHeaderProps {
  trip?: Trip;
  title?: string;
}

export function TripHeader({ trip, title }: TripHeaderProps) {
  const router = useRouter();

  const copyInviteCode = async () => {
    if (!trip) return;
    await navigator.clipboard.writeText(trip.invite_code);
    toast.success("Invite code copied!");
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/90 px-4 py-3 backdrop-blur-md lg:hidden">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-xl"
            onClick={() => router.push("/trips")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="max-w-[200px] truncate font-semibold tracking-tight text-foreground">
              {title || trip?.name || "Trip"}
            </h1>
            {trip && (
              <button
                onClick={copyInviteCode}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <Copy className="h-3 w-3" />
                {trip.invite_code}
              </button>
            )}
          </div>
        </div>
        {trip?.members && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            {trip.members.length}
          </div>
        )}
      </div>
    </header>
  );
}
