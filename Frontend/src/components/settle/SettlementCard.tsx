"use client";

import { useState } from "react";
import { ArrowRight, Check, Copy, Info, Lightbulb } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { expenses as expensesApi } from "@/lib/api/endpoints";
import { cn } from "@/lib/utils";
import type { Settlement } from "@/types";

interface SettlementCardProps {
  settlement: Settlement;
  type: "pay" | "receive";
  tripId?: string;
  onSettled?: () => void;
}

export function SettlementCard({
  settlement,
  type,
  tripId,
  onSettled,
}: SettlementCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isSettling, setIsSettling] = useState(false);

  const otherPerson = type === "pay" ? settlement.to_user_name : settlement.from_user_name;

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleCopyAmount = async () => {
    await navigator.clipboard.writeText(settlement.amount.toFixed(2));
    setCopied(true);
    toast.success("Amount copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSettle = async () => {
    if (!tripId) return;

    try {
      setIsSettling(true);
      await expensesApi.settle(tripId, {
        amount: settlement.amount,
        from_user_id: settlement.from_user_id,
        to_user_id: settlement.to_user_id,
      });
      toast.success("Settlement recorded!");
      setShowDetails(false);
      onSettled?.();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to settle");
    } finally {
      setIsSettling(false);
    }
  };

  return (
    <>
      <div
        className={cn(
          "cursor-pointer p-6 rounded-[2rem] border transition-all hover:shadow-xl group flex items-center justify-between",
          type === "pay"
            ? "bg-red-50 border-red-100 hover:border-red-300 dark:bg-red-500/5 dark:border-red-500/20"
            : "bg-green-50 border-green-100 hover:border-green-300 dark:bg-green-500/5 dark:border-green-500/20"
        )}
        onClick={() => setShowDetails(true)}
      >
        <div className="flex items-center gap-5">
          <div className={cn(
            "w-14 h-14 rounded-2xl flex items-center justify-center text-2xl transition-all group-hover:scale-110 shadow-sm",
            type === "pay" ? "bg-white text-red-500 shadow-red-500/10" : "bg-white text-green-500 shadow-green-500/10"
          )}>
            <span className="material-symbols-outlined material-symbols-filled">
              {type === "pay" ? "outbound" : "inbox"}
            </span>
          </div>

          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">
              {type === "pay" ? "Send money to" : "Collect from"}
            </p>
            <h4 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">
              {otherPerson}
            </h4>
          </div>
        </div>

        <div className="text-right flex items-center gap-6">
          <div>
            <p className={cn(
              "text-3xl font-black tracking-tighter",
              type === "pay" ? "text-red-500" : "text-green-500"
            )}>
              ${Math.round(settlement.amount).toLocaleString()}
            </p>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Pending</p>
          </div>
          <ArrowRight className="h-5 w-5 text-gray-300 group-hover:text-primary transition-colors group-hover:translate-x-1" />
        </div>
      </div>

      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {type === "pay" ? "Payment Details" : "Receiving Payment"}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="text-muted-foreground hover:text-foreground transition-colors">
                      <Info className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    <p className="text-sm">
                      This payment is calculated to minimize the total number of transactions needed to settle all debts in the group.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 pt-4">
            <div className="text-center">
              <Avatar className="h-20 w-20 mx-auto">
                <AvatarFallback
                  className={cn(
                    "text-2xl",
                    type === "pay"
                      ? "bg-red-100 text-red-600"
                      : "bg-green-100 text-green-600"
                  )}
                >
                  {getInitials(otherPerson)}
                </AvatarFallback>
              </Avatar>
              <p className="mt-3 font-medium text-lg">{otherPerson}</p>
              <p
                className={cn(
                  "text-3xl font-bold mt-2",
                  type === "pay" ? "text-red-500" : "text-green-500"
                )}
              >
                ${settlement.amount.toFixed(2)}
              </p>
            </div>

            <div className="bg-muted rounded-lg p-4 space-y-2">
              <p className="text-sm text-muted-foreground">
                {type === "pay"
                  ? "Send this amount to settle your debt"
                  : "You should receive this amount"}
              </p>
              <div className="flex items-center justify-between">
                <span className="font-mono text-lg">
                  ${settlement.amount.toFixed(2)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyAmount}
                >
                  {copied ? (
                    <Check className="h-4 w-4 mr-1" />
                  ) : (
                    <Copy className="h-4 w-4 mr-1" />
                  )}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
            </div>

            <div className="bg-blue-50 rounded-lg p-4 flex gap-3">
              <Lightbulb className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium">How this is calculated</p>
                <p className="mt-1 text-blue-600">
                  {type === "pay"
                    ? `${otherPerson} paid more than their share of expenses. This payment balances what you owe for expenses they covered.`
                    : `You paid more than your share of expenses. This payment is what ${otherPerson} owes you for expenses you covered.`}
                </p>
              </div>
            </div>

            {type === "pay" && (
              <Button
                className="w-full"
                size="lg"
                onClick={handleSettle}
                disabled={isSettling}
              >
                {isSettling ? "Recording..." : "Mark as Settled"}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
