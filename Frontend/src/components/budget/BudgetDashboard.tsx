"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { format, parseISO, eachDayOfInterval, differenceInDays, getDay } from "date-fns";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    Calculator,
    Receipt,
    Wallet,
    TrendingUp,
    TrendingDown,
    Calendar as CalendarIcon,
    Plus,
    ArrowUpRight,
    Search
} from "lucide-react";

// Components
import { ScenarioPlanner } from "@/components/budget";
import { ExpenseFeed } from "@/components/ledger";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { ExpenseForm } from "@/components/ledger";

// Hooks & API
import { useBudget, useTripMembers, useRankedOptions, useExpenses, useAuth, useTrip } from "@/lib/hooks";
import { useAppStore } from "@/lib/store";
import { expenses as expensesApi } from "@/lib/api/endpoints";
import { cn } from "@/lib/utils";
import type { RankedOption, Expense, TripMember } from "@/types";

export type BudgetTab = "overview" | "breakdown";

interface BudgetDashboardProps {
    tripId: number;
    initialTab?: BudgetTab;
}

export function BudgetDashboard({ tripId, initialTab = "overview" }: BudgetDashboardProps) {
    const router = useRouter();
    const { user, logout } = useAuth();
    const { trip: activeTrip } = useTrip(tripId);

    // UI State
    const [activeTab, setActiveTab] = useState<BudgetTab>(initialTab);
    const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Tab Sync
    useEffect(() => {
        setActiveTab(initialTab);
    }, [initialTab]);

    // Data Hooks
    const { budget, isLoading: budgetLoading, mutate: mutateBudget } = useBudget(tripId);
    const { members, isLoading: membersLoading } = useTripMembers(tripId);
    const { rankedOptions, isLoading: optionsLoading } = useRankedOptions(tripId);
    const { expenses, isLoading: expensesLoading, mutate: mutateExpenses } = useExpenses(tripId);

    // Business Logic
    const hasStayExpenses = useMemo(() => expenses.some((e) => e.category === "stay" && e.amount > 0), [expenses]);
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
    const isLongTrip = tripDates.length > 7;
    const startDayPadding = tripDates.length > 0 ? getDay(tripDates[0]) : 0;

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

    const calculateOptionPrice = useCallback((ro: RankedOption) => {
        let price = ro.option.price || 0;
        if (ro.option.is_per_person) {
            price *= Math.max(members.length, 1);
        }
        if (ro.option.is_per_night && ro.option.check_in_date && ro.option.check_out_date) {
            try {
                const nights = Math.max(differenceInDays(parseISO(ro.option.check_out_date), parseISO(ro.option.check_in_date)), 1);
                price *= nights;
            } catch (e) { }
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

    const actualExpenses = budget?.total_expenses ?? 0;
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

    const scenarioTotal = actualExpenses + totalSelectedStays;
    const remainingBudget = Math.max(0, scenarioTotal - actualExpenses);
    const spendingProgress = scenarioTotal > 0 ? (actualExpenses / scenarioTotal) * 100 : 0;

    // --- Ledger Navigation ---
    const goToLedger = () => {
        router.push(`/trip/${tripId}/ledger`);
    };

    const handleLogout = async () => {
        await logout();
        router.push("/login");
    };

    const isLoading = budgetLoading || membersLoading || optionsLoading || expensesLoading;

    const toDate = (d?: string) => {
        if (!d) return null;
        try {
            return parseISO(d);
        } catch {
            return null;
        }
    };

    if (!mounted) return null;

    if (isLoading && !budget) {
        return (
            <div className="flex flex-col items-center justify-center py-40 gap-4">
                <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Balancing the books...</p>
            </div>
        );
    }

    return (
        <div className="bg-background-light dark:bg-background-dark font-sans text-gray-900 dark:text-gray-100 min-h-screen">

            <main className="max-w-7xl mx-auto px-6 py-12">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                    <div>
                        <h1 className="text-4xl md:text-6xl font-extrabold text-black dark:text-white tracking-tighter lowercase serif-title italic">budget tracker</h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-2 font-bold uppercase tracking-widest text-[10px]">
                            {activeTrip?.name || "Trip"} • {members?.length || 0} members
                        </p>
                    </div>
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-3xl h-fit">
                        {[
                            { id: "overview", label: "Overview", icon: "dashboard" },
                            { id: "breakdown", label: "Analysis", icon: "monitoring" }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as BudgetTab)}
                                className={cn(
                                    "flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                                    activeTab === tab.id
                                        ? "bg-white dark:bg-gray-900 text-black dark:text-white shadow-xl"
                                        : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                                )}
                            >
                                <span className="material-symbols-outlined text-sm">{tab.icon}</span>
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {activeTab === "overview" && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                            <div className="bg-primary text-white p-8 rounded-[2.5rem] flex flex-col justify-between h-56 shadow-2xl shadow-primary/10 transition-transform hover:-translate-y-1">
                                <div className="flex items-center gap-2 text-white/80 text-[10px] font-black uppercase tracking-wider">
                                    <span className="material-symbols-outlined text-sm">account_balance_wallet</span>
                                    <span>total budget</span>
                                </div>
                                <div>
                                    <h2 className="text-4xl font-black tracking-tighter">${Math.round(scenarioTotal).toLocaleString()}</h2>
                                    <p className="text-white/60 text-[8px] uppercase font-black mt-2 tracking-widest leading-relaxed">
                                        Scenario Estimate
                                    </p>
                                </div>
                            </div>

                            <div className="bg-accent-lime text-black p-8 rounded-[2.5rem] flex flex-col justify-between h-56 shadow-2xl shadow-accent-lime/10 transition-transform hover:-translate-y-1">
                                <div className="flex items-center gap-2 text-black/60 text-[10px] font-black uppercase tracking-wider">
                                    <span className="material-symbols-outlined text-sm">payments</span>
                                    <span>total spent</span>
                                </div>
                                <div>
                                    <h2 className="text-4xl font-black tracking-tighter">${Math.round(actualExpenses).toLocaleString()}</h2>
                                    <p className="text-black/40 text-[8px] uppercase font-black mt-2 tracking-widest">Logged transactions</p>
                                </div>
                            </div>

                            <div className="bg-white dark:bg-gray-900 text-black dark:text-white p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 flex flex-col justify-between h-56 shadow-sm transition-transform hover:-translate-y-1">
                                <div className="flex items-center gap-2 text-gray-400 text-[10px] font-black uppercase tracking-wider">
                                    <span className="material-symbols-outlined text-sm">savings</span>
                                    <span>remaining</span>
                                </div>
                                <div>
                                    <h2 className="text-4xl font-black tracking-tighter">${Math.round(remainingBudget).toLocaleString()}</h2>
                                    <p className="text-gray-400 text-[8px] uppercase font-black mt-2 tracking-widest">Scenario Left</p>
                                </div>
                            </div>

                            {budget?.who_should_pay_next && (
                                <div className="bg-[#1e144a] text-white p-8 rounded-[2.5rem] flex flex-col justify-between h-56 shadow-2xl shadow-purple-500/10 transition-transform hover:-translate-y-1">
                                    <div className="flex items-center gap-2 text-purple-300 text-[10px] font-black uppercase tracking-wider">
                                        <span className="material-symbols-outlined text-sm material-symbols-filled">magic_button</span>
                                        <span>Next Payer</span>
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black tracking-tight text-white mb-1 line-clamp-1">{budget.who_should_pay_next.user_name}</h2>
                                        <p className="text-purple-300/60 text-[8px] font-black uppercase tracking-widest leading-relaxed">
                                            {budget.who_should_pay_next.suggestion}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Main Grid: Planning (Left) vs Stats (Right) */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                            {/* Left Content: Scenario Planning */}
                            <div className="lg:col-span-8 space-y-10">
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                                    {/* Scenario Selection Sidebar */}
                                    <div className="md:col-span-12 xl:col-span-5 space-y-6">
                                        <div className="flex items-center justify-between px-1">
                                            <h3 className="text-sm font-black text-black dark:text-white uppercase tracking-widest">Scenario Planner</h3>
                                            <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full font-black text-slate-500 uppercase tracking-tighter">Draft</span>
                                        </div>
                                        <div className={cn(
                                            "grid gap-3",
                                            isLongTrip ? "grid-cols-7 xl:grid-cols-7 gap-2" : "grid-cols-1"
                                        )}>
                                            {isLongTrip && (
                                                ['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                                                    <div key={i} className="text-[8px] font-black text-slate-400 text-center uppercase tracking-tighter mb-1">{d}</div>
                                                ))
                                            )}
                                            {isLongTrip && Array.from({ length: startDayPadding }).map((_, i) => (
                                                <div key={`pad-${i}`} />
                                            ))}
                                            {tripDates.map((date) => {
                                                const dateStr = format(date, "yyyy-MM-dd");
                                                const isSelected = selectedDate === dateStr;
                                                const hasSelection = selectedOptionByDate[dateStr] !== null;
                                                const options = optionsByDate[dateStr] || [];

                                                return (
                                                    <button
                                                        key={dateStr}
                                                        onClick={() => setSelectedDate(dateStr)}
                                                        className={cn(
                                                            "transition-all border-2 group relative",
                                                            isLongTrip
                                                                ? "aspect-square rounded-xl flex items-center justify-center p-0"
                                                                : "w-full p-4 rounded-2xl text-left flex items-center justify-between",
                                                            isSelected
                                                                ? "bg-black dark:bg-white text-white dark:text-black border-black dark:border-white shadow-xl"
                                                                : "bg-white dark:bg-gray-900 border-gray-50 dark:border-gray-800 hover:border-primary/30"
                                                        )}
                                                    >
                                                        {isLongTrip ? (
                                                            <div className="flex flex-col items-center">
                                                                <span className="text-sm font-black tracking-tighter">{format(date, "d")}</span>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <div className="flex items-center gap-4">
                                                                    <div className={cn(
                                                                        "w-10 h-10 rounded-xl flex flex-col items-center justify-center font-black",
                                                                        isSelected ? "bg-white/20" : "bg-gray-100 dark:bg-gray-800 text-gray-400"
                                                                    )}>
                                                                        <span className="text-[8px] uppercase tracking-tighter">{format(date, "EEE")}</span>
                                                                        <span className="text-sm">{format(date, "d")}</span>
                                                                    </div>
                                                                    <div>
                                                                        <p className={cn("text-xs font-black uppercase tracking-widest mb-0.5", isSelected ? "text-white/60 dark:text-black/60" : "text-gray-400")}>
                                                                            {format(date, "MMMM")}
                                                                        </p>
                                                                        {hasSelection ? (
                                                                            <p className="text-[10px] font-bold">Stay Selected</p>
                                                                        ) : options.length > 0 ? (
                                                                            <p className="text-[10px] font-bold text-amber-500">Pick Option</p>
                                                                        ) : (
                                                                            <p className="text-[10px] font-bold opacity-30">No Plans</p>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                {isSelected && (
                                                                    <ArrowUpRight className="size-4 opacity-40" />
                                                                )}
                                                            </>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Options Selection Content Area */}
                                    <div className="md:col-span-12 xl:col-span-7">
                                        {selectedDate ? (
                                            <div className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm animate-in slide-in-from-right-4 duration-500 h-full">
                                                <div className="flex items-center justify-between mb-8">
                                                    <div>
                                                        <h4 className="font-black text-xl tracking-tight">Explore Scenario</h4>
                                                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">{format(parseISO(selectedDate), "MMMM d, yyyy")}</p>
                                                    </div>
                                                    <div className="w-12 h-12 bg-primary/5 rounded-2xl flex items-center justify-center text-primary">
                                                        <span className="material-symbols-outlined filled-icon">explore</span>
                                                    </div>
                                                </div>

                                                {optionsByDate[selectedDate]?.length > 0 ? (
                                                    <div className="space-y-4">
                                                        {optionsByDate[selectedDate].map((ro) => {
                                                            const isActive = selectedOptionByDate[selectedDate] === ro.option.id;
                                                            const dailyResult = calculateDailyPrice(ro);
                                                            return (
                                                                <button
                                                                    key={ro.option.id}
                                                                    onClick={() => handleSelectOption(selectedDate, ro.option.id)}
                                                                    className={cn(
                                                                        "w-full p-6 rounded-3xl text-left border-2 transition-all flex items-center justify-between group",
                                                                        isActive
                                                                            ? "border-primary bg-primary/5 shadow-inner"
                                                                            : "border-gray-50 dark:border-gray-800 hover:border-primary/20 hover:bg-gray-50/50"
                                                                    )}
                                                                >
                                                                    <div className="flex-1">
                                                                        <div className="flex items-center gap-3 mb-1">
                                                                            <span className="text-sm font-black truncate">{ro.option.title}</span>
                                                                            {isActive && <span className="bg-primary text-white text-[8px] px-2 py-0.5 rounded-full font-black uppercase">Active</span>}
                                                                        </div>
                                                                        <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">{dailyResult.breakdown}</p>
                                                                    </div>
                                                                    <div className="text-right ml-4">
                                                                        <span className="text-lg font-black text-primary">${Math.round(dailyResult.price).toLocaleString()}</span>
                                                                        <p className="text-[8px] text-gray-400 font-black uppercase tracking-tighter">Per Night</p>
                                                                    </div>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col items-center justify-center h-64 text-center">
                                                        <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800/50 rounded-3xl flex items-center justify-center text-gray-300 mb-4">
                                                            <span className="material-symbols-outlined text-3xl">hotel</span>
                                                        </div>
                                                        <h5 className="font-black text-sm text-gray-400 uppercase tracking-widest">No options found</h5>
                                                        <p className="text-xs text-gray-400 mt-2 max-w-[200px]">Add some stay possibilities in the <Link href={`/trip/${tripId}/explore`} className="text-primary hover:underline">Comparison Hub</Link></p>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="bg-gray-50 dark:bg-gray-800/30 rounded-[2.5rem] border-2 border-dashed border-gray-100 dark:border-gray-800 flex flex-col items-center justify-center h-full min-h-[400px]">
                                                <p className="font-black text-[10px] text-gray-400 uppercase tracking-[0.3em]">Select a date to plan</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-8 bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Budget Breakdown</h4>
                                        <div className="flex gap-4">
                                            <div className="flex items-center gap-1.5">
                                                <div className="size-2 rounded-full bg-primary/20"></div>
                                                <span className="text-[8px] font-black text-gray-400 uppercase">Snapshot</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                        {/* Overall Breakdown */}
                                        <div className="space-y-6">
                                            <p className="text-[8px] font-black text-gray-300 uppercase tracking-[0.2em]">Overall Spending</p>
                                            <div className="space-y-4">
                                                {[
                                                    { name: "Stay", icon: "home", color: "text-purple-400", amount: expenses.filter(e => e.category === "stay").reduce((s, e) => s + e.amount, 0) },
                                                    { name: "Food", icon: "restaurant", color: "text-orange-400", amount: expenses.filter(e => e.category === "food").reduce((s, e) => s + e.amount, 0) },
                                                    { name: "Travel", icon: "flight", color: "text-blue-400", amount: expenses.filter(e => e.category === "transport").reduce((s, e) => s + e.amount, 0) },
                                                    { name: "Other", icon: "more_horiz", color: "text-gray-400", amount: expenses.filter(e => !["stay", "food", "transport"].includes(e.category)).reduce((s, e) => s + e.amount, 0) },
                                                ].sort((a, b) => b.amount - a.amount).map((cat) => (
                                                    <div key={cat.name} className="flex items-center justify-between group">
                                                        <div className="flex items-center gap-3">
                                                            <div className={cn("size-8 rounded-xl flex items-center justify-center bg-gray-50 dark:bg-gray-800/50", cat.color)}>
                                                                <span className="material-symbols-outlined text-sm">{cat.icon}</span>
                                                            </div>
                                                            <span className="text-xs font-bold text-slate-500 uppercase tracking-tighter">{cat.name}</span>
                                                        </div>
                                                        <div className="text-right">
                                                            <span className="text-xs font-black text-gray-900 dark:text-gray-100">${Math.round(cat.amount).toLocaleString()}</span>
                                                            <div className="w-24 h-1 bg-gray-50 dark:bg-gray-800 rounded-full mt-1 overflow-hidden">
                                                                <div className={cn("h-full rounded-full opacity-60 transition-all duration-1000", cat.color.replace("text-", "bg-"))} style={{ width: `${actualExpenses > 0 ? (cat.amount / actualExpenses) * 100 : 0}%` }}></div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Daily Selection Breakdown */}
                                        <div className="space-y-6 border-l border-gray-50 dark:border-gray-800 pl-12">
                                            <p className="text-[8px] font-black text-gray-300 uppercase tracking-[0.2em]">Selected Day: {selectedDate ? format(parseISO(selectedDate), "MMM dd") : "None"}</p>

                                            {selectedDate ? (
                                                <div className="space-y-5">
                                                    {/* Stay (Scenario) */}
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className="size-8 rounded-xl bg-purple-50 dark:bg-purple-900/10 flex items-center justify-center text-purple-400">
                                                                <span className="material-symbols-outlined text-sm">hotel</span>
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="text-[8px] font-black text-gray-400 uppercase">Stay Scenario</span>
                                                                <span className="text-[10px] font-bold text-slate-500">
                                                                    {selectedOptionByDate[selectedDate]
                                                                        ? rankedOptions.find(ro => ro.option.id === selectedOptionByDate[selectedDate])?.option.title
                                                                        : "None Selected"}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <span className="text-xs font-black">
                                                            {selectedOptionByDate[selectedDate]
                                                                ? `$${Math.round(calculateDailyPrice(rankedOptions.find(ro => ro.option.id === selectedOptionByDate[selectedDate])!).price).toLocaleString()}`
                                                                : "$0"}
                                                        </span>
                                                    </div>

                                                    {/* Actual Expenses for this day */}
                                                    <div className="space-y-3 pt-2 border-t border-gray-50 dark:border-gray-800">
                                                        <span className="text-[8px] font-black text-gray-300 uppercase tracking-widest">Logged Today</span>
                                                        {expenses.filter(e => format(toDate(e.expense_date) || new Date(e.created_at), "yyyy-MM-dd") === selectedDate).length > 0 ? (
                                                            expenses
                                                                .filter(e => format(toDate(e.expense_date) || new Date(e.created_at), "yyyy-MM-dd") === selectedDate)
                                                                .slice(0, 3)
                                                                .map(e => (
                                                                    <div key={e.id} className="flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/30 p-2 rounded-xl">
                                                                        <span className="text-[10px] font-bold text-gray-500 truncate max-w-[120px]">{e.description}</span>
                                                                        <span className="text-[10px] font-black">${Math.round(e.amount).toLocaleString()}</span>
                                                                    </div>
                                                                ))
                                                        ) : (
                                                            <p className="text-[10px] text-gray-300 italic">No expenses logged for this day</p>
                                                        )}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-center h-full">
                                                    <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Select a date above</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right Content: Sidebar */}
                            <div className="lg:col-span-4 space-y-8">
                                {/* Explore Scenario Quick Action */}
                                <section className="bg-black text-white p-8 rounded-[2.5rem] shadow-2xl shadow-black/20 h-fit group overflow-hidden relative">
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-2 mb-6">
                                            <span className="material-symbols-outlined text-accent-lime text-xl">explore</span>
                                            <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Decision Hub</span>
                                        </div>
                                        <h3 className="text-2xl font-black tracking-tight mb-4">Are we overspending on stay?</h3>
                                        <p className="text-xs text-white/60 font-medium leading-relaxed mb-8">
                                            Analyze alternate stay scenarios to save up to 15% without compromising location quality.
                                        </p>
                                        <Link
                                            href={`/trip/${tripId}/explore`}
                                            className="inline-flex items-center gap-2 bg-white text-black px-6 py-3 rounded-full font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-transform"
                                        >
                                            Explore Options
                                            <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                        </Link>
                                    </div>
                                    <span className="material-symbols-outlined absolute -right-8 -bottom-8 text-[180px] text-white/5 font-light pointer-events-none group-hover:rotate-12 transition-transform duration-700">query_stats</span>
                                </section>

                                {/* AI Insight Box */}
                                <div className="bg-accent-lime p-8 rounded-[2.5rem] shadow-xl shadow-lime-500/10 group">
                                    <div className="flex items-center gap-2 mb-4">
                                        <span className="material-symbols-outlined text-black text-xl material-symbols-filled group-hover:animate-pulse">lightbulb</span>
                                        <h4 className="font-black text-[10px] uppercase tracking-widest text-black/60">Budget Optimizer</h4>
                                    </div>
                                    <p className="text-sm font-bold text-black leading-tight mb-4">
                                        Optimizer Tip:
                                    </p>
                                    <p className="text-xs font-bold text-black/70 leading-relaxed">
                                        {actualExpenses > 500
                                            ? "Switching to the 'Luxury Villa' scenario on Day 3 would increase the total by 12.4%, but improves trip score by 2.1 points. Consider if the extra cost aligns with your group priorities."
                                            : "You're currently well within budget. Adding a 'Gourmet Dinner' experience on Day 2 would only take 3% of your remaining capacity."}
                                    </p>
                                </div>

                                {/* Quick Ledger Link */}
                                <Link href={`/trip/${tripId}/ledger`} className="block bg-white dark:bg-gray-800/50 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-800 hover:border-primary/30 transition-colors group">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                                                <span className="material-symbols-outlined">receipt_long</span>
                                            </div>
                                            <div>
                                                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Detail View</p>
                                                <p className="text-xs font-black dark:text-gray-200">Go to Transaction Ledger</p>
                                            </div>
                                        </div>
                                        <span className="material-symbols-outlined text-gray-300 group-hover:text-primary transition-colors">chevron_right</span>
                                    </div>
                                </Link>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === "breakdown" && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-12">
                        {/* Full Breakdown View */}
                        <div className="bg-white dark:bg-gray-900 p-12 rounded-[3rem] border border-gray-100 dark:border-gray-800 shadow-sm relative overflow-hidden">
                            {/* Header */}
                            <div className="flex flex-col md:flex-row justify-between items-start mb-16 gap-8">
                                <div>
                                    <h2 className="text-4xl font-black tracking-tighter mb-2">Total Budget Analysis</h2>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Comprehensive breakdown of all expenses & scenarios</p>
                                </div>
                                <div className="text-left md:text-right">
                                    <p className="text-5xl font-black text-primary tracking-tighter">${Math.round(scenarioTotal).toLocaleString()}</p>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2">Combined Projection</p>
                                </div>
                            </div>

                            {/* Main Breakdown Grid */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
                                {/* Left: Category Distribution */}
                                <div className="space-y-10">
                                    <h3 className="text-xs font-black uppercase tracking-widest text-black dark:text-gray-400">Category Distribution</h3>
                                    <div className="space-y-8">
                                        {[
                                            { name: "Stay", icon: "home", color: "text-purple-400", amount: expenses.filter(e => e.category === "stay").reduce((s, e) => s + e.amount, 0) + totalSelectedStays },
                                            { name: "Food", icon: "restaurant", color: "text-orange-400", amount: expenses.filter(e => e.category === "food").reduce((s, e) => s + e.amount, 0) },
                                            { name: "Travel", icon: "flight", color: "text-blue-400", amount: expenses.filter(e => e.category === "transport").reduce((s, e) => s + e.amount, 0) },
                                            { name: "Activities", icon: "local_activity", color: "text-emerald-400", amount: expenses.filter(e => e.category === "activity").reduce((s, e) => s + e.amount, 0) },
                                            { name: "Other", icon: "more_horiz", color: "text-gray-400", amount: expenses.filter(e => !["stay", "food", "transport", "activity"].includes(e.category)).reduce((s, e) => s + e.amount, 0) },
                                        ].sort((a, b) => b.amount - a.amount).map((cat) => (
                                            <div key={cat.name} className="space-y-3">
                                                <div className="flex justify-between items-end">
                                                    <div className="flex items-center gap-3">
                                                        <div className={cn("size-10 rounded-2xl flex items-center justify-center bg-gray-50 dark:bg-gray-800/50", cat.color)}>
                                                            <span className="material-symbols-outlined text-xl">{cat.icon}</span>
                                                        </div>
                                                        <div>
                                                            <span className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tighter">{cat.name}</span>
                                                            <p className="text-[10px] font-bold text-gray-400">{scenarioTotal > 0 ? Math.round((cat.amount / scenarioTotal) * 100) : 0}% of total</p>
                                                        </div>
                                                    </div>
                                                    <span className="text-xl font-black text-gray-900 dark:text-white">${Math.round(cat.amount).toLocaleString()}</span>
                                                </div>
                                                <div className="w-full h-2 bg-gray-50 dark:bg-gray-800 rounded-full overflow-hidden">
                                                    <div
                                                        className={cn("h-full rounded-full transition-all duration-1000", cat.color.replace("text-", "bg-"))}
                                                        style={{ width: `${scenarioTotal > 0 ? (cat.amount / scenarioTotal) * 100 : 0}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Right: Actual vs Projected */}
                                <div className="space-y-10">
                                    <h3 className="text-xs font-black uppercase tracking-widest text-black dark:text-gray-400">Spending Anatomy</h3>
                                    <div className="p-8 bg-gray-50 dark:bg-gray-800/30 rounded-[2.5rem] space-y-8">
                                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                                            <div>
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Reality (Logged)</p>
                                                <p className="text-2xl font-black">${Math.round(actualExpenses).toLocaleString()}</p>
                                            </div>
                                            <div className="text-left md:text-right">
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Buffer (Selected Scenarios)</p>
                                                <p className="text-2xl font-black text-primary">${Math.round(totalSelectedStays).toLocaleString()}</p>
                                            </div>
                                        </div>

                                        {/* Visualization of Reality vs Buffer */}
                                        <div className="relative h-4 w-full bg-primary/20 rounded-full overflow-hidden flex">
                                            <div className="h-full bg-black dark:bg-white transition-all duration-1000" style={{ width: `${scenarioTotal > 0 ? (actualExpenses / scenarioTotal) * 100 : 0}%` }}></div>
                                        </div>

                                        <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                                            <div className="flex justify-between items-center">
                                                <span className="text-[10px] font-black text-gray-400 uppercase">Average Per Person</span>
                                                <span className="text-sm font-black">${Math.round(scenarioTotal / Math.max(members.length, 1)).toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-[10px] font-black text-gray-400 uppercase">Average Per Day</span>
                                                <span className="text-sm font-black">${Math.round(scenarioTotal / Math.max(tripDates.length, 1)).toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-8 bg-black text-white rounded-[2.5rem] relative overflow-hidden group">
                                        <div className="relative z-10">
                                            <h4 className="text-lg font-black tracking-tight mb-2">Decision Logic</h4>
                                            <p className="text-xs text-white/60 font-medium leading-relaxed">
                                                Your budget is currently <strong>{Math.round(spendingProgress)}%</strong> utilized based on your selected stay scenarios.
                                                {spendingProgress > 80 ? " You're approaching your limit—consider cheaper stay options or reducing activity expenditure." : " You have significant room to upgrade your stays or add more premium experiences."}
                                            </p>
                                        </div>
                                        <span className="material-symbols-outlined absolute -right-4 -bottom-4 text-6xl text-white/5 group-hover:rotate-12 transition-transform">insights</span>
                                    </div>
                                </div>
                            </div>

                            {tripDates.length > 0 && (
                                <div className="mt-20 space-y-8 border-t border-gray-100 dark:border-gray-800 pt-16 relative z-10">
                                    <h3 className="text-xs font-black uppercase tracking-widest text-black dark:text-gray-400">Day-by-Day Spending</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                                        {tripDates.map((date) => {
                                            const dStr = format(date, "yyyy-MM-dd");
                                            const dayExpenses = expenses.filter(e => format(toDate(e.expense_date) || new Date(e.created_at), "yyyy-MM-dd") === dStr);
                                            const dayTotal = dayExpenses.reduce((sum, e) => sum + e.amount, 0);

                                            const selectedOptionId = selectedOptionByDate[dStr];
                                            const selectedOption = selectedOptionId ? rankedOptions.find(ro => ro.option.id === selectedOptionId) : null;
                                            const optionPrice = selectedOption ? calculateDailyPrice(selectedOption).price : 0;

                                            const total = dayTotal + optionPrice;

                                            return (
                                                <div key={dStr} className="bg-gray-50 dark:bg-gray-800/30 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-800 hover:border-primary/20 transition-all hover:shadow-xl hover:-translate-y-1 group">
                                                    <div className="flex flex-col gap-1 mb-6">
                                                        <div className="flex items-center justify-between">
                                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{format(date, "MMM dd")}</p>
                                                            <p className="text-[10px] font-bold text-gray-400 uppercase">{format(date, "EEEE")}</p>
                                                        </div>
                                                        <span className="text-3xl font-black tracking-tighter text-gray-900 dark:text-gray-100 mt-2">
                                                            ${Math.round(total).toLocaleString()}
                                                        </span>
                                                    </div>

                                                    <div className="space-y-2">
                                                        {optionPrice > 0 && (
                                                            <div className="flex justify-between items-center bg-white dark:bg-gray-900 px-3 py-2.5 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="material-symbols-outlined text-[12px] text-purple-400">hotel</span>
                                                                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Scenario</span>
                                                                </div>
                                                                <span className="text-[10px] font-black">${Math.round(optionPrice).toLocaleString()}</span>
                                                            </div>
                                                        )}
                                                        {dayTotal > 0 && (
                                                            <div className="flex justify-between items-center bg-white dark:bg-gray-900 px-3 py-2.5 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="material-symbols-outlined text-[12px] text-green-500">receipt_long</span>
                                                                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Logged</span>
                                                                </div>
                                                                <span className="text-[10px] font-black">${Math.round(dayTotal).toLocaleString()}</span>
                                                            </div>
                                                        )}
                                                        {total === 0 && (
                                                            <div className="flex items-center justify-center gap-2 py-3 bg-white/50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-800/50">
                                                                <span className="material-symbols-outlined text-xs text-gray-300">money_off</span>
                                                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">No spending</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            <div className="absolute right-0 top-0 opacity-[0.02] pointer-events-none">
                                <span className="material-symbols-outlined text-[400px]">pie_chart</span>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Footer */}
            <footer className="max-w-7xl mx-auto px-6 py-20 border-t border-gray-100 dark:border-gray-800 text-center">
                <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">
                    © {new Date().getFullYear()} absolutrip — design system alpha
                </p>
            </footer>
        </div>
    );
}
