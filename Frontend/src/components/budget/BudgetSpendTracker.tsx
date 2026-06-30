"use client";

import React, { useMemo, useState } from "react";
import {
  Utensils,
  Car,
  Home,
  Sparkles,
  MoreHorizontal,
  TrendingUp,
  Users,
  Wallet,
  Target,
  PenLine,
  ChevronRight,
  CalendarDays,
  Info,
  X,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import {
  useBudget,
  useExpenses,
  useAuth,
  useTrip,
  useSettlement,
} from "@/lib/hooks";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { TripBudgetPlanner } from "./TripBudgetPlanner";

// ── Category Config ────────────────────────────────────────────────────────────

interface CategoryConfig {
  label: string;
  icon: React.ReactNode;
  color: string;        // bg color for the icon chip
  textColor: string;    // text / progress bar color
  barColor: string;     // tailwind bg for bar fill
  emoji: string;
}

const CATEGORY_MAP: Record<string, CategoryConfig> = {
  food: {
    label: "Food & Dining",
    icon: <Utensils className="h-4 w-4" />,
    color: "bg-rose-500/10",
    textColor: "text-rose-500",
    barColor: "bg-rose-500",
    emoji: "🍔",
  },
  transport: {
    label: "Transport",
    icon: <Car className="h-4 w-4" />,
    color: "bg-teal-500/10",
    textColor: "text-teal-500",
    barColor: "bg-teal-500",
    emoji: "🚗",
  },
  stay: {
    label: "Accommodation",
    icon: <Home className="h-4 w-4" />,
    color: "bg-violet-500/10",
    textColor: "text-violet-500",
    barColor: "bg-violet-500",
    emoji: "🏨",
  },
  activity: {
    label: "Activities",
    icon: <Sparkles className="h-4 w-4" />,
    color: "bg-amber-500/10",
    textColor: "text-amber-500",
    barColor: "bg-amber-500",
    emoji: "✨",
  },
  settlement: {
    label: "Settlement",
    icon: <Wallet className="h-4 w-4" />,
    color: "bg-blue-500/10",
    textColor: "text-blue-500",
    barColor: "bg-blue-500",
    emoji: "💸",
  },
  other: {
    label: "Other",
    icon: <MoreHorizontal className="h-4 w-4" />,
    color: "bg-slate-500/10",
    textColor: "text-slate-500",
    barColor: "bg-slate-400",
    emoji: "📦",
  },
};

function getCategoryConfig(cat: string): CategoryConfig {
  return CATEGORY_MAP[cat] ?? CATEGORY_MAP.other;
}

// ── Progress Bar ───────────────────────────────────────────────────────────────

function BudgetProgressBar({
  spent,
  budget,
}: {
  spent: number;
  budget: number | null;
}) {
  const pct = budget && budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
  const isOver = budget ? spent > budget : false;

  // gradient: green → yellow → red
  const barClass =
    pct < 50
      ? "from-emerald-400 to-emerald-500"
      : pct < 75
      ? "from-amber-400 to-yellow-500"
      : pct < 90
      ? "from-orange-400 to-orange-500"
      : "from-rose-500 to-red-600";

  return (
    <div className="relative w-full h-3 bg-white/10 rounded-full overflow-hidden">
      <div
        className={cn(
          "h-full rounded-full bg-gradient-to-r transition-all duration-700 ease-out",
          barClass
        )}
        style={{ width: `${pct}%` }}
      />
      {/* Pulsing tip */}
      {pct > 2 && pct < 100 && (
        <div
          className="absolute top-0 bottom-0 w-1 rounded-full bg-white/60 animate-pulse"
          style={{ left: `calc(${pct}% - 2px)` }}
        />
      )}
    </div>
  );
}

// ── Category Card (grid) ──────────────────────────────────────────────────────

function CategoryCard({
  category,
  amount,
  total,
}: {
  category: string;
  amount: number;
  total: number;
}) {
  const cfg = getCategoryConfig(category);
  const pct = total > 0 ? ((amount / total) * 100).toFixed(0) : "0";

  return (
    <div className="relative bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 flex flex-col gap-3 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 overflow-hidden group">
      {/* Subtle bg glow */}
      <div
        className={cn(
          "absolute -top-3 -right-3 w-16 h-16 rounded-full opacity-30 blur-xl transition-opacity group-hover:opacity-50",
          cfg.color
        )}
      />

      <div className="flex items-center justify-between">
        <span
          className={cn(
            "inline-flex items-center justify-center w-9 h-9 rounded-xl text-sm",
            cfg.color,
            cfg.textColor
          )}
        >
          {cfg.icon}
        </span>
        <span
          className={cn(
            "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full",
            cfg.color,
            cfg.textColor
          )}
        >
          {pct}%
        </span>
      </div>

      <div>
        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
          {cfg.label}
        </p>
        <p className="text-xl font-black text-slate-900 dark:text-white leading-none mt-0.5">
          ₹{amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
        </p>
      </div>

      {/* Mini bar */}
      <div className="h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-700", cfg.barColor)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function BudgetSpendTracker({ tripId }: { tripId: string }) {
  const { user } = useAuth();
  const { budget, isLoading: budgetLoading } = useBudget(tripId);
  const { expenses, isLoading: expensesLoading } = useExpenses(tripId);
  const { trip, isLoading: tripLoading } = useTrip(tripId);
  const { balances } = useSettlement(tripId);

  const [plannerOpen, setPlannerOpen] = useState(false);
  const [showAllExpenses, setShowAllExpenses] = useState(false);

  const isLoading = budgetLoading || expensesLoading || tripLoading;

  // Per-person budget (admin-set target on the trip)
  const perPersonBudget = trip?.budget ?? null;

  // Retrieve current user's balance details (Paid vs Share)
  const userBalance = useMemo(() => {
    if (!user) return undefined;
    return balances.find((b) => b.user_id === user.id);
  }, [balances, user]);

  const userPaid = userBalance?.total_paid ?? 0;

  // Calculate personal spends from expenses where the user has a split
  const personalSpends = useMemo(() => {
    const categorySums: Record<string, number> = {};
    let total = 0;

    expenses.forEach((expense) => {
      if (expense.category === "settlement") return;
      
      const userSplit = user
        ? expense.splits?.find((s) => s.user_id === user.id)?.amount
        : undefined;

      if (userSplit !== undefined) {
        const cat = expense.category || "other";
        categorySums[cat] = (categorySums[cat] || 0) + userSplit;
        total += userSplit;
      }
    });

    return {
      byCategory: categorySums,
      totalSpent: total,
    };
  }, [expenses, user]);

  const userShare = personalSpends.totalSpent;

  const memberCount = budget?.member_count ?? 1;
  const totalGroupSpend = budget?.total_expenses ?? 0;
  const perPersonSpend = totalGroupSpend / Math.max(memberCount, 1);

  // Personal balance (what the current user has paid vs their share)
  const personalBalance = userBalance?.balance ?? 0;

  // Category breakdown — based only on user's share/splits
  const categories = Object.entries(personalSpends.byCategory)
    .sort(([, a], [, b]) => b - a);

  const categoryTotal = personalSpends.totalSpent;

  // All expenses sorted newest first (excluding settlements)
  const allExpensesSorted = useMemo(
    () =>
      [...expenses]
        .filter((e) => e.category !== "settlement")
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ),
    [expenses]
  );

  // Recent 5 expenses (sorted newest first)
  const recentExpenses = useMemo(() => allExpensesSorted.slice(0, 5), [allExpensesSorted]);

  // What to display in the list based on toggle
  const displayedExpenses = showAllExpenses ? allExpensesSorted : recentExpenses;

  // Progress % based on what the user has to pay vs their budget
  const progressPct =
    perPersonBudget && perPersonBudget > 0
      ? Math.min((userShare / perPersonBudget) * 100, 100)
      : 0;

  const remaining =
    perPersonBudget !== null ? perPersonBudget - userShare : null;

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (isLoading && !budget) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-14 w-14 animate-spin rounded-full border-4 border-[#ccff00]/20 border-t-[#ccff00]" />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
            Crunching numbers…
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6 pb-28">
        {/* ── Hero spend card ─────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-6 md:p-8 shadow-2xl shadow-black/30">
          {/* Decorative blobs */}
          <div className="pointer-events-none absolute -top-12 -right-12 h-48 w-48 rounded-full bg-[#ccff00]/5 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-12 -left-12 h-48 w-48 rounded-full bg-violet-500/5 blur-3xl" />

          {/* Header row / My Share */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.25em] text-white/40 mb-1">
                My Share (Spent So Far)
              </p>
              <h1 className="text-3xl md:text-4xl font-black italic text-white leading-none">
                ₹{userShare.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </h1>
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-1">
                based on your splits
              </p>
            </div>

            <div className="flex flex-col items-end gap-2">
              {/* Member count chip */}
              <div className="flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1.5">
                <Users className="h-3 w-3 text-white/60" />
                <span className="text-[10px] font-black text-white/60">
                  {memberCount} members
                </span>
              </div>
              {/* Expense count */}
              <div className="flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1.5">
                <TrendingUp className="h-3 w-3 text-white/60" />
                <span className="text-[10px] font-black text-white/60">
                  {budget?.expense_count ?? 0} expenses
                </span>
              </div>
            </div>
          </div>

          {/* Progress vs budget */}
          {perPersonBudget && perPersonBudget > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="h-3.5 w-3.5 text-[#ccff00]" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-white/50">
                    Your Budget Target
                  </span>
                </div>
                <span className="text-[10px] font-black text-[#ccff00]">
                  ₹{perPersonBudget.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                </span>
              </div>

              <BudgetProgressBar spent={userShare} budget={perPersonBudget} />

              <div className="flex items-center justify-between">
                <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">
                  {progressPct.toFixed(0)}% used
                </span>
                {remaining !== null && (
                  <span
                    className={cn(
                      "text-[9px] font-black uppercase tracking-widest",
                      remaining >= 0 ? "text-emerald-400" : "text-rose-400"
                    )}
                  >
                    {remaining >= 0
                      ? `₹${remaining.toLocaleString("en-IN", { maximumFractionDigits: 0 })} left`
                      : `₹${Math.abs(remaining).toLocaleString("en-IN", { maximumFractionDigits: 0 })} over budget`}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-white/5 rounded-2xl px-4 py-3 border border-white/10">
              <Info className="h-4 w-4 text-white/30 shrink-0" />
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                No budget target set — admin can set it in Trip Settings
              </p>
            </div>
          )}
        </div>

        {/* ── Category Cards Grid ──────────────────────────────────────────── */}
        {categories.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                Spend by Category
              </h2>
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                Total ₹{categoryTotal.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {categories.map(([cat, amount]) => (
                <CategoryCard
                  key={cat}
                  category={cat}
                  amount={amount}
                  total={categoryTotal}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 py-12 gap-3">
            <Wallet className="h-8 w-8 text-slate-300" />
            <p className="text-sm font-bold text-slate-400">No expenses recorded yet</p>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">
              Add expenses in the Ledger tab
            </p>
          </div>
        )}

        {/* ── Category breakdown rows (detailed) ──────────────────────────── */}
        {categories.length > 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="px-5 pt-5 pb-2 border-b border-slate-100 dark:border-slate-800">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
                Detailed Breakdown
              </p>
            </div>
            <div className="divide-y divide-slate-50 dark:divide-slate-800/60">
              {categories.map(([cat, amount]) => {
                const cfg = getCategoryConfig(cat);
                const pct = categoryTotal > 0 ? (amount / categoryTotal) * 100 : 0;
                return (
                  <div key={cat} className="px-5 py-3.5">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={cn(
                            "inline-flex items-center justify-center w-7 h-7 rounded-lg text-sm",
                            cfg.color,
                            cfg.textColor
                          )}
                        >
                          {cfg.icon}
                        </span>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 capitalize">
                          {cfg.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={cn("text-[9px] font-black uppercase", cfg.textColor)}>
                          {pct.toFixed(0)}%
                        </span>
                        <span className="text-sm font-black text-slate-900 dark:text-white">
                          ₹{amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-700",
                          cfg.barColor
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Recent Expenses ──────────────────────────────────────────────── */}
        {allExpensesSorted.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                {showAllExpenses ? "All Expenses" : "Recent Expenses"}
              </h2>
              <button
                onClick={() => setShowAllExpenses((prev) => !prev)}
                className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-[#ccff00] bg-[#ccff00]/10 hover:bg-[#ccff00]/20 px-3 py-1.5 rounded-full transition-colors"
              >
                {showAllExpenses ? (
                  <>
                    <X className="h-2.5 w-2.5" />
                    Show Less
                  </>
                ) : (
                  <>
                    <TrendingUp className="h-2.5 w-2.5" />
                    View All ({allExpensesSorted.length})
                  </>
                )}
              </button>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden divide-y divide-slate-50 dark:divide-slate-800/60">
              {displayedExpenses.map((expense) => {
                const cfg = getCategoryConfig(expense.category);
                const dateStr = expense.expense_date
                  ? format(parseISO(expense.expense_date), "MMM d")
                  : format(parseISO(expense.created_at), "MMM d");

                // Per-person amount for this expense (this user's split)
                const userSplit = user
                  ? expense.splits?.find((s) => s.user_id === user.id)?.amount
                  : undefined;
                const displayAmt = userSplit ?? expense.amount / Math.max(memberCount, 1);

                return (
                  <div
                    key={expense.id}
                    className="px-4 py-3 flex items-center gap-3 hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    <span
                      className={cn(
                        "inline-flex items-center justify-center w-8 h-8 rounded-xl shrink-0 text-sm",
                        cfg.color,
                        cfg.textColor
                      )}
                    >
                      {cfg.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                        {expense.description}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[9px] font-black uppercase text-slate-400">
                          {expense.payer_name}
                        </span>
                        <span className="text-slate-200 dark:text-slate-700">•</span>
                        <div className="flex items-center gap-1 text-[9px] font-bold text-slate-400">
                          <CalendarDays className="h-2.5 w-2.5" />
                          {dateStr}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-black text-slate-900 dark:text-white">
                        ₹{expense.amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                      </p>
                      {userSplit !== undefined && (
                        <p className={cn("text-[9px] font-black", cfg.textColor)}>
                          your share ₹{userSplit.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>

      {/* ── FAB: Plan Your Own Budget ──────────────────────────────────────── */}
      <div className="fixed bottom-24 right-5 z-40 md:bottom-8 md:right-8">
        <button
          onClick={() => setPlannerOpen(true)}
          className="group flex items-center gap-2.5 bg-[#ccff00] hover:bg-[#b8f000] text-black font-black uppercase text-[10px] tracking-widest px-5 py-3.5 rounded-2xl shadow-2xl shadow-[#ccff00]/30 hover:shadow-[#ccff00]/50 transition-all duration-200 hover:scale-105 active:scale-95"
        >
          <PenLine className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">Plan Your Own Budget</span>
          <span className="sm:hidden">My Budget</span>
          <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>

      {/* ── Planner Sheet ─────────────────────────────────────────────────── */}
      <Sheet open={plannerOpen} onOpenChange={setPlannerOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-2xl p-0 overflow-hidden flex flex-col bg-slate-50 dark:bg-slate-950 border-none"
        >
          {/* Custom header */}
          <SheetHeader className="sr-only">
            <SheetTitle>Plan Your Own Budget</SheetTitle>
            <SheetDescription>
              Build a personal budget plan for this trip. Your plan is private and only visible to you.
            </SheetDescription>
          </SheetHeader>

          {/* Visible header bar */}
          <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 shrink-0">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
                Private Mode
              </p>
              <h2 className="text-lg font-black text-slate-900 dark:text-white leading-tight">
                Plan Your Own Budget
              </h2>
            </div>
            <button
              onClick={() => setPlannerOpen(false)}
              className="h-9 w-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            <TripBudgetPlanner tripId={tripId} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
