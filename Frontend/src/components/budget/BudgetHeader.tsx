"use client";

import { Users, Info, Tag } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface BudgetHeaderProps {
  totalExpenses: number;
  perPersonAverage: number;
  memberCount: number;
  expenseCount: number;
  personalBalance?: number;
  expectedPrice?: number;
  whoShouldPayNext?: {
    user_id: number;
    user_name: string;
    amount_owed: number;
    suggestion: string;
  };
}

export function BudgetHeader({
  totalExpenses,
  perPersonAverage,
  memberCount,
  expenseCount,
  personalBalance,
  expectedPrice,
  whoShouldPayNext,
}: BudgetHeaderProps) {
  return (
    <Card className="bg-[#ccff00] text-black shadow-2xl shadow-[#ccff00]/20 border-none">
      <CardContent className="p-6">
        <div className="flex flex-col items-center gap-3 mb-6">
          {personalBalance !== undefined && (
            <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 backdrop-blur-md border ${personalBalance > 0.01
              ? "bg-green-900/10 border-green-900/20 text-green-900"
              : personalBalance < -0.01
                ? "bg-red-900/10 border-red-900/20 text-red-900"
                : "bg-black/5 border-black/10 text-black/70"
              }`}>
              {personalBalance > 0.01 ? (
                <>Others owe you ₹{personalBalance.toFixed(2)}</>
              ) : personalBalance < -0.01 ? (
                <>You owe others ₹{Math.abs(personalBalance).toFixed(2)}</>
              ) : (
                <>You're all settled up!</>
              )}
            </div>
          )}

          {whoShouldPayNext && (
            <div className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 bg-black/5 border border-black/10 text-black animate-pulse">
              💡 Suggestion: {whoShouldPayNext.user_name} should pay next
            </div>
          )}
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center gap-2">
            <p className="text-sm opacity-90 font-medium">Your Personal Share</p>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="opacity-70 hover:opacity-100 transition-opacity">
                    <Info className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs bg-white text-slate-900 border-none shadow-xl">
                  <p className="text-sm">
                    This is your individual share of the trip cost. It increases as you select more expensive options in the Scenario Planner.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <p className="text-5xl font-black mt-1 tracking-tight">
            ₹{perPersonAverage.toFixed(2)}
          </p>
        </div>

        {expectedPrice !== undefined && expectedPrice > 0 && (
          <div className="mt-5 mx-1 bg-black/10 rounded-2xl px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 opacity-70" />
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Admin&apos;s Expected Price</p>
                <p className="text-[9px] text-black/50 font-medium">Based on finalized options</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black tracking-tight">₹{expectedPrice.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
              <p className="text-[9px] font-bold uppercase opacity-60">/ person</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t border-black/10">
          <div className="text-center">
            <p className="text-2xl font-black">₹{totalExpenses.toFixed(0)}</p>
            <p className="text-[10px] uppercase font-bold opacity-70 tracking-tighter">Group Total</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-black flex items-center justify-center gap-1">
              <Users className="h-5 w-5" />
              {memberCount}
            </p>
            <p className="text-[10px] uppercase font-bold opacity-70 tracking-tighter">Members</p>
          </div>
          <div className="text-center border-l border-black/10">
            <p className="text-2xl font-black">₹{(totalExpenses / Math.max(memberCount, 1)).toFixed(0)}</p>
            <p className="text-[10px] uppercase font-bold opacity-70 tracking-tighter">Group Avg</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
