"use client";

import { Users, Info } from "lucide-react";
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
  whoShouldPayNext,
}: BudgetHeaderProps) {
  return (
    <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-2xl shadow-primary/20">
      <CardContent className="p-6">
        <div className="flex flex-col items-center gap-3 mb-6">
          {personalBalance !== undefined && (
            <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 backdrop-blur-md border ${personalBalance > 0.01
              ? "bg-green-500/20 border-green-400/30 text-green-100"
              : personalBalance < -0.01
                ? "bg-red-500/20 border-red-400/30 text-red-100"
                : "bg-white/10 border-white/20 text-white/80"
              }`}>
              {personalBalance > 0.01 ? (
                <>Others owe you ${personalBalance.toFixed(2)}</>
              ) : personalBalance < -0.01 ? (
                <>You owe others ${Math.abs(personalBalance).toFixed(2)}</>
              ) : (
                <>You're all settled up!</>
              )}
            </div>
          )}

          {whoShouldPayNext && (
            <div className="px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 bg-amber-400/20 border border-amber-400/30 text-amber-100 animate-pulse">
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
            ${perPersonAverage.toFixed(2)}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t border-primary-foreground/20">
          <div className="text-center">
            <p className="text-2xl font-black">${totalExpenses.toFixed(0)}</p>
            <p className="text-[10px] uppercase font-bold opacity-70 tracking-tighter">Group Total</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-black flex items-center justify-center gap-1">
              <Users className="h-5 w-5" />
              {memberCount}
            </p>
            <p className="text-[10px] uppercase font-bold opacity-70 tracking-tighter">Members</p>
          </div>
          <div className="text-center border-l border-primary-foreground/20">
            <p className="text-2xl font-black">${(totalExpenses / Math.max(memberCount, 1)).toFixed(0)}</p>
            <p className="text-[10px] uppercase font-bold opacity-70 tracking-tighter">Group Avg</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
