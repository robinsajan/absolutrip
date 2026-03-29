"use client";

import { ArrowUp, ArrowDown, Check, Info } from "lucide-react";
import Link from "next/link";
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
      <div className="p-12 text-center bg-gray-50 dark:bg-gray-800/50 rounded-[2rem] border-2 border-dashed border-gray-100 dark:border-gray-800">
        <div className="w-12 h-12 border-2 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4" />
        <p className="text-xs font-black uppercase tracking-widest text-gray-400">Loading balance...</p>
      </div>
    );
  }

  const { status } = balance;
  const amount = Math.abs(balance.balance);
  const firstName = userName?.split(" ")[0] || "You";

  const getStatusConfig = () => {
    switch (status) {
      case "owes":
        return {
          icon: "trending_down",
          bgClass: "bg-red-500 text-white shadow-xl shadow-red-500/10",
          message: `${firstName}, you owe the group`,
          subMessage: "Settle up below",
        };
      case "owed":
        return {
          icon: "trending_up",
          bgClass: "bg-green-500 text-white shadow-xl shadow-green-500/10",
          message: `${firstName}, others owe you`,
          subMessage: "You paid more than your share",
        };
      case "settled":
      default:
        return {
          icon: "check_circle",
          bgClass: "bg-primary text-white shadow-xl shadow-primary/10",
          message: `${firstName}, you're all settled!`,
          subMessage: "No debts to pay or collect",
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div className="space-y-6">
      <div className={cn("rounded-[2.5rem] p-8 min-h-[180px] flex flex-col justify-between transition-all", config.bgClass)}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
              <span className="material-symbols-outlined material-symbols-filled text-2xl">{config.icon}</span>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-80">{config.message}</p>
              <div className="flex items-center gap-2 mt-1">
                <h2 className="text-5xl font-black tracking-tighter">₹{Math.round(amount).toLocaleString('en-IN')}</h2>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className="opacity-40 hover:opacity-100 transition-opacity">
                        <span className="material-symbols-outlined text-sm">info</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs bg-white text-black border-none shadow-2xl rounded-2xl p-4">
                      <p className="text-xs font-medium leading-relaxed">
                        {explanation?.how_it_works ||
                          "Your balance = Total Paid - Your Share. Positive means you're owed money, negative means you owe."}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </div>
        </div>
        <p className="text-[10px] font-black uppercase tracking-widest opacity-60 flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">schedule</span>
          {config.subMessage}
        </p>
      </div>

      {balance.total_paid !== undefined && balance.total_share !== undefined && (
        <div className="bg-white dark:bg-gray-900 rounded-[2rem] p-8 border border-gray-100 dark:border-gray-800 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Financial Breakdown</span>
            <Link href="/expenses" className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline">View History</Link>
          </div>

          <div className="grid grid-cols-3 gap-8">
            <div className="space-y-1">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">You Paid</p>
              <p className="text-2xl font-black text-green-500 tracking-tighter">₹{Math.round(balance.total_paid).toLocaleString('en-IN')}</p>
            </div>
            <div className="space-y-1 border-x border-gray-50 dark:border-gray-800 px-8">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Your Share</p>
              <p className="text-2xl font-black text-orange-500 tracking-tighter">₹{Math.round(balance.total_share).toLocaleString('en-IN')}</p>
            </div>
            <div className="space-y-1 text-right">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Net Balance</p>
              <p className={cn(
                "text-2xl font-black tracking-tighter",
                balance.balance >= 0 ? "text-green-500" : "text-red-500"
              )}>
                {balance.balance >= 0 ? "+" : ""}₹{Math.round(balance.balance).toLocaleString('en-IN')}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
