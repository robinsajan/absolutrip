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
}

export function BudgetHeader({
  totalExpenses,
  perPersonAverage,
  memberCount,
  expenseCount,
}: BudgetHeaderProps) {
  return (
    <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
      <CardContent className="p-6">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2">
            <p className="text-sm opacity-90">Total Per Person</p>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="opacity-70 hover:opacity-100 transition-opacity">
                    <Info className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <p className="text-sm">
                    This is the average cost per person based on all recorded expenses, split equally among all trip members.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <p className="text-4xl font-bold mt-1">
            ${perPersonAverage.toFixed(2)}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t border-primary-foreground/20">
          <div className="text-center">
            <p className="text-2xl font-semibold">${totalExpenses.toFixed(0)}</p>
            <p className="text-xs opacity-80">Total</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-semibold flex items-center justify-center gap-1">
              <Users className="h-5 w-5" />
              {memberCount}
            </p>
            <p className="text-xs opacity-80">Members</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-semibold">{expenseCount}</p>
            <p className="text-xs opacity-80">Expenses</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
