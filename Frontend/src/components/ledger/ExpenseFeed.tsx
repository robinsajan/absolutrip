"use client";

import { useState } from "react";
import { Users, ChevronsRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { Expense } from "@/types";
import { ExpenseDetails } from "./ExpenseDetails";

interface ExpenseFeedProps {
  expenses: Expense[];
  currentUserId?: number;
  onDelete?: (expenseId: number) => void;
  onEdit?: (expense: Expense) => void;
  memberCount?: number;
}

export function ExpenseFeed({ expenses, currentUserId, onDelete, onEdit, memberCount }: ExpenseFeedProps) {
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  if (expenses.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No expenses yet</p>
        <p className="text-sm text-muted-foreground mt-1">
          Tap the + button to add an expense
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
      <div className="flex flex-col">
        {expenses.map((expense, index) => {
          const canModify = expense.paid_by === currentUserId;
          const isSettlement = expense.category === "settlement";
          
          return (
            <div
              key={expense.id}
              onClick={() => {
                setSelectedExpense(expense);
                setIsDetailsOpen(true);
              }}
              className={cn(
                "px-4 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all cursor-pointer group relative",
                index !== 0 && "border-t border-slate-50 dark:border-slate-800"
              )}
            >
              {/* Avatar */}
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-black text-[10px] border border-slate-200 dark:border-slate-700">
                  {getInitials(expense.payer_name)}
                </AvatarFallback>
              </Avatar>

              {/* Main Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-bold truncate text-slate-900 dark:text-white">
                    <span className="text-primary font-black uppercase tracking-tight text-[11px] mr-1">
                      {canModify ? "You" : expense.payer_name}
                    </span>
                    <span className="text-slate-400 font-medium lowercase text-[11px] mr-1">
                      {isSettlement ? "settled" : "paid"}
                    </span>
                    <span className="font-black text-slate-950 dark:text-slate-100">
                      ₹{expense.amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                    </span>
                  </p>
                </div>

                {expense.description && (
                  <p className="text-[11px] text-slate-400 font-medium truncate italic mt-0.5">
                    for <span className="not-italic text-slate-600 dark:text-slate-400">{expense.description}</span>
                  </p>
                )}
              </div>

              {/* Chevron */}
              <ChevronsRight className="h-4 w-4 text-slate-300 group-hover:text-primary transition-all shrink-0 translate-x-0 group-hover:translate-x-1 duration-300" />
            </div>
          );
        })}
      </div>

      <ExpenseDetails
        expense={selectedExpense}
        isOpen={isDetailsOpen}
        currentUserId={currentUserId}
        onDelete={onDelete}
        onClose={() => {
          setIsDetailsOpen(false);
          setSelectedExpense(null);
        }}
      />
    </div>
  );
}
