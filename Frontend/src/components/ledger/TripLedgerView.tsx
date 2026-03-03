"use client";

import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";
import { useAuth, useExpenses, useSettlement, useTripMembers } from "@/lib/hooks";
import { useAppStore } from "@/lib/store";
import { expenses as expensesApi } from "@/lib/api/endpoints";
import { cn } from "@/lib/utils";
import type { Expense } from "@/types";
import { ExpenseForm } from "./ExpenseForm";
import { ExpenseDetails } from "./ExpenseDetails";
import { ExpenseFeed } from "./ExpenseFeed";

type ExpenseScope = "all" | "mine";

function toDate(d?: string) {
  if (!d) return null;
  try {
    return parseISO(d);
  } catch {
    return null;
  }
}

function money(n: number) {
  return `$${n.toFixed(2)}`;
}

function titleCase(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function TripLedgerView({ tripId }: { tripId: number }) {
  const { user } = useAuth();
  const { activeTrip } = useAppStore();
  const { expenses, isLoading: expensesLoading, mutate: mutateExpenses } = useExpenses(tripId);
  const { balances, isLoading: settleLoading, mutate: mutateSettle } = useSettlement(tripId);
  const { members } = useTripMembers(tripId);

  const currentUserId = user?.id;
  const currentUserBalance = useMemo(
    () => balances.find((b) => b.user_id === currentUserId),
    [balances, currentUserId]
  );

  const youAreOwed = Math.max(currentUserBalance?.balance ?? 0, 0);
  const youOwe = Math.max(-(currentUserBalance?.balance ?? 0), 0);

  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<ExpenseScope>("all");
  const [showAll, setShowAll] = useState(false);

  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const sortedExpenses = useMemo(() => {
    const copy = [...expenses];
    copy.sort((a, b) => {
      const ad = toDate(a.expense_date)?.getTime() ?? new Date(a.created_at).getTime();
      const bd = toDate(b.expense_date)?.getTime() ?? new Date(b.created_at).getTime();
      return bd - ad;
    });
    return copy;
  }, [expenses]);

  const filteredExpenses = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sortedExpenses.filter((e) => {
      if (scope === "mine" && currentUserId && e.paid_by !== currentUserId) return false;
      if (!q) return true;
      return (
        e.description.toLowerCase().includes(q) ||
        e.payer_name.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q)
      );
    });
  }, [sortedExpenses, query, scope, currentUserId]);

  const visibleExpenses = useMemo(() => {
    if (showAll) return filteredExpenses;
    return filteredExpenses.slice(0, 10);
  }, [filteredExpenses, showAll]);

  const handleAddExpense = async (data: any) => {
    await expensesApi.create(tripId, data);
    await Promise.all([mutateExpenses(), mutateSettle()]);
    toast.success("Expense added");
  };

  const handleUpdateExpense = async (expenseId: number, data: any) => {
    await expensesApi.update(tripId, expenseId, data);
    await Promise.all([mutateExpenses(), mutateSettle()]);
    setEditingExpense(null);
    toast.success("Expense updated");
  };

  const handleDeleteExpense = async (expenseId: number) => {
    try {
      await expensesApi.delete(tripId, expenseId);
      await Promise.all([mutateExpenses(), mutateSettle()]);
      toast.success("Expense deleted");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to delete expense");
    }
  };

  const isBusy = expensesLoading || settleLoading;

  return (
    <div className="min-h-full bg-slate-50 dark:bg-background-dark">
      {/* Header */}
      <header className="sticky top-0 z-10 h-16 border-b border-primary/10 bg-white dark:bg-slate-900 flex items-center justify-between px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white">
            <span className="material-symbols-outlined text-lg">payments</span>
          </div>
          <h2 className="text-lg font-bold">Trip Ledger</h2>
        </div>

        <div className="flex items-center gap-3 lg:gap-4">
          <div className="relative hidden md:block">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">
              search
            </span>
            <input
              className="pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-lg text-sm w-56 lg:w-64 focus:ring-2 focus:ring-primary/50 transition-all"
              placeholder="Search expenses..."
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <button className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
            <span className="material-symbols-outlined">notifications</span>
          </button>

          <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
            <span className="material-symbols-outlined text-primary text-xl">account_circle</span>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="p-4 lg:p-8 max-w-5xl mx-auto w-full space-y-8">
        {/* Mobile Search */}
        <div className="relative md:hidden">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">
            search
          </span>
          <input
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-primary/10 rounded-lg text-sm focus:ring-2 focus:ring-primary/50 transition-all"
            placeholder="Search expenses..."
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-primary/10 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">You are owed</p>
              <p className="text-3xl font-bold text-emerald-600 mt-1">{money(youAreOwed)}</p>
              <p className="text-emerald-600/80 text-xs font-semibold mt-1 flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">trending_up</span>
                Net balance across the trip
              </p>
            </div>
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center text-emerald-600">
              <span className="material-symbols-outlined text-2xl">call_made</span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-primary/10 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">You owe</p>
              <p className="text-3xl font-bold text-rose-500 mt-1">{money(youOwe)}</p>
              <p className="text-rose-500/80 text-xs font-semibold mt-1 flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">trending_down</span>
                Net balance across the trip
              </p>
            </div>
            <div className="w-12 h-12 bg-rose-100 dark:bg-rose-900/30 rounded-full flex items-center justify-center text-rose-500">
              <span className="material-symbols-outlined text-2xl">call_received</span>
            </div>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-primary/10 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-primary/10 flex items-center justify-between gap-4">
            <div className="flex items-baseline gap-3">
              <h3 className="font-bold text-lg">Recent Expenses</h3>
              {isBusy && <span className="text-xs text-slate-400 font-semibold">Loading…</span>}
            </div>

            <div className="flex gap-2 shrink-0">
              <button
                className={cn(
                  "px-3 py-1.5 text-xs font-bold rounded-lg transition-colors",
                  scope === "all"
                    ? "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700"
                    : "text-slate-500 hover:text-primary"
                )}
                onClick={() => setScope("all")}
              >
                All Expenses
              </button>
              <button
                className={cn(
                  "px-3 py-1.5 text-xs font-bold rounded-lg transition-colors",
                  scope === "mine"
                    ? "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700"
                    : "text-slate-500 hover:text-primary"
                )}
                onClick={() => setScope("mine")}
              >
                Your Expenses
              </button>
            </div>
          </div>

          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                  <th className="px-6 py-4 font-semibold">Date &amp; Expense</th>
                  <th className="px-6 py-4 font-semibold">Payer</th>
                  <th className="px-6 py-4 font-semibold">Total Amount</th>
                  <th className="px-6 py-4 font-semibold">Your Share</th>
                  <th className="px-6 py-4 font-semibold text-right">Status</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-primary/5">
                {visibleExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-slate-500">
                      No expenses found
                    </td>
                  </tr>
                ) : (
                  visibleExpenses.map((expense) => {
                    const dateObj = toDate(expense.expense_date) ?? new Date(expense.created_at);
                    const month = format(dateObj, "MMM");
                    const day = format(dateObj, "dd");

                    const share = currentUserId
                      ? expense.splits.find((s) => s.user_id === currentUserId)?.amount ?? 0
                      : 0;

                    const net = currentUserId
                      ? expense.paid_by === currentUserId
                        ? expense.amount - share
                        : -share
                      : 0;

                    const netLabel =
                      net > 0 ? "You get back" : net < 0 ? `You owe ${expense.payer_name}` : "No change";

                    const isSettlement = expense.category === "settlement";

                    const status = isSettlement
                      ? { label: "Settled", cls: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" }
                      : net < 0
                        ? { label: "Unpaid", cls: "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400" }
                        : net > 0
                          ? { label: "Partial", cls: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" }
                          : { label: "Settled", cls: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" };

                    const showActions = currentUserId && expense.paid_by === currentUserId && !isSettlement;

                    return (
                      <tr
                        key={expense.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors group"
                        onClick={() => {
                          setSelectedExpense(expense);
                          setIsDetailsOpen(true);
                        }}
                        role="button"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <div className="flex flex-col items-center justify-center w-10 h-10 bg-primary/10 text-primary rounded-lg">
                              <span className="text-[10px] font-bold uppercase">{month}</span>
                              <span className="text-sm font-bold leading-none">{day}</span>
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-sm group-hover:text-primary transition-colors truncate">
                                {expense.description}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                {activeTrip?.name ? `${activeTrip.name} • ` : ""}
                                {titleCase(expense.category)}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {currentUserId && expense.paid_by === currentUserId ? (
                              <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-[10px] font-bold text-white">
                                YOU
                              </div>
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-700 dark:text-slate-200">
                                {getInitials(expense.payer_name)}
                              </div>
                            )}
                            <span className="text-sm">{currentUserId && expense.paid_by === currentUserId ? "You" : expense.payer_name}</span>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <p className="text-sm font-bold">{money(expense.amount)}</p>
                          <p className="text-[10px] text-slate-500">
                            {expense.split_type === "equally"
                              ? `Split equally (${expense.splits.length || members.length || 0})`
                              : `Split: ${expense.split_type}`}
                          </p>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className={cn("text-sm font-bold", net < 0 ? "text-rose-500" : net > 0 ? "text-emerald-600" : "text-slate-400")}>
                              {net < 0 ? "-" : net > 0 ? "+" : ""}
                              {money(Math.abs(net))}
                            </span>
                            <span className="text-[10px] text-slate-400 uppercase font-medium truncate">{netLabel}</span>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold", status.cls)}>
                              {status.label}
                            </span>

                            {showActions && (
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                <button
                                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-primary"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingExpense(expense);
                                  }}
                                  title="Edit"
                                >
                                  <Pencil className="size-4" />
                                </button>
                                <button
                                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (window.confirm("Delete this expense?")) {
                                      handleDeleteExpense(expense.id);
                                    }
                                  }}
                                  title="Delete"
                                >
                                  <Trash2 className="size-4" />
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="md:hidden p-4">
            <ExpenseFeed
              expenses={visibleExpenses}
              currentUserId={currentUserId}
              onDelete={handleDeleteExpense}
              onEdit={setEditingExpense}
              memberCount={members.length}
            />
          </div>

          {filteredExpenses.length > 10 && (
            <div className="p-4 bg-slate-50 dark:bg-slate-800/30 border-t border-primary/10 flex justify-center">
              <button
                className="text-primary text-sm font-bold flex items-center gap-1 hover:underline"
                onClick={() => setShowAll((v) => !v)}
              >
                {showAll ? "View fewer transactions" : "View more transactions"}
                <span className="material-symbols-outlined text-sm">
                  {showAll ? "keyboard_arrow_up" : "keyboard_arrow_down"}
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Add/Edit Expense */}
        <ExpenseForm
          tripId={tripId}
          members={members}
          currentUserId={currentUserId}
          onSubmit={handleAddExpense}
          onUpdate={handleUpdateExpense}
          editExpense={editingExpense}
          onCancelEdit={() => setEditingExpense(null)}
          tripStartDate={activeTrip?.start_date}
          tripEndDate={activeTrip?.end_date}
        />

        {/* Details */}
        <ExpenseDetails
          expense={selectedExpense}
          isOpen={isDetailsOpen}
          onClose={() => {
            setIsDetailsOpen(false);
            setSelectedExpense(null);
          }}
        />
      </div>
    </div>
  );
}

