"use client";

import { Utensils, Car, Home, Sparkles, MoreHorizontal } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ExpenseBreakdownProps {
  byCategory: Record<string, number>;
  byPayer: Record<string, number>;
  total: number;
}

const categoryIcons: Record<string, React.ReactNode> = {
  food: <Utensils className="h-4 w-4" />,
  transport: <Car className="h-4 w-4" />,
  stay: <Home className="h-4 w-4" />,
  activity: <Sparkles className="h-4 w-4" />,
  other: <MoreHorizontal className="h-4 w-4" />,
};

const categoryColors: Record<string, string> = {
  food: "bg-slate-900 dark:bg-slate-100",
  transport: "bg-slate-700 dark:bg-slate-300",
  stay: "bg-slate-500 dark:bg-slate-500",
  activity: "bg-slate-400 dark:bg-slate-600",
  other: "bg-slate-300 dark:bg-slate-700",
};

export function ExpenseBreakdown({
  byCategory,
  byPayer,
  total,
}: ExpenseBreakdownProps) {
  const categories = Object.entries(byCategory).sort((a, b) => b[1] - a[1]);
  const payers = Object.entries(byPayer).sort((a, b) => b[1] - a[1]);

  // Assuming we don't have member count here directly, we'll just show the total
  // and maybe adjust later if member count is passed as a prop.
  // Actually, looking at the call site in BudgetDashboard:
  // <ExpenseBreakdown byCategory={...} byPayer={...} total={...} />
  // It doesn't take memberCount. Let's add it.

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-slate-500 uppercase tracking-wider text-[10px] font-bold">By Category</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {categories.length === 0 ? (
            <p className="text-sm text-muted-foreground">No expenses yet</p>
          ) : (
            categories.map(([category, amount]) => {
              const percentage = total > 0 ? (amount / total) * 100 : 0;
              return (
                <div key={category} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span
                        className={`p-1 rounded ${categoryColors[category] || categoryColors.other} text-white`}
                      >
                        {categoryIcons[category] || categoryIcons.other}
                      </span>
                      <span className="capitalize text-xs font-semibold">{category}</span>
                    </div>
                    <span className="font-bold">₹{amount.toFixed(0)}</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${categoryColors[category] || categoryColors.other} transition-all`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">By Payer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {payers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No expenses yet</p>
          ) : (
            payers.map(([payer, amount]) => {
              const percentage = total > 0 ? (amount / total) * 100 : 0;
              return (
                <div key={payer} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>{payer}</span>
                    <span className="font-medium">₹{amount.toFixed(2)}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
