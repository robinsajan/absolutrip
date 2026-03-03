"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { format, parseISO, eachDayOfInterval, differenceInDays } from "date-fns";
import { toast } from "sonner";
import {
    Calculator,
    Receipt,
    Wallet,
    CheckCircle2,
    TrendingUp,
    TrendingDown,
    Calendar as CalendarIcon,
    List
} from "lucide-react";

// Components
import { BudgetHeader, ExpenseBreakdown, ScenarioPlanner } from "@/components/budget";
import { ExpenseForm, ExpenseFeed } from "@/components/ledger";
import { DebtSummary, SettlementCard } from "@/components/settle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Hooks & API
import { useBudget, useTripMembers, useRankedOptions, useExpenses, useSettlement, useAuth } from "@/lib/hooks";
import { useAppStore } from "@/lib/store";
import { expenses as expensesApi } from "@/lib/api/endpoints";
import { cn } from "@/lib/utils";
import type { RankedOption, Expense } from "@/types";

export type BudgetTab = "overview" | "ledger" | "settle";

interface BudgetDashboardProps {
    tripId: number;
    initialTab?: BudgetTab;
}

export function BudgetDashboard({ tripId, initialTab = "overview" }: BudgetDashboardProps) {
    const { user } = useAuth();
    const { activeTrip } = useAppStore();

    // Tab State
    const [activeTab, setActiveTab] = useState<BudgetTab>(initialTab);

    // Sync tab if initialTab changes (e.g. navigation between routes)
    useEffect(() => {
        setActiveTab(initialTab);
    }, [initialTab]);

    // Data Hooks
    const { budget, isLoading: budgetLoading, mutate: mutateBudget } = useBudget(tripId);
    const { members, isLoading: membersLoading } = useTripMembers(tripId);
    const { rankedOptions, isLoading: optionsLoading } = useRankedOptions(tripId);
    const { expenses, isLoading: expensesLoading, mutate: mutateExpenses } = useExpenses(tripId);
    const { balances, settlements, explanation, isLoading: settleLoading, mutate: mutateSettle } = useSettlement(tripId);

    // If a stay has already been logged as an expense, don't add stay option costs again in the scenario planner.
    const hasStayExpenses = useMemo(() => expenses.some((e) => e.category === "stay" && e.amount > 0), [expenses]);

    // --- Overview Logic ---
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [selectedOptionByDate, setSelectedOptionByDate] = useState<Record<string, number | null>>({});

    const tripDates = useMemo(() => {
        if (!activeTrip?.start_date || !activeTrip?.end_date) return [];
        try {
            return eachDayOfInterval({
                start: parseISO(activeTrip.start_date),
                end: parseISO(activeTrip.end_date),
            });
        } catch {
            return [];
        }
    }, [activeTrip?.start_date, activeTrip?.end_date]);

    useEffect(() => {
        if (tripDates.length > 0 && selectedDate === null) {
            setSelectedDate(format(tripDates[0], "yyyy-MM-dd"));
        }
    }, [tripDates, selectedDate]);

    const optionsByDate = useMemo(() => {
        const grouped: Record<string, RankedOption[]> = {};
        rankedOptions.forEach((ro) => {
            const checkIn = ro.option.check_in_date;
            const checkOut = ro.option.check_out_date;

            if (checkIn) {
                if (checkOut) {
                    try {
                        const interval = eachDayOfInterval({
                            start: parseISO(checkIn),
                            end: parseISO(checkOut)
                        });
                        interval.forEach(day => {
                            const dStr = format(day, "yyyy-MM-dd");
                            if (!grouped[dStr]) grouped[dStr] = [];
                            grouped[dStr].push(ro);
                        });
                    } catch (e) {
                        if (!grouped[checkIn]) grouped[checkIn] = [];
                        grouped[checkIn].push(ro);
                    }
                } else {
                    if (!grouped[checkIn]) grouped[checkIn] = [];
                    grouped[checkIn].push(ro);
                }
            }
        });
        return grouped;
    }, [rankedOptions]);

    useEffect(() => {
        if (Object.keys(optionsByDate).length === 0) return;

        setSelectedOptionByDate((prev) => {
            const newSelections = { ...prev };
            let hasChanges = false;

            Object.entries(optionsByDate).forEach(([date, options]) => {
                const finalized = options.find((ro) => ro.option.is_finalized);
                // Only auto-select if not already set by user/previous load
                if (finalized && prev[date] === undefined) {
                    newSelections[date] = finalized.option.id;
                    hasChanges = true;
                }
            });

            return hasChanges ? newSelections : prev;
        });
    }, [optionsByDate]);

    const handleSelectOption = useCallback((date: string, optionId: number) => {
        setSelectedOptionByDate((prev) => ({
            ...prev,
            [date]: prev[date] === optionId ? null : optionId,
        }));
    }, []);

    const expensesByDate = useMemo(() => {
        const grouped: Record<string, { expenses: Expense[]; total: number }> = {};
        expenses.forEach((expense) => {
            if (expense.expense_date) {
                if (!grouped[expense.expense_date]) {
                    grouped[expense.expense_date] = { expenses: [], total: 0 };
                }
                grouped[expense.expense_date].expenses.push(expense);
                grouped[expense.expense_date].total += expense.amount;
            }
        });
        return grouped;
    }, [expenses]);

    const calculateOptionPrice = useCallback((ro: RankedOption) => {
        let price = ro.option.price || 0;
        if (ro.option.is_per_person) {
            price *= Math.max(members.length, 1);
        }
        if (ro.option.is_per_night && ro.option.check_in_date && ro.option.check_out_date) {
            try {
                const nights = Math.max(differenceInDays(parseISO(ro.option.check_out_date), parseISO(ro.option.check_in_date)), 1);
                price *= nights;
            } catch (e) {
                // fallback to 1 night
            }
        }
        return price;
    }, [members.length]);

    const calculateDailyPrice = useCallback((ro: RankedOption) => {
        const basePrice = ro.option.price || 0;
        const memberCount = Math.max(members.length, 1);

        if (ro.option.is_per_night) {
            const dailyPrice = basePrice * (ro.option.is_per_person ? memberCount : 1);
            let breakdown = `$${basePrice.toLocaleString()}/night`;
            if (ro.option.is_per_person) breakdown = `$${basePrice.toLocaleString()} × ${memberCount} members/night`;
            return { price: dailyPrice, breakdown };
        } else {
            // Total price divided by nights
            const totalPrice = basePrice * (ro.option.is_per_person ? memberCount : 1);
            if (ro.option.check_in_date && ro.option.check_out_date) {
                try {
                    const nights = Math.max(differenceInDays(parseISO(ro.option.check_out_date), parseISO(ro.option.check_in_date)), 1);
                    const dailyPrice = totalPrice / nights;
                    let breakdown = `$${totalPrice.toLocaleString()} total ÷ ${nights} nights`;
                    if (ro.option.is_per_person) breakdown = `($${basePrice.toLocaleString()} × ${memberCount}) ÷ ${nights} nights`;
                    return { price: dailyPrice, breakdown };
                } catch {
                    return { price: totalPrice, breakdown: "Total stay" };
                }
            }
            return { price: totalPrice, breakdown: "Total stay" };
        }
    }, [members.length]);

    const baseExpenses = budget?.total_expenses ?? 0;
    const totalSelectedStays = useMemo(() => {
        let total = 0;
        const uniqueOptions = new Set<number>();
        Object.values(selectedOptionByDate).forEach(id => {
            if (id !== null) uniqueOptions.add(id);
        });

        uniqueOptions.forEach(id => {
            const option = rankedOptions.find(ro => ro.option.id === id);
            if (!option) return;
            if (option.option.category === "stay" && hasStayExpenses) return;
            total += calculateOptionPrice(option);
        });

        return total;
    }, [selectedOptionByDate, rankedOptions, calculateOptionPrice, hasStayExpenses]);

    const totalFinalizedStays = useMemo(() => {
        return rankedOptions
            .filter((ro) => ro.option.is_finalized)
            .filter((ro) => !(ro.option.category === "stay" && hasStayExpenses))
            .reduce((sum, ro) => sum + calculateOptionPrice(ro), 0);
    }, [rankedOptions, calculateOptionPrice, hasStayExpenses]);

    const scenarioTotal = baseExpenses + totalSelectedStays;
    const scenarioPerPerson = scenarioTotal / Math.max(members.length, 1);
    const budgetDifference = totalSelectedStays - totalFinalizedStays;

    const selectedDaySummary = useMemo(() => {
        if (!selectedDate) return null;

        const loggedExpenses = expensesByDate[selectedDate]?.total || 0;
        const selectedOptionId = selectedOptionByDate[selectedDate];
        const memberCount = Math.max(members.length, 1);
        let stayCost = 0;
        let breakdown = "";

        if (selectedOptionId) {
            const option = rankedOptions.find(ro => ro.option.id === selectedOptionId);
            if (option) {
                if (!(option.option.category === "stay" && hasStayExpenses)) {
                    const result = calculateDailyPrice(option);
                    stayCost = result.price;
                    breakdown = result.breakdown;
                }
            }
        }

        const total = loggedExpenses + stayCost;

        return {
            logged: loggedExpenses,
            loggedPerPerson: loggedExpenses / memberCount,
            stay: stayCost,
            stayPerPerson: stayCost / memberCount,
            breakdown: breakdown,
            total: total,
            totalPerPerson: total / memberCount
        };
    }, [selectedDate, expensesByDate, selectedOptionByDate, rankedOptions, calculateDailyPrice, members.length]);

    // --- Ledger Logic ---
    const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

    const handleAddExpense = async (data: any) => {
        await expensesApi.create(tripId, data);
        mutateExpenses();
        mutateBudget();
        toast.success("Expense added");
    };

    const handleUpdateExpense = async (expenseId: number, data: any) => {
        await expensesApi.update(tripId, expenseId, data);
        mutateExpenses();
        mutateBudget();
        setEditingExpense(null);
        toast.success("Expense updated");
    };

    const handleDeleteExpense = async (expenseId: number) => {
        try {
            await expensesApi.delete(tripId, expenseId);
            mutateExpenses();
            mutateBudget();
            toast.success("Expense deleted");
        } catch (err: any) {
            toast.error(err.response?.data?.error || "Failed to delete expense");
        }
    };

    // --- Settlement Logic ---
    const currentUserBalance = balances.find((b) => b.user_id === user?.id);
    const paymentsToMake = settlements.filter((s) => s.from_user_id === user?.id);
    const paymentsToReceive = settlements.filter((s) => s.to_user_id === user?.id);

    // --- Helpers ---
    const isLoading = budgetLoading || membersLoading || optionsLoading || expensesLoading || (activeTab === "settle" && settleLoading);

    if (isLoading && !budget) {
        return (
            <div className="flex justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
            </div>
        );
    }

    return (
        <div className="p-4 lg:p-8 max-w-4xl mx-auto space-y-8">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-serif font-bold text-slate-900 dark:text-white">Trip budget</h1>
                    <p className="text-slate-500 font-medium">Manage expenses and plan scenarios</p>
                </div>

                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-full md:w-fit overflow-x-auto scrollbar-hide">
                    <button
                        onClick={() => setActiveTab("overview")}
                        className={cn(
                            "flex-1 md:flex-none px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-bold transition-all flex items-center justify-center gap-1.5 md:gap-2 whitespace-nowrap",
                            activeTab === "overview" ? "bg-white dark:bg-slate-700 text-primary shadow-sm" : "text-slate-500 hover:text-slate-700"
                        )}
                    >
                        <Calculator className="size-3.5 md:size-4" />
                        Overview
                    </button>
                    <button
                        onClick={() => setActiveTab("ledger")}
                        className={cn(
                            "flex-1 md:flex-none px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-bold transition-all flex items-center justify-center gap-1.5 md:gap-2 whitespace-nowrap",
                            activeTab === "ledger" ? "bg-white dark:bg-slate-700 text-primary shadow-sm" : "text-slate-500 hover:text-slate-700"
                        )}
                    >
                        <Receipt className="size-3.5 md:size-4" />
                        Ledger
                    </button>
                    <button
                        onClick={() => setActiveTab("settle")}
                        className={cn(
                            "flex-1 md:flex-none px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-bold transition-all flex items-center justify-center gap-1.5 md:gap-2 whitespace-nowrap",
                            activeTab === "settle" ? "bg-white dark:bg-slate-700 text-primary shadow-sm" : "text-slate-500 hover:text-slate-700"
                        )}
                    >
                        <Wallet className="size-3.5 md:size-4" />
                        Settle
                    </button>
                </div>
            </div>

            {activeTab === "overview" && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="lg:col-span-2 space-y-8">
                        <Card className="border-none shadow-xl shadow-primary/5 overflow-hidden">
                            <CardContent className="p-0">
                                <BudgetHeader
                                    totalExpenses={scenarioTotal}
                                    perPersonAverage={scenarioPerPerson}
                                    memberCount={budget?.member_count ?? members.length}
                                    expenseCount={budget?.expense_count ?? 0}
                                    personalBalance={currentUserBalance?.balance}
                                    whoShouldPayNext={budget?.who_should_pay_next}
                                />
                            </CardContent>
                        </Card>

                        <div className="space-y-4">
                            <h3 className="font-bold text-lg flex items-center gap-2">
                                <CalendarIcon className="size-5 text-primary" />
                                Scenario Planner
                            </h3>

                            <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
                                {tripDates.map((date) => {
                                    const dateStr = format(date, "yyyy-MM-dd");
                                    const isSelected = selectedDate === dateStr;
                                    const hasSelection = selectedOptionByDate[dateStr] !== null;
                                    const hasOptions = (optionsByDate[dateStr]?.length || 0) > 0;

                                    return (
                                        <button
                                            key={dateStr}
                                            onClick={() => setSelectedDate(dateStr)}
                                            className={cn(
                                                "flex flex-col items-center min-w-[90px] p-3 rounded-2xl transition-all border-2",
                                                isSelected
                                                    ? "bg-primary border-primary text-white shadow-lg shadow-primary/20"
                                                    : hasSelection
                                                        ? "bg-green-50 border-green-200 text-green-700 dark:bg-green-900/10 dark:border-green-800"
                                                        : "bg-white border-slate-100 text-slate-600 hover:border-primary/30 dark:bg-slate-900 dark:border-slate-800"
                                            )}
                                        >
                                            <span className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-1">
                                                {format(date, "EEE")}
                                            </span>
                                            <span className="text-sm font-bold">{format(date, "MMM d")}</span>
                                            {hasSelection && !isSelected && <div className="size-1.5 rounded-full bg-green-500 mt-2" />}
                                            {!hasSelection && hasOptions && !isSelected && <div className="size-1.5 rounded-full bg-amber-400 mt-2" />}
                                        </button>
                                    );
                                })}
                            </div>

                            {selectedDate && (
                                <div className="space-y-6 animate-in fade-in duration-300">
                                    {/* Daily Summary Card */}
                                    {selectedDaySummary && (
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-4 p-6 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:shadow-md">
                                            <div className="space-y-1.5">
                                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Logged / Person</p>
                                                <p className="text-2xl sm:text-xl font-bold text-slate-900 dark:text-white">${selectedDaySummary.loggedPerPerson.toFixed(2)}</p>
                                                <p className="text-[10px] text-slate-400">Group: ${selectedDaySummary.logged.toFixed(2)}</p>
                                            </div>
                                            <div className="space-y-1.5 border-y sm:border-y-0 sm:border-x border-slate-100 dark:border-slate-800 py-4 sm:py-0 sm:px-4">
                                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Stay / Person</p>
                                                <p className="text-2xl sm:text-xl font-bold text-primary">${selectedDaySummary.stayPerPerson.toFixed(2)}</p>
                                                <div className="space-y-0.5">
                                                    <p className="text-[10px] text-slate-400">Group: ${selectedDaySummary.stay.toFixed(2)}</p>
                                                    {selectedDaySummary.breakdown && (
                                                        <p className="text-[10px] text-primary/70 italic leading-tight">{selectedDaySummary.breakdown}</p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="space-y-1.5 sm:text-right">
                                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Day Total / Person</p>
                                                <p className="text-2xl sm:text-xl font-bold text-slate-900 dark:text-white">${selectedDaySummary.totalPerPerson.toFixed(2)}</p>
                                                <p className="text-[10px] text-slate-400">Group: ${selectedDaySummary.total.toFixed(2)}</p>
                                            </div>
                                        </div>
                                    )}

                                    {optionsByDate[selectedDate]?.length > 0 ? (
                                        <ScenarioPlanner
                                            options={optionsByDate[selectedDate]}
                                            memberCount={members.length}
                                            currentExpenses={expensesByDate[selectedDate]?.total || 0}
                                            onScenarioChange={() => { }}
                                            title={format(parseISO(selectedDate), "MMMM d, yyyy")}
                                            description="Select an option to see how it affects your total budget"
                                            selectedOptionId={selectedOptionByDate[selectedDate] ?? null}
                                            onSelectOption={(id) => handleSelectOption(selectedDate, id)}
                                        />
                                    ) : (
                                        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-12 flex flex-col items-center text-center border-2 border-dashed border-slate-200 dark:border-slate-700">
                                            <div className="size-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400 mb-4">
                                                <CalendarIcon className="size-6" />
                                            </div>
                                            <h4 className="font-bold text-slate-900 dark:text-white mb-1">No options for this day</h4>
                                            <p className="text-sm text-slate-500 max-w-xs">Add stays or activities with price info in the Explore tab to see them here.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-8">
                        <Card className="border-none shadow-xl shadow-primary/5">
                            <CardHeader>
                                <CardTitle className="text-lg font-serif">Comparison</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                                    <span className="text-xs text-slate-500">Admin Picks / Person</span>
                                    <span className="font-bold">${(totalFinalizedStays / Math.max(members.length, 1)).toFixed(2)}</span>
                                </div>
                                <div className="flex items-center justify-between p-3 rounded-xl bg-primary/5">
                                    <span className="text-xs text-primary font-bold">Your Scenario / Person</span>
                                    <span className="font-bold text-primary">${(totalSelectedStays / Math.max(members.length, 1)).toFixed(2)}</span>
                                </div>

                                {budgetDifference !== 0 && (
                                    <div className={cn(
                                        "p-4 rounded-xl flex items-center gap-3",
                                        budgetDifference > 0 ? "bg-amber-50 text-amber-700 dark:bg-amber-900/10" : "bg-green-50 text-green-700 dark:bg-green-900/10"
                                    )}>
                                        {budgetDifference > 0 ? <TrendingUp className="size-5 shrink-0" /> : <TrendingDown className="size-5 shrink-0" />}
                                        <p className="text-xs font-bold leading-tight uppercase tracking-wide">
                                            {budgetDifference > 0 ? "You're spending " : "You're saving "}
                                            ${Math.abs(budgetDifference).toFixed(2)}
                                            {budgetDifference > 0 ? " more " : " less "} than selected options.
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <ExpenseBreakdown
                            byCategory={budget?.by_category ?? {}}
                            byPayer={budget?.by_payer ?? {}}
                            total={budget?.total_expenses ?? 0}
                        />
                    </div>
                </div>
            )}

            {activeTab === "ledger" && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center justify-between">
                        <h3 className="font-bold text-xl">Expense History</h3>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2">
                            <ExpenseFeed
                                expenses={expenses}
                                currentUserId={user?.id}
                                onDelete={handleDeleteExpense}
                                onEdit={setEditingExpense}
                                memberCount={members.length}
                            />
                        </div>

                        <div className="relative">
                            <div className="sticky top-24">
                                <Card className="border-none shadow-xl shadow-primary/5">
                                    <CardHeader>
                                        <CardTitle className="text-lg">Add Expense</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <ExpenseForm
                                            tripId={tripId}
                                            members={members}
                                            currentUserId={user?.id}
                                            onSubmit={handleAddExpense}
                                            onUpdate={handleUpdateExpense}
                                            editExpense={editingExpense}
                                            onCancelEdit={() => setEditingExpense(null)}
                                            tripStartDate={activeTrip?.start_date}
                                            tripEndDate={activeTrip?.end_date}
                                        />
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === "settle" && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <DebtSummary
                        balance={currentUserBalance}
                        userName={user?.name}
                        explanation={explanation}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <section className="space-y-4">
                            <div className="flex items-center gap-2 px-1">
                                <h3 className="font-bold text-lg text-red-500">Payments to Make</h3>
                                <Badge variant="outline" className="text-red-500 border-red-200">{paymentsToMake.length}</Badge>
                            </div>
                            {paymentsToMake.length > 0 ? (
                                <div className="space-y-3">
                                    {paymentsToMake.map((s, i) => (
                                        <SettlementCard
                                            key={i}
                                            settlement={s}
                                            type="pay"
                                            tripId={tripId}
                                            onSettled={() => {
                                                mutateBudget();
                                                mutateExpenses();
                                                mutateSettle();
                                            }}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed text-slate-400">
                                    No pending payments
                                </div>
                            )}
                        </section>

                        <section className="space-y-4">
                            <div className="flex items-center gap-2 px-1">
                                <h3 className="font-bold text-lg text-green-600">Payments to Receive</h3>
                                <Badge variant="outline" className="text-green-500 border-green-200">{paymentsToReceive.length}</Badge>
                            </div>
                            {paymentsToReceive.length > 0 ? (
                                <div className="space-y-3">
                                    {paymentsToReceive.map((s, i) => (
                                        <SettlementCard
                                            key={i}
                                            settlement={s}
                                            type="receive"
                                            tripId={tripId}
                                            onSettled={() => {
                                                mutateBudget();
                                                mutateExpenses();
                                                mutateSettle();
                                            }}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed text-slate-400">
                                    Nothing to receive yet
                                </div>
                            )}
                        </section>
                    </div>

                    <Card className="border-none shadow-xl shadow-primary/5">
                        <CardHeader>
                            <CardTitle className="text-lg">All Balances</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-3">
                                {balances.map((balance) => (
                                    <div key={balance.user_id} className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 group hover:bg-white dark:hover:bg-slate-800 transition-all border border-transparent hover:border-primary/20">
                                        <div className="flex items-center gap-3">
                                            <div className="size-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">
                                                {balance.user_name.charAt(0).toUpperCase()}
                                            </div>
                                            <span className={cn("font-bold", balance.user_id === user?.id && "text-primary")}>
                                                {balance.user_name}
                                                {balance.user_id === user?.id && " (You)"}
                                            </span>
                                        </div>
                                        <span className={cn(
                                            "font-mono font-bold text-lg",
                                            balance.status === "owed" ? "text-green-600" : balance.status === "owes" ? "text-red-500" : "text-slate-400"
                                        )}>
                                            {balance.status === "owed" ? "+" : balance.status === "owes" ? "-" : ""}${Math.abs(balance.balance).toFixed(2)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
