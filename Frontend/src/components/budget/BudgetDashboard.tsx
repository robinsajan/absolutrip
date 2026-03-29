"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import {
  differenceInDays,
  parseISO,
  eachDayOfInterval,
  format,
  isSameDay,
  isWithinInterval,
} from "date-fns";
import { toast } from "sonner";

import { BudgetHeader, ScenarioPlanner, ExpenseBreakdown } from "@/components/budget";
import { useBudget, useRankedOptions, useSettlement, useAuth, useTrip } from "@/lib/hooks";
import { RankedOption } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { PlusCircle, TrendingUp, TrendingDown, Users, Info, ChevronDown } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export type BudgetTab = "overview" | "breakdown";

interface BudgetDashboardProps {
  tripId: string;
  /**
   * Kept for compatibility with the route, but the
   * new design is a single overview page.
   */
  initialTab?: BudgetTab;
}

export function BudgetDashboard({ tripId }: BudgetDashboardProps) {
  const { user } = useAuth();
  const { budget, isLoading: budgetLoading } = useBudget(tripId);
  const { rankedOptions, isLoading: optionsLoading } = useRankedOptions(tripId);
  const { balances, isLoading: settlementLoading } = useSettlement(tripId);
  const { trip } = useTrip(tripId);

  const memberCount = budget?.member_count ?? 1;
  const baseTotal = (budget?.total_expenses ?? 0) / memberCount;

  const personalBalance = useMemo(() => {
    if (!user) return undefined;
    const entry = balances.find((b) => b.user_id === user.id);
    return entry?.balance ?? 0;
  }, [balances, user]);

  const stayOptions = useMemo(
    () => rankedOptions.filter((ro) => (ro.option.category || "stay") === "stay"),
    [rankedOptions]
  );

  const activityOptions = useMemo(
    () => rankedOptions.filter((ro) => ro.option.category === "activity"),
    [rankedOptions]
  );

  const calculateOptionPrice = useCallback(
    (ro: RankedOption) => {
      const { option } = ro;
      const count = Math.max(memberCount, 1);

      // Display the pre-calculated pricing from DB as-is (Per Person Per Day)
      if (option.price_per_day_pp !== undefined && option.price_per_day_pp !== null) {
        let nights = 1;
        if (option.check_in_date && option.check_out_date) {
          nights = Math.max(differenceInDays(parseISO(option.check_out_date), parseISO(option.check_in_date)), 1);
        }
        return option.price_per_day_pp * nights;
      }

      // Fallback to strict calculation (Per Person)
      let price = (option.price || 0) / count;

      if (option.check_in_date && option.check_out_date) {
        try {
          const nights = Math.max(
            differenceInDays(parseISO(option.check_out_date), parseISO(option.check_in_date)),
            1
          );
          price *= nights;
        } catch {
          // Ignore parsing issues and treat as a single night
        }
      }

      return price;
    },
    [memberCount]
  );

  const adminPickTotal = useMemo(() => {
    const adminOptions = stayOptions.filter((ro) => ro.option.is_finalized);
    if (adminOptions.length === 0) return 0;
    return adminOptions.reduce((sum, ro) => sum + calculateOptionPrice(ro), 0);
  }, [stayOptions, calculateOptionPrice]);

  const adminPickActivityTotal = useMemo(() => {
    const adminOptions = activityOptions.filter((ro) => ro.option.is_finalized);
    if (adminOptions.length === 0) return 0;
    return adminOptions.reduce((sum, ro) => sum + calculateOptionPrice(ro), 0);
  }, [activityOptions, calculateOptionPrice]);

  const adminPickPerPerson = adminPickTotal;
  const adminPickActivityPerPerson = adminPickActivityTotal;
  const combinedAdminPickPerPerson = adminPickPerPerson + adminPickActivityPerPerson;

  const [selectedOptionIds, setSelectedOptionIds] = useState<number[]>([]);
  const [selectedActivityOptionIds, setSelectedActivityOptionIds] = useState<number[]>([]);

  const [hasInitializedDefault, setHasInitializedDefault] = useState(false);

  useEffect(() => {
    if (!hasInitializedDefault && !optionsLoading) {
      const finalizedStays = stayOptions
        .filter((ro) => ro.option.is_finalized)
        .map((ro) => ro.option.id);
      setSelectedOptionIds(finalizedStays);

      const finalizedActivities = activityOptions
        .filter((ro) => ro.option.is_finalized)
        .map((ro) => ro.option.id);
      setSelectedActivityOptionIds(finalizedActivities);

      setHasInitializedDefault(true);
    }
  }, [optionsLoading, stayOptions, activityOptions, hasInitializedDefault]);

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isSticky, setIsSticky] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsSticky(window.scrollY > 300);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const tripDates = useMemo(() => {
    if (!trip?.start_date || !trip?.end_date) return [];
    try {
      return eachDayOfInterval({
        start: parseISO(trip.start_date),
        end: parseISO(trip.end_date),
      });
    } catch {
      return [];
    }
  }, [trip?.start_date, trip?.end_date]);

  const datedOptions = useMemo(
    () =>
      stayOptions.filter(
        (ro) => ro.option.check_in_date && ro.option.check_out_date
      ),
    [stayOptions]
  );

  const datedActivityOptions = useMemo(
    () =>
      activityOptions.filter(
        (ro) => ro.option.check_in_date
      ),
    [activityOptions]
  );

  const filteredOptions = useMemo(() => {
    if (!selectedDate) return stayOptions;
    return datedOptions.filter(ro => {
      const start = parseISO(ro.option.check_in_date!);
      const end = parseISO(ro.option.check_out_date!);
      const isDateMatch = selectedDate >= start && selectedDate < end;
      return isDateMatch && selectedOptionIds.includes(ro.option.id);
    });
  }, [datedOptions, stayOptions, selectedDate, selectedOptionIds]);

  const filteredActivityOptions = useMemo(() => {
    if (!selectedDate) return activityOptions;
    return datedActivityOptions.filter((ro) => {
      if (!ro.option.check_in_date) return false;
      const activityDate = parseISO(ro.option.check_in_date);

      let isDateMatch = false;
      if (ro.option.check_out_date) {
        const end = parseISO(ro.option.check_out_date);
        isDateMatch = selectedDate >= activityDate && selectedDate < end;
      } else {
        isDateMatch = isSameDay(selectedDate, activityDate);
      }
      return isDateMatch && selectedActivityOptionIds.includes(ro.option.id);
    });
  }, [datedActivityOptions, activityOptions, selectedDate, selectedActivityOptionIds]);

  const stayScenarioTotal = useMemo(() => {
    return selectedOptionIds.reduce((sum, id) => {
      const ro = stayOptions.find(o => o.option.id === id);
      return sum + (ro ? calculateOptionPrice(ro) : 0);
    }, 0);
  }, [selectedOptionIds, stayOptions, calculateOptionPrice]);

  const activityScenarioTotal = useMemo(() => {
    return selectedActivityOptionIds.reduce((sum, id) => {
      const ro = activityOptions.find(o => o.option.id === id);
      return sum + (ro ? calculateOptionPrice(ro) : 0);
    }, 0);
  }, [selectedActivityOptionIds, activityOptions, calculateOptionPrice]);

  const handleSelectOption = (id: number) => {
    const optionToSelect = stayOptions.find(ro => ro.option.id === id);
    if (!optionToSelect) return;

    if (selectedOptionIds.includes(id)) {
      setSelectedOptionIds(prev => prev.filter(i => i !== id));
      return;
    }

    // Conflict Check
    const newStart = parseISO(optionToSelect.option.check_in_date!);
    const newEnd = parseISO(optionToSelect.option.check_out_date!);

    const conflict = selectedOptionIds.some(existingId => {
      const existing = stayOptions.find(ro => ro.option.id === existingId);
      if (!existing) return false;
      const exStart = parseISO(existing.option.check_in_date!);
      const exEnd = parseISO(existing.option.check_out_date!);
      return newStart < exEnd && exStart < newEnd;
    });

    if (conflict) {
      toast.error("Date Conflict! You already have a stay selected for these dates. Please resolve the conflict manually.");
      return;
    }

    setSelectedOptionIds(prev => [...prev, id]);
  };

  const handleSelectActivityOption = (id: number) => {
    const op = activityOptions.find(ro => ro.option.id === id);
    if (!op) return;

    if (selectedActivityOptionIds.includes(id)) {
      setSelectedActivityOptionIds(prev => prev.filter(i => i !== id));
      return;
    }

    const newStart = parseISO(op.option.check_in_date!);
    const newEnd = op.option.check_out_date ? parseISO(op.option.check_out_date) : null;

    const conflict = selectedActivityOptionIds.some(exId => {
      const existing = activityOptions.find(ro => ro.option.id === exId);
      if (!existing) return false;
      const exStart = parseISO(existing.option.check_in_date!);
      const exEnd = existing.option.check_out_date ? parseISO(existing.option.check_out_date) : null;

      if (newEnd && exEnd) {
        return newStart < exEnd && exStart < newEnd;
      } else if (!newEnd && !exEnd) {
        return isSameDay(newStart, exStart);
      } else {
        // One is range, one is single day
        const rangeStart = newEnd ? newStart : exStart;
        const rangeEnd = newEnd ? newEnd : exEnd!;
        const singleDay = newEnd ? exStart : newStart;
        return singleDay >= rangeStart && singleDay < rangeEnd;
      }
    });

    if (conflict) {
      toast.error("Day Conflict! You already have an activity selected for this time. Please resolve the conflict manually.");
      return;
    }

    setSelectedActivityOptionIds(prev => [...prev, id]);
  };

  const displayPerPerson = baseTotal + stayScenarioTotal + activityScenarioTotal;
  const displayGroupTotal = displayPerPerson * memberCount;

  interface BreakdownItem {
    category: string;
    title: string;
    unitPrice: number;
    nights: number | null;
    total: number;
  }

  const selectedBreakdown = useMemo(() => {
    const items: BreakdownItem[] = [];
    const count = Math.max(memberCount, 1);

    selectedOptionIds.forEach(id => {
      const selectedStay = stayOptions.find(ro => ro.option.id === id);
      if (selectedStay) {
        const { option } = selectedStay;
        let nights = 1;
        if (option.check_in_date && option.check_out_date) {
          nights = Math.max(differenceInDays(parseISO(option.check_out_date), parseISO(option.check_in_date)), 1);
        }

        const unitPrice = option.price_per_day_pp ?? ((option.price || 0) / count);
        const total = unitPrice * nights;

        items.push({
          category: "Stay",
          title: option.title,
          unitPrice,
          nights: nights > 0 ? nights : null,
          total
        });
      }
    });

    selectedActivityOptionIds.forEach(id => {
      const selectedActivity = activityOptions.find(ro => ro.option.id === id);
      if (selectedActivity) {
        const { option } = selectedActivity;
        let nights = 1;
        if (option.check_in_date && option.check_out_date) {
          nights = Math.max(differenceInDays(parseISO(option.check_out_date), parseISO(option.check_in_date)), 1);
        }

        const unitPrice = option.price_per_day_pp ?? ((option.price || 0) / count);
        const total = unitPrice * nights;

        items.push({
          category: "Activity",
          title: option.title,
          unitPrice,
          nights: nights > 0 ? nights : null,
          total
        });
      }
    });

    return items;
  }, [stayOptions, activityOptions, selectedOptionIds, selectedActivityOptionIds, memberCount]);

  const isLoading = budgetLoading || optionsLoading || settlementLoading;

  if (isLoading && !budget) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f9fafb] dark:bg-background-dark">
        <div className="flex flex-col items-center gap-4">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-slate-400">
            Balancing the budget…
          </p>
        </div>
      </div>
    );
  }

  if (!budget) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f9fafb] dark:bg-background-dark">
        <p className="text-sm text-slate-500">
          Budget data is not available for this trip yet.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f9fafb] py-10 dark:bg-background-dark">
      {/* Sticky Mobile Summary */}
      <div className={cn(
        "fixed top-0 left-0 right-0 z-50 bg-[#ccff00] text-black px-6 py-4 shadow-2xl transition-all duration-300 transform md:hidden",
        isSticky ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
      )}>
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[9.5px] font-black uppercase tracking-[0.2em] opacity-60 mb-0.5">Personal Share</span>
            <span className="text-2xl font-black italic serif-title leading-none">₹{displayPerPerson.toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-5">
            <div className="flex flex-col items-end">
              <span className="text-[9.5px] font-black uppercase tracking-[0.2em] opacity-60 mb-0.5">Group Total</span>
              <span className="text-sm font-bold leading-none">₹{displayGroupTotal.toFixed(0)}</span>
            </div>
            <div className="h-6 w-px bg-black/10" />
            <div className="flex items-center gap-1.5">
              <Users className="size-4" />
              <span className="text-sm font-bold leading-none">{memberCount}</span>
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto flex max-w-6xl flex-col gap-8 px-4 md:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          <div className="lg:col-span-2">
            <BudgetHeader
              totalExpenses={displayGroupTotal}
              perPersonAverage={displayPerPerson}
              memberCount={memberCount}
              expenseCount={budget.expense_count}
              personalBalance={personalBalance}
              expectedPrice={combinedAdminPickPerPerson}
              whoShouldPayNext={budget.who_should_pay_next}
            />

            {/* Mobile Breakdown Trigger */}
            <div className="mt-4 lg:hidden">
              <Sheet>
                <SheetTrigger asChild>
                  <button className="w-full flex items-center justify-between bg-black dark:bg-white text-white dark:text-black p-5 rounded-[1.5rem] font-black uppercase tracking-[0.1em] text-xs shadow-xl shadow-black/10">
                    <div className="flex items-center gap-3">
                      <div className="h-1.5 w-1.5 rounded-full bg-[#ccff00] animate-pulse" />
                      Selection Breakdown
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-[#ccff00] dark:text-primary font-black">₹{displayPerPerson.toFixed(0)}</span>
                      <ChevronDown className="size-5" />
                    </div>
                  </button>
                </SheetTrigger>
                <SheetContent side="bottom" className="bg-black border-none rounded-t-[2.5rem] p-0 overflow-hidden h-[70vh] [&>button]:text-white">
                  <div className="p-8 text-white h-full flex flex-col">
                    <SheetHeader className="pb-6 border-b border-white/10 p-0">
                      <SheetTitle className="text-2xl font-black italic serif-title text-white flex items-center justify-between">
                        breakdown
                        <span className="text-[#ccff00] font-black text-3xl italic">₹{displayPerPerson.toFixed(0)}</span>
                      </SheetTitle>
                    </SheetHeader>
                    <div className="space-y-4 pt-8 overflow-y-auto flex-1 pr-2">
                      {selectedBreakdown.length === 0 ? (
                        <p className="text-white/30 text-xs font-bold uppercase tracking-widest text-center py-10">No options selected yet</p>
                      ) : (
                        selectedBreakdown.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between gap-4 border-b border-white/5 pb-4 last:border-0">
                            <div className="flex flex-col">
                              <span className="text-[10px] font-black uppercase text-white/30 tracking-wider mb-1">
                                {item.category}
                              </span>
                              <span className="text-base font-bold text-white/90">
                                {item.title}
                              </span>
                            </div>
                            <div className="flex flex-col items-end">
                              <span className="text-xl font-black text-[#ccff00]">
                                ₹{item.total.toFixed(0)}
                              </span>
                              <span className="text-[10px] text-white/20 uppercase font-black tracking-tighter">
                                {item.nights ? `${item.nights} nights` : '1 unit'}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>

          <div className="hidden lg:flex lg:col-span-1 flex-col h-full">
            {selectedBreakdown.length > 0 ? (
              <Card className="bg-black text-white border-none shadow-2xl overflow-hidden h-full flex flex-col">
                <CardContent className="p-5 flex flex-col h-full">
                  <div className="flex flex-col gap-4 flex-1">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                      <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/40">
                        Selection Breakdown
                      </p>
                      <div className="h-1.5 w-1.5 rounded-full bg-[#ccff00] animate-pulse" />
                    </div>

                    <div className="space-y-3 overflow-y-auto max-h-[180px] pr-2 scrollbar-thin scrollbar-thumb-white/10">
                      {selectedBreakdown.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between gap-2 border-b border-white/5 pb-2 last:border-0 hover:bg-white/5 transition-colors p-1 rounded">
                          <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase text-white/30 tracking-wider">
                              {item.category}
                            </span>
                            <span className="text-sm font-bold text-white/90 line-clamp-1">
                              {item.title}
                            </span>
                          </div>

                          <div className="flex flex-col items-end">
                            <span className="text-sm font-black text-[#ccff00]">
                              ₹{item.total.toFixed(0)}
                            </span>
                            <span className="text-[10px] text-white/20 uppercase font-black tracking-tighter">
                              {item.nights ? `${item.nights} nights` : '1 unit'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-auto pt-3 border-t border-white/10 flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Total PP</span>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black text-[#ccff00]">
                          ₹{selectedBreakdown.reduce((sum, item) => sum + item.total, 0).toFixed(0)}
                        </span>
                        <span className="text-[10px] font-bold text-white/30 uppercase">INR</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-dashed border-2 bg-slate-50/50 dark:bg-slate-900/50 h-full flex items-center justify-center">
                <CardContent className="py-8 flex flex-col items-center justify-center text-center gap-2">
                  <PlusCircle className="size-5 text-slate-300" />
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nothing Selected</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {tripDates.length > 0 && (
          <div className="flex items-center gap-3 overflow-x-auto pb-4 pt-2 scrollbar-hide">
            <button
              onClick={() => setSelectedDate(null)}
              className={cn(
                "whitespace-nowrap rounded-full px-6 py-3 text-xs font-black uppercase tracking-widest transition-all duration-300 md:px-8 md:py-4",
                !selectedDate
                  ? "bg-black text-[#ccff00] shadow-xl dark:bg-white dark:text-black"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400"
              )}
            >
              All Dates
            </button>
            {tripDates.map((date, idx) => {
              const isSelected = selectedDate && isSameDay(date, selectedDate);
              return (
                <button
                  key={idx}
                  onClick={() => setSelectedDate(date)}
                  className={cn(
                    "whitespace-nowrap rounded-full px-6 py-3 text-xs font-black uppercase tracking-widest transition-all duration-300 md:px-8 md:py-4",
                    isSelected
                      ? "bg-black text-[#ccff00] shadow-xl dark:bg-white dark:text-black"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400"
                  )}
                >
                  {format(date, "MMM d")}
                </button>
              );
            })}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.25fr)]">
          <div className="flex flex-col gap-6">
            {filteredOptions.length === 0 ? (
              <Card className="border-dashed border-2 bg-slate-50/50 dark:bg-slate-900/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-400">Selected Stay</CardTitle>
                </CardHeader>
                <CardContent className="py-8 flex flex-col items-center justify-center text-center gap-4">
                  <div className="size-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400">
                    <PlusCircle className="size-6" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-600 dark:text-slate-300">No stay selected {selectedDate ? "for this day" : "yet"}</p>
                    <p className="text-xs text-slate-400 mt-1">Visit the explore page to finalize a stay.</p>
                  </div>
                  <Link
                    href={`/trip/${tripId}/explore`}
                    className="mt-2 bg-black dark:bg-white text-white dark:text-black px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all"
                  >
                    Add More
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <ScenarioPlanner
                options={filteredOptions}
                memberCount={memberCount}
                currentExpenses={baseTotal + activityScenarioTotal}
                onScenarioChange={() => { }}
                title={selectedDate ? `Pinned Stays: ${format(selectedDate, "MMM d")}` : "Scenario Planner: Stays"}
                description={selectedDate ? "Your current selection for this date." : "Build your hypothetical trip itinerary."}
                selectedOptionIds={selectedOptionIds}
                onSelectOption={handleSelectOption}
                hideSelectionIndicator={!!selectedDate}
              />
            )}

            {filteredActivityOptions.length === 0 ? (
              <Card className="border-dashed border-2 bg-slate-50/50 dark:bg-slate-900/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-400">Selected Activities</CardTitle>
                </CardHeader>
                <CardContent className="py-8 flex flex-col items-center justify-center text-center gap-4">
                  <div className="size-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400">
                    <PlusCircle className="size-6" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-600 dark:text-slate-300">No activities selected {selectedDate ? "for this day" : "yet"}</p>
                    <p className="text-xs text-slate-400 mt-1">Visit the explore page to finalize activities.</p>
                  </div>
                  <Link
                    href={`/trip/${tripId}/explore`}
                    className="mt-2 bg-black dark:bg-white text-white dark:text-black px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all"
                  >
                    Add More
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <ScenarioPlanner
                options={filteredActivityOptions}
                memberCount={memberCount}
                currentExpenses={baseTotal + stayScenarioTotal}
                onScenarioChange={() => { }}
                title={selectedDate ? `Pinned Activities: ${format(selectedDate, "MMM d")}` : "Scenario Planner: Activities"}
                description={selectedDate ? "Your current selections for this date." : "Build your hypothetical trip itinerary."}
                selectedOptionIds={selectedActivityOptionIds}
                onSelectOption={handleSelectActivityOption}
                hideSelectionIndicator={!!selectedDate}
              />
            )}
          </div>

          <div className="space-y-4">
            <Card className="bg-slate-100/50 dark:bg-slate-800/50 border-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Trip Cost Estimate (Per Person)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Admin's Expected Price — Primary figure */}
                <div className="bg-black dark:bg-white rounded-2xl p-4 flex items-center justify-between">
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-white/50 dark:text-black/50 block mb-0.5">
                      Admin's Expected Price
                    </span>
                    <span className="text-[9px] text-white/30 dark:text-black/30 font-medium">
                      From finalized options
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black text-[#ccff00] dark:text-primary">
                      ₹{combinedAdminPickPerPerson.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                </div>

                {/* User's Selected Scenario */}
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Your Planned Cost
                    </span>
                    <span className="text-[8px] text-muted-foreground uppercase font-medium">Selected Scenarios</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {((stayScenarioTotal + activityScenarioTotal) > combinedAdminPickPerPerson) ? (
                      <TrendingUp className="h-4 w-4 text-slate-900 dark:text-white" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-slate-900 dark:text-white" />
                    )}
                    <span className="text-sm font-bold">
                      ₹{(stayScenarioTotal + activityScenarioTotal).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">
                    Your Total Est.
                  </span>
                  <span className="text-lg font-black text-black dark:text-white">
                    ₹{(baseTotal + stayScenarioTotal + activityScenarioTotal).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </span>
                </div>
              </CardContent>
            </Card>

            <ExpenseBreakdown
              byCategory={budget.by_category}
              byPayer={budget.by_payer}
              total={budget.total_expenses}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

