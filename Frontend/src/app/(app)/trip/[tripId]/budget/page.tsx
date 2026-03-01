"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useParams } from "next/navigation";
import { format, parseISO, eachDayOfInterval } from "date-fns";
import { BudgetHeader, ExpenseBreakdown, ScenarioPlanner } from "@/components/budget";
import { useBudget, useTripMembers, useRankedOptions, useExpenses } from "@/lib/hooks";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, TrendingUp, TrendingDown } from "lucide-react";
import type { RankedOption, Expense } from "@/types";

export default function BudgetPage() {
  const params = useParams();
  const tripId = Number(params.tripId);
  const { budget, isLoading: budgetLoading } = useBudget(tripId);
  const { members, isLoading: membersLoading } = useTripMembers(tripId);
  const { rankedOptions, isLoading: optionsLoading } = useRankedOptions(tripId);
  const { expenses } = useExpenses(tripId);
  const { activeTrip } = useAppStore();

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
      if (ro.option.check_in_date) {
        if (!grouped[ro.option.check_in_date]) {
          grouped[ro.option.check_in_date] = [];
        }
        grouped[ro.option.check_in_date].push(ro);
      }
    });
    return grouped;
  }, [rankedOptions]);

  useEffect(() => {
    const initialSelections: Record<string, number | null> = {};
    Object.entries(optionsByDate).forEach(([date, options]) => {
      const finalized = options.find((ro) => ro.option.is_finalized);
      if (finalized) {
        initialSelections[date] = finalized.option.id;
      }
    });
    setSelectedOptionByDate((prev) => {
      const merged = { ...initialSelections };
      Object.entries(prev).forEach(([date, optionId]) => {
        if (optionId !== null) {
          merged[date] = optionId;
        }
      });
      return merged;
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

  const baseExpenses = budget?.total_expenses ?? 0;

  const totalSelectedStays = useMemo(() => {
    let total = 0;
    Object.entries(selectedOptionByDate).forEach(([date, optionId]) => {
      if (optionId !== null) {
        const option = optionsByDate[date]?.find((ro) => ro.option.id === optionId);
        if (option) {
          total += option.option.price || 0;
        }
      }
    });
    return total;
  }, [selectedOptionByDate, optionsByDate]);

  const totalFinalizedStays = useMemo(() => {
    return rankedOptions
      .filter((ro) => ro.option.is_finalized)
      .reduce((sum, ro) => sum + (ro.option.price || 0), 0);
  }, [rankedOptions]);

  const scenarioTotal = baseExpenses + totalSelectedStays;
  const scenarioPerPerson = scenarioTotal / Math.max(members.length, 1);
  const budgetDifference = totalSelectedStays - totalFinalizedStays;

  const handleScenarioChange = useCallback(() => {
  }, []);

  const isLoading = budgetLoading || membersLoading || optionsLoading;

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const filteredExpenses = selectedDate
    ? expensesByDate[selectedDate]?.expenses || []
    : [];

  const filteredOptions = selectedDate
    ? optionsByDate[selectedDate] || []
    : [];

  const getDateExpenseTotal = (dateStr: string) => {
    return expensesByDate[dateStr]?.total || 0;
  };

  const hasSelectedOption = (dateStr: string) => {
    return selectedOptionByDate[dateStr] !== null && selectedOptionByDate[dateStr] !== undefined;
  };

  const getDateSelectedTotal = (dateStr: string) => {
    const optionId = selectedOptionByDate[dateStr];
    if (optionId === null || optionId === undefined) return 0;
    const option = optionsByDate[dateStr]?.find((ro) => ro.option.id === optionId);
    return option?.option.price || 0;
  };

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-4">
      <h2 className="text-lg font-semibold">Budget Overview</h2>

      <div className="relative">
        <BudgetHeader
          totalExpenses={scenarioTotal}
          perPersonAverage={scenarioPerPerson}
          memberCount={budget?.member_count ?? members.length}
          expenseCount={budget?.expense_count ?? 0}
        />
        
        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Base expenses</span>
            <span className="font-medium">${baseExpenses.toFixed(2)}</span>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Selected stays</span>
            <span className="font-medium text-primary">${totalSelectedStays.toFixed(2)}</span>
          </div>
          
          {budgetDifference !== 0 && (
            <div className={`flex items-center justify-between text-sm p-2 rounded ${
              budgetDifference > 0 ? "bg-amber-50" : "bg-green-50"
            }`}>
              <span className="flex items-center gap-1">
                {budgetDifference > 0 ? (
                  <TrendingUp className="h-4 w-4 text-amber-600" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-green-600" />
                )}
                <span className={budgetDifference > 0 ? "text-amber-700" : "text-green-700"}>
                  {budgetDifference > 0 ? "More than admin picks" : "Savings vs admin picks"}
                </span>
              </span>
              <span className={`font-bold ${budgetDifference > 0 ? "text-amber-700" : "text-green-700"}`}>
                {budgetDifference > 0 ? "+" : ""}${budgetDifference.toFixed(2)}
              </span>
            </div>
          )}
        </div>
      </div>

      {tripDates.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {tripDates.map((date) => {
            const dateStr = format(date, "yyyy-MM-dd");
            const expenseTotal = getDateExpenseTotal(dateStr);
            const stayTotal = getDateSelectedTotal(dateStr);
            const dateTotal = expenseTotal + stayTotal;
            const hasSelection = hasSelectedOption(dateStr);
            const hasOptions = (optionsByDate[dateStr]?.length || 0) > 0;
            
            return (
              <Button
                key={dateStr}
                variant={selectedDate === dateStr ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedDate(dateStr)}
                className={hasSelection ? "border-green-500" : ""}
              >
                <span>{format(date, "MMM d")}</span>
                {dateTotal > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1">
                    ${dateTotal.toFixed(0)}
                  </Badge>
                )}
                {hasSelection && <CheckCircle2 className="h-3 w-3 ml-1 text-green-600" />}
                {!hasSelection && hasOptions && (
                  <span className="ml-1 w-2 h-2 rounded-full bg-amber-400" />
                )}
              </Button>
            );
          })}
        </div>
      )}

      {selectedDate && (
        <>
          {filteredOptions.length > 0 ? (
            <ScenarioPlanner
              options={filteredOptions}
              memberCount={members.length}
              currentExpenses={getDateExpenseTotal(selectedDate)}
              onScenarioChange={handleScenarioChange}
              title={`Stay Options: ${format(parseISO(selectedDate), "MMM d")}`}
              description="Tap to select a stay for this day"
              selectedOptionId={selectedOptionByDate[selectedDate] ?? null}
              onSelectOption={(optionId) => handleSelectOption(selectedDate, optionId)}
            />
          ) : (
            <Card>
              <CardContent className="py-6">
                <p className="text-muted-foreground text-center">No stay options for this date</p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                {format(parseISO(selectedDate), "EEEE, MMMM d")} - Expenses
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredExpenses.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No expenses for this date</p>
              ) : (
                <div className="space-y-2">
                  {filteredExpenses.map((expense) => (
                    <div key={expense.id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div>
                        <p className="font-medium">{expense.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {expense.category} • Paid by {expense.payer_name}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">${expense.amount.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">
                          ${(expense.amount / Math.max(members.length, 1)).toFixed(2)}/person
                        </p>
                      </div>
                    </div>
                  ))}
                  <div className="pt-2 flex items-center justify-between font-medium">
                    <span>Day Total</span>
                    <span>${(expensesByDate[selectedDate]?.total || 0).toFixed(2)}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <ExpenseBreakdown
        byCategory={budget?.by_category ?? {}}
        byPayer={budget?.by_payer ?? {}}
        total={budget?.total_expenses ?? 0}
      />
    </div>
  );
}
