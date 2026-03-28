"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Calculator, Receipt, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

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

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t pb-safe lg:hidden">
      <div className="flex items-center justify-around h-16">
        {tabs.map((tab) => {
          const isActive = pathname.includes(`/trip/${tripId}/${tab.href}`);
          const Icon = tab.icon;

          return (
            <Link
              key={tab.href}
              href={`/trip/${tripId}/${tab.href}`}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className={cn("h-5 w-5", isActive && "stroke-[2.5px]")} />
              <span className="text-xs mt-1 font-medium">{tab.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
