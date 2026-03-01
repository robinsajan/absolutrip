"use client";

import { useParams } from "next/navigation";
import { Info } from "lucide-react";
import { DebtSummary, SettlementCard } from "@/components/settle";
import { useSettlement, useAuth } from "@/lib/hooks";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function SettlePage() {
  const params = useParams();
  const tripId = Number(params.tripId);
  const { user } = useAuth();
  const { balances, settlements, explanation, isLoading } = useSettlement(tripId);

  const currentUserBalance = balances.find((b) => b.user_id === user?.id);

  const paymentsToMake = settlements.filter((s) => s.from_user_id === user?.id);
  const paymentsToReceive = settlements.filter((s) => s.to_user_id === user?.id);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-6">
      <DebtSummary balance={currentUserBalance} userName={user?.name} explanation={explanation} />

      {paymentsToMake.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-lg">You Need to Pay</h2>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="text-muted-foreground hover:text-foreground transition-colors">
                    <Info className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                  <p className="text-sm">
                    These are optimized payments to settle your debts with the minimum number of transactions.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          {paymentsToMake.map((settlement, index) => (
            <SettlementCard
              key={`pay-${index}`}
              settlement={settlement}
              type="pay"
            />
          ))}
        </div>
      )}

      {paymentsToReceive.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-lg">You Will Receive</h2>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="text-muted-foreground hover:text-foreground transition-colors">
                    <Info className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                  <p className="text-sm">
                    These are payments others need to make to you based on the expenses you covered.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          {paymentsToReceive.map((settlement, index) => (
            <SettlementCard
              key={`receive-${index}`}
              settlement={settlement}
              type="receive"
            />
          ))}
        </div>
      )}

      {paymentsToMake.length === 0 && paymentsToReceive.length === 0 && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No settlements needed</p>
          <p className="text-sm text-muted-foreground mt-1">
            Add some expenses to see who owes whom
          </p>
        </div>
      )}

      {balances.length > 0 && (
        <div className="space-y-3 pt-4 border-t">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-lg">All Balances</h2>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="text-muted-foreground hover:text-foreground transition-colors">
                    <Info className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                  <p className="text-sm">
                    {explanation?.how_it_works || "Positive balance means you're owed money. Negative means you owe."}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="grid gap-2">
            {balances.map((balance) => (
              <div
                key={balance.user_id}
                className="flex items-center justify-between p-3 bg-muted rounded-lg"
              >
                <span className={balance.user_id === user?.id ? "font-medium" : ""}>
                  {balance.user_name}
                  {balance.user_id === user?.id && " (You)"}
                </span>
                <span
                  className={
                    balance.status === "owed"
                      ? "text-green-600 font-medium"
                      : balance.status === "owes"
                      ? "text-red-600 font-medium"
                      : "text-muted-foreground"
                  }
                >
                  {balance.status === "owed" && "+"}
                  {balance.status === "owes" && "-"}
                  ${Math.abs(balance.balance).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {explanation && (
        <div className="text-center text-xs text-muted-foreground pt-4 border-t">
          <p>
            Total expenses: ${explanation.total_expenses.toFixed(2)} · 
            {explanation.member_count} members · 
            ${explanation.per_person_average.toFixed(2)}/person average
          </p>
        </div>
      )}
    </div>
  );
}
