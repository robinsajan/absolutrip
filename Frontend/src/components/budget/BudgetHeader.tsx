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
  userPaid?: number;
  userShare?: number;
}

export function BudgetHeader({
  totalExpenses,
  perPersonAverage,
  memberCount,
  expenseCount,
  expectedPrice,
  userShare = 0,
}: BudgetHeaderProps) {
  return (
    <Card className="bg-[#ccff00] text-black shadow-2xl shadow-[#ccff00]/20 border-none">
      <CardContent className="p-6">
        <div className="text-center pt-2">
          <div className="flex items-center justify-center gap-2">
            <p className="text-xs font-black uppercase tracking-wider opacity-85">My Share (Spent So Far)</p>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="opacity-70 hover:opacity-100 transition-opacity">
                    <Info className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs bg-white text-slate-900 border-none shadow-xl">
                  <p className="text-sm">
                    This is your individual share of the trip's actual expenses. It represents the sum of your splits, regardless of who paid for the expense.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <p className="text-4xl font-black mt-1 tracking-tight">
            ₹{userShare.toFixed(2)}
          </p>
        </div>

        <div className="text-center pt-4 border-t border-black/5 mt-6">
          <div className="flex items-center justify-center gap-2">
            <p className="text-[10px] font-black uppercase tracking-wider opacity-70">Your Forecasted Share (with Scenario Choices)</p>
          </div>
          <p className="text-2xl font-black mt-1 tracking-tight opacity-95">
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

        <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-black/10">
          <div className="text-center border-r border-black/10">
            <p className="text-2xl font-black">{expenseCount}</p>
            <p className="text-[10px] uppercase font-bold opacity-70 tracking-tighter">Total Items</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-black flex items-center justify-center gap-1">
              <Users className="h-5 w-5" />
              {memberCount}
            </p>
            <p className="text-[10px] uppercase font-bold opacity-70 tracking-tighter">Trip Members</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
