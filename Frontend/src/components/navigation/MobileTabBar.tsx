"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Calculator, Receipt, Wallet, Settings, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface MobileTabBarProps {
  tripId: string;
}

const tabs = [
  { name: "Explore", href: "explore", icon: Compass },
  { name: "Budget", href: "budget", icon: Calculator },
  { name: "Expense", href: "ledger", icon: Receipt },
];

export function MobileTabBar({ tripId }: MobileTabBarProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[95] bg-white/90 dark:bg-slate-950/90 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 md:hidden p-2 pb-[calc(env(safe-area-inset-bottom,0.75rem)+0.5rem)] shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
      <div className="flex items-center justify-around h-16">
        {tabs.map((tab) => {
          const isActive = pathname.includes(`/trip/${tripId}/${tab.href}`);
          const Icon = tab.icon;

          return (
            <Link
              key={tab.href}
              href={`/trip/${tripId}/${tab.href}`}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full transition-all active:scale-95",
                isActive
                  ? "text-primary font-black scale-105"
                  : "text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
              )}
            >
              <div className={cn(
                "p-2 rounded-2xl transition-all",
                isActive ? "bg-primary/10" : ""
              )}>
                <Icon className={cn("h-6 w-6", isActive && "stroke-[2.5px]")} />
              </div>
              <span className="text-[9px] uppercase tracking-widest mt-1 font-semibold">{tab.name}</span>
            </Link>
          );
        })}

        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <button
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full transition-all active:scale-95",
                pathname.includes("/members") || pathname.includes("/settings")
                  ? "text-primary font-black scale-105"
                  : "text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
              )}
            >
              <div className={cn(
                "p-2 rounded-2xl transition-all",
                (pathname.includes("/members") || pathname.includes("/settings")) ? "bg-primary/10" : ""
              )}>
                <Settings className={cn("h-6 w-6", (pathname.includes("/members") || pathname.includes("/settings")) && "stroke-[2.5px]")} />
              </div>
              <span className="text-[9px] uppercase tracking-widest mt-1 font-semibold">Settings</span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-900 mb-2" side="top" align="center">
            <div className="flex flex-col gap-1">
              <Link
                href={`/trip/${tripId}/itinerary`}
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 transition-colors"
              >
                <Compass className="h-4 w-4" />
                Itinerary
              </Link>
              <Link
                href={`/trip/${tripId}/members`}
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 transition-colors"
              >
                <Users className="h-4 w-4" />
                Members
              </Link>
              <Link
                href={`/trip/${tripId}/settings`}
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 transition-colors"
              >
                <Settings className="h-4 w-4" />
                Settings
              </Link>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </nav>
  );
}
