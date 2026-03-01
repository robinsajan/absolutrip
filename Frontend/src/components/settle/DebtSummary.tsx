"use client";

import { ArrowUp, ArrowDown, Check, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { Balance, SettlementExplanation } from "@/types";

interface DebtSummaryProps {
  balance?: Balance;
  userName?: string;
  explanation?: SettlementExplanation;
}

export function DebtSummary({ balance, userName, explanation }: DebtSummaryProps) {
  if (!balance) {
    return (
      <Card className="bg-muted">
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">Loading your balance...</p>
        </CardContent>
      </Card>
    );
  }

  const { status } = balance;
  const amount = Math.abs(balance.balance);
  const firstName = userName?.split(" ")[0] || "You";

  const getStatusConfig = () => {
    switch (status) {
      case "owes":
        return {
          icon: ArrowUp,
          bgClass: "bg-gradient-to-br from-red-500 to-red-600",
          message: `${firstName}, you owe a total of`,
          subMessage: "Settle up with your friends below",
        };
      case "owed":
        return {
          icon: ArrowDown,
          bgClass: "bg-gradient-to-br from-green-500 to-green-600",
          message: `${firstName}, you are owed`,
          subMessage: "Your friends owe you money",
        };
      case "settled":
      default:
        return {
          icon: Check,
          bgClass: "bg-gradient-to-br from-primary to-primary/80",
          message: `${firstName}, you're all settled!`,
          subMessage: "No debts to pay or collect",
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div className="space-y-3">
      <Card className={cn("text-white overflow-hidden", config.bgClass)}>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-full">
              <Icon className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm opacity-90">{config.message}</p>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className="opacity-70 hover:opacity-100 transition-opacity">
                        <Info className="h-4 w-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs">
                      <p className="text-sm">
                        {explanation?.how_it_works || 
                          "Your balance = Total Paid - Your Share. Positive means you're owed money, negative means you owe."}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              {status !== "settled" && (
                <p className="text-3xl font-bold mt-1">${amount.toFixed(2)}</p>
              )}
              <p className="text-xs opacity-80 mt-1">{config.subMessage}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {balance.total_paid !== undefined && balance.total_share !== undefined && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Your breakdown:</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className="text-muted-foreground hover:text-foreground transition-colors">
                        <Info className="h-3.5 w-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs">
                      <p className="text-sm">
                        Total Paid is how much you&apos;ve spent for the group. Your Share is what you owe based on expense splits.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-3">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Paid</p>
                <p className="font-semibold text-green-600">${balance.total_paid.toFixed(2)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Share</p>
                <p className="font-semibold text-orange-600">${balance.total_share.toFixed(2)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Balance</p>
                <p className={cn(
                  "font-semibold",
                  balance.balance > 0 ? "text-green-600" : balance.balance < 0 ? "text-red-600" : "text-primary"
                )}>
                  {balance.balance >= 0 ? "+" : ""}${balance.balance.toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
