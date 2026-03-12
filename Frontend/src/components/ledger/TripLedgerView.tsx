"use client";

import { useMemo, useState, useCallback } from "react";
import { format, parseISO, differenceInDays } from "date-fns";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";
import { useAuth, useExpenses, useSettlement, useTripMembers, useRankedOptions, useBudget } from "@/lib/hooks";
import { useAppStore } from "@/lib/store";
import { expenses as expensesApi } from "@/lib/api/endpoints";
import { cn } from "@/lib/utils";
import type { Expense, RankedOption } from "@/types";
import { ExpenseForm } from "./ExpenseForm";
import { ExpenseDetails } from "./ExpenseDetails";
import { ExpenseFeed } from "./ExpenseFeed";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

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
  const { budget } = useBudget(tripId);
  const { rankedOptions } = useRankedOptions(tripId);

  const calculateOptionPrice = useCallback((ro: RankedOption) => {
    const { option } = ro;
    const count = Math.max(members.length, 1);

    if (option.price_per_day_pp !== undefined && option.price_per_day_pp !== null) {
      let nights = 1;
      if (option.check_in_date && option.check_out_date) {
        nights = Math.max(differenceInDays(parseISO(option.check_out_date), parseISO(option.check_in_date)), 1);
      }
      return option.price_per_day_pp * count * nights;
    }

    let price = (option.price || 0) / count;
    if (option.is_per_night && option.check_in_date && option.check_out_date) {
      try {
        const nights = Math.max(differenceInDays(parseISO(option.check_out_date), parseISO(option.check_in_date)), 1);
        price *= nights;
      } catch (e) { }
    }
    return price;
  }, [members.length]);

  const currentUserId = user?.id;
  const currentUserBalance = useMemo(
    () => balances.find((b) => b.user_id === currentUserId),
    [balances, currentUserId]
  );

  const youAreOwed = Math.max(currentUserBalance?.balance ?? 0, 0);
  const youOwe = Math.max(-(currentUserBalance?.balance ?? 0), 0);

  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<ExpenseScope>("mine");
  const [showAll, setShowAll] = useState(false);

  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [showAddExpense, setShowAddExpense] = useState(false);

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

  const actualExpenses = budget?.total_expenses ?? 0;

  // Simplified spending progress for ledger (actual vs scenario-like)
  // For ledger, we'll show progress relative to the sum of actuals + finalized options
  const finalizedOptionsTotal = useMemo(() => {
    return (rankedOptions || [])
      .filter(ro => ro.option.is_finalized)
      .reduce((sum, ro) => sum + calculateOptionPrice(ro), 0);
  }, [rankedOptions, calculateOptionPrice]);

  const totalProjected = actualExpenses + finalizedOptionsTotal;
  const spendingProgress = totalProjected > 0 ? (actualExpenses / totalProjected) * 100 : 0;

  // Calculate top spenders from actual expenses
  const spenderData = useMemo(() => {
    const totals: Record<number, { name: string, amount: number }> = {};
    expenses.forEach(e => {
      if (!totals[e.paid_by]) {
        totals[e.paid_by] = { name: e.payer_name, amount: 0 };
      }
      totals[e.paid_by].amount += e.amount;
    });
    return Object.entries(totals)
      .map(([id, data]) => ({ id: Number(id), ...data }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 3);
  }, [expenses]);

  return (
    <div className="bg-[#fbfbf8] dark:bg-background-dark min-h-screen pb-24 font-sans">
      <main className="max-w-7xl mx-auto px-6 py-12 space-y-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-3xl md:text-6xl font-black text-black dark:text-white tracking-tighter lowercase serif-title italic animate-in fade-in slide-in-from-left-4 duration-700">ledger log</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2 font-black uppercase tracking-[0.2em] text-[8px] md:text-[10px] animate-in fade-in slide-in-from-left-4 duration-700 delay-100">
              {activeTrip?.name || "Trip"} • {expenses.length} transactions
            </p>
          </div>

          {/* Desktop Add Button */}
          <button
            onClick={() => {
              setEditingExpense(null);
              setShowAddExpense(true);
            }}
            className="hidden md:flex bg-black dark:bg-white dark:text-black text-white px-8 py-4 rounded-full font-black text-[10px] uppercase tracking-widest items-center gap-2 hover:opacity-90 transition-all shadow-xl shadow-black/5 animate-in fade-in slide-in-from-right-4 duration-700"
          >
            <span className="material-symbols-outlined text-xl">add</span>
            add expense
          </button>
        </div>

        {/* Mobile FAB */}
        <button
          onClick={() => {
            setEditingExpense(null);
            setShowAddExpense(true);
          }}
          className="md:hidden fixed bottom-24 right-6 z-40 bg-black dark:bg-white dark:text-black text-white w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-transform active:scale-90 animate-in fade-in zoom-in duration-500"
          aria-label="Add expense"
        >
          <span className="material-symbols-outlined text-3xl">add</span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Main Ledger Area */}
          <div className="lg:col-span-8 space-y-12">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-3 md:gap-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
              <div className="bg-white dark:bg-slate-900 p-4 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between group transition-all hover:shadow-xl hover:scale-[1.01]">
                <div>
                  <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5 lowercase">you are owed</p>
                  <h2 className="text-xl sm:text-2xl md:text-5xl font-black text-emerald-600 tracking-tighter">{money(youAreOwed)}</h2>
                  <p className="hidden sm:flex text-emerald-600/60 text-[8px] font-black uppercase tracking-widest mt-2 items-center gap-1">
                    <span className="material-symbols-outlined text-xs material-symbols-filled">trending_up</span>
                    Positive Balance
                  </p>
                </div>
                <div className="w-8 h-8 md:w-16 md:h-16 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl md:rounded-2xl flex items-center justify-center text-emerald-600 transform rotate-3 transition-transform group-hover:rotate-6 shrink-0">
                  <span className="material-symbols-outlined text-lg md:text-3xl filled-icon">call_made</span>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-4 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between group transition-all hover:shadow-xl hover:scale-[1.01]">
                <div>
                  <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5 lowercase">you owe</p>
                  <h2 className="text-xl sm:text-2xl md:text-5xl font-black text-rose-500 tracking-tighter">{money(youOwe)}</h2>
                  <p className="hidden sm:flex text-rose-500/60 text-[8px] font-black uppercase tracking-widest mt-2 items-center gap-1">
                    <span className="material-symbols-outlined text-xs material-symbols-filled">trending_down</span>
                    settle up soon
                  </p>
                </div>
                <div className="w-8 h-8 md:w-16 md:h-16 bg-rose-50 dark:bg-rose-900/20 rounded-xl md:rounded-2xl flex items-center justify-center text-rose-500 transform -rotate-3 transition-transform group-hover:-rotate-6 shrink-0">
                  <span className="material-symbols-outlined text-lg md:text-3xl filled-icon">call_received</span>
                </div>
              </div>
            </div>

            {/* Ledger Table Container */}
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
              <div className="p-6 md:p-8 border-b border-slate-50 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex flex-col text-center md:text-left">
                  <h3 className="font-black text-lg md:text-xl text-black dark:text-white tracking-tight lowercase">transaction log</h3>
                  {isBusy && <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">Syncing…</span>}
                </div>

                <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl ring-1 ring-slate-200 dark:ring-slate-700 w-full md:w-auto overflow-x-auto">
                  <button
                    className={cn(
                      "flex-1 md:flex-none px-4 md:px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                      scope === "all"
                        ? "bg-white dark:bg-slate-700 text-primary shadow-sm"
                        : "text-slate-500 hover:text-primary"
                    )}
                    onClick={() => setScope("all")}
                  >
                    All Expenses
                  </button>
                  <button
                    className={cn(
                      "flex-1 md:flex-none px-4 md:px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                      scope === "mine"
                        ? "bg-white dark:bg-slate-700 text-primary shadow-sm"
                        : "text-slate-500 hover:text-primary"
                    )}
                    onClick={() => setScope("mine")}
                  >
                    My Expenses
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
                          net > 0 ? "You" : net < 0 ? `To ${expense.payer_name}` : "No change";

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
                                        setShowAddExpense(true);
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
                  onEdit={(expense) => {
                    setEditingExpense(expense);
                    setShowAddExpense(true);
                  }}
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
          </div>

          {/* Stats & Metrics Section */}
          <div className="lg:col-span-4 space-y-8 animate-in fade-in slide-in-from-right-8 duration-1000 delay-300">
            {/* Mobile Toggle for Insights */}
            <div className="lg:hidden">
              <Sheet>
                <SheetTrigger asChild>
                  <button className="w-full bg-emerald-500 text-white p-4 rounded-2xl shadow-lg flex items-center justify-between active:scale-95 transition-transform">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-xl material-symbols-filled">insights</span>
                      <span className="text-[10px] font-black uppercase tracking-widest">View Ledger Insights</span>
                    </div>
                    <span className="material-symbols-outlined">expand_more</span>
                  </button>
                </SheetTrigger>
                <SheetContent side="bottom" className="h-[80vh] bg-[#fbfbf8] dark:bg-slate-950 rounded-t-[3rem] p-8 overflow-y-auto border-none">
                  <SheetHeader className="mb-8">
                    <SheetTitle className="text-3xl font-black lowercase serif-title italic">ledger insights</SheetTitle>
                  </SheetHeader>
                  <div className="space-y-8">
                    {/* Spending Progress */}
                    <section className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm h-fit">
                      <div className="flex justify-between items-center mb-6">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Spending Progress</span>
                        <span className="text-xs font-black text-primary uppercase">{Math.round(spendingProgress)}%</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-6 rounded-full overflow-hidden p-1.5 shadow-inner">
                        <div
                          className="bg-primary h-full rounded-full transition-all duration-1000 ease-out shadow-lg"
                          style={{ width: `${Math.min(100, spendingProgress)}%` }}
                        ></div>
                      </div>
                      <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest mt-4 text-center">Relative to finalized scenarios</p>
                    </section>

                    {/* Top Spenders Mini-List */}
                    <section className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8">Top Spenders</h3>
                      <div className="space-y-6">
                        {spenderData.map((spender, i) => (
                          <div key={spender.id} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-black text-slate-600 dark:text-slate-300">
                                  {getInitials(spender.name)}
                                </div>
                                <span className="text-xs font-bold">{spender.name}</span>
                              </div>
                              <span className="text-xs font-black">${Math.round(spender.amount).toLocaleString()}</span>
                            </div>
                            <div className="w-full bg-slate-50 dark:bg-slate-800/50 h-1 rounded-full overflow-hidden">
                              <div className="bg-primary h-full rounded-full opacity-60" style={{ width: `${(spender.amount / (spenderData[0]?.amount || 1)) * 100}%` }}></div>
                            </div>
                          </div>
                        ))}
                        {spenderData.length === 0 && (
                          <p className="text-[10px] text-slate-400 uppercase font-black text-center py-4">No data yet</p>
                        )}
                      </div>
                    </section>
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            {/* Desktop Sidebar (hidden on mobile) */}
            <div className="hidden lg:block space-y-8 h-full">
              {/* Spending Progress */}
              <section className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm h-fit">
                <div className="flex justify-between items-center mb-6">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Spending Progress</span>
                  <span className="text-xs font-black text-primary uppercase">{Math.round(spendingProgress)}%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-6 rounded-full overflow-hidden p-1.5 shadow-inner">
                  <div
                    className="bg-primary h-full rounded-full transition-all duration-1000 ease-out shadow-lg"
                    style={{ width: `${Math.min(100, spendingProgress)}%` }}
                  ></div>
                </div>
                <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest mt-4 text-center">Relative to finalized scenarios</p>
              </section>

              {/* Top Spenders Mini-List */}
              <section className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8">Top Spenders</h3>
                <div className="space-y-6">
                  {spenderData.map((spender, i) => (
                    <div key={spender.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-black text-slate-600 dark:text-slate-300">
                            {getInitials(spender.name)}
                          </div>
                          <span className="text-xs font-bold">{spender.name}</span>
                        </div>
                        <span className="text-xs font-black">${Math.round(spender.amount).toLocaleString()}</span>
                      </div>
                      <div className="w-full bg-slate-50 dark:bg-slate-800/50 h-1 rounded-full overflow-hidden">
                        <div className="bg-primary h-full rounded-full opacity-60" style={{ width: `${(spender.amount / (spenderData[0]?.amount || 1)) * 100}%` }}></div>
                      </div>
                    </div>
                  ))}
                  {spenderData.length === 0 && (
                    <p className="text-[10px] text-slate-400 uppercase font-black text-center py-4">No data yet</p>
                  )}
                </div>
              </section>

              {/* Budget Breakdown Summary */}
              <div className="bg-emerald-500 p-8 rounded-[2.5rem] shadow-xl shadow-emerald-500/10 text-white">
                <div className="flex items-center gap-2 mb-4">
                  <span className="material-symbols-outlined text-white text-xl material-symbols-filled">insights</span>
                  <h4 className="font-black text-[10px] uppercase tracking-widest text-white/80">Ledger Insights</h4>
                </div>
                <p className="text-xs font-bold leading-relaxed">
                  Total group spending has reached {money(actualExpenses)}.
                  {spenderData.length > 0 && ` ${spenderData[0].name} is currently leading the contributions.`}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Details */}
        <ExpenseDetails
          expense={selectedExpense}
          isOpen={isDetailsOpen}
          onClose={() => {
            setIsDetailsOpen(false);
            setSelectedExpense(null);
          }}
        />

        <ExpenseForm
          tripId={tripId}
          members={members}
          currentUserId={currentUserId}
          onSubmit={async (data) => {
            await handleAddExpense(data);
            setShowAddExpense(false);
          }}
          onUpdate={handleUpdateExpense}
          editExpense={editingExpense}
          onCancelEdit={() => {
            setEditingExpense(null);
          }}
          tripStartDate={activeTrip?.start_date}
          tripEndDate={activeTrip?.end_date}
          open={showAddExpense}
          onOpenChange={(open) => {
            setShowAddExpense(open);
            if (!open) {
              setEditingExpense(null);
            }
          }}
          showTrigger={false}
        />
      </main>
    </div>
  );
}
