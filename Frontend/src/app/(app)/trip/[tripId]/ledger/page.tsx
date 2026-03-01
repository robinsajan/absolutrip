"use client";

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { format, parseISO, eachDayOfInterval } from "date-fns";
import { ExpenseForm, ExpenseFeed } from "@/components/ledger";
import { useExpenses, useTripMembers, useAuth, useBudget } from "@/lib/hooks";
import { useAppStore } from "@/lib/store";
import { expenses as expensesApi } from "@/lib/api/endpoints";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, List } from "lucide-react";
import type { ExpenseCategory, Expense } from "@/types";

type ViewMode = "list" | "date";

export default function LedgerPage() {
  const params = useParams();
  const tripId = Number(params.tripId);
  const { user } = useAuth();
  const { activeTrip } = useAppStore();
  const { expenses, isLoading, mutate } = useExpenses(tripId);
  const { members } = useTripMembers(tripId);
  const { mutate: mutateBudget } = useBudget(tripId);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

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

  const expensesByDate = useMemo(() => {
    const grouped: Record<string, { expenses: Expense[]; total: number }> = {};
    const noDate: Expense[] = [];
    
    expenses.forEach((expense) => {
      if (expense.expense_date) {
        if (!grouped[expense.expense_date]) {
          grouped[expense.expense_date] = { expenses: [], total: 0 };
        }
        grouped[expense.expense_date].expenses.push(expense);
        grouped[expense.expense_date].total += expense.amount;
      } else {
        noDate.push(expense);
      }
    });
    
    return { grouped, noDate };
  }, [expenses]);

  const handleAddExpense = async (data: {
    amount: number;
    description: string;
    category: ExpenseCategory;
    paid_by: number;
    split_among?: number[];
    expense_date?: string;
  }) => {
    await expensesApi.create(tripId, data);
    mutate();
    mutateBudget();
  };

  const handleUpdateExpense = async (
    expenseId: number,
    data: {
      amount?: number;
      description?: string;
      category?: ExpenseCategory;
      split_among?: number[];
      expense_date?: string;
    }
  ) => {
    await expensesApi.update(tripId, expenseId, data);
    mutate();
    mutateBudget();
    setEditingExpense(null);
  };

  const handleDeleteExpense = async (expenseId: number) => {
    try {
      await expensesApi.delete(tripId, expenseId);
      toast.success("Expense deleted");
      mutate();
      mutateBudget();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || "Failed to delete expense");
    }
  };

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
  };

  const sortedExpenses = [...expenses].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const filteredExpenses = useMemo(() => {
    if (viewMode === "list" || !selectedDate) return sortedExpenses;
    return sortedExpenses.filter((e) => e.expense_date === selectedDate);
  }, [sortedExpenses, viewMode, selectedDate]);

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Expenses</h2>
        <div className="flex items-center gap-1">
          <Button
            variant={viewMode === "list" ? "default" : "ghost"}
            size="sm"
            onClick={() => {
              setViewMode("list");
              setSelectedDate(null);
            }}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "date" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("date")}
            disabled={tripDates.length === 0}
          >
            <Calendar className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {viewMode === "date" && tripDates.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          <Button
            variant={selectedDate === null ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedDate(null)}
          >
            All
          </Button>
          {tripDates.map((date) => {
            const dateStr = format(date, "yyyy-MM-dd");
            const dateData = expensesByDate.grouped[dateStr];
            const count = dateData?.expenses.length || 0;
            const total = dateData?.total || 0;
            return (
              <Button
                key={dateStr}
                variant={selectedDate === dateStr ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedDate(dateStr)}
                className="flex-col h-auto py-1"
              >
                <span>{format(date, "MMM d")}</span>
                {count > 0 && (
                  <span className="text-xs opacity-70">${total.toFixed(0)}</span>
                )}
              </Button>
            );
          })}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : viewMode === "date" && selectedDate ? (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium">
              {format(parseISO(selectedDate), "EEEE, MMMM d")}
            </h3>
            {expensesByDate.grouped[selectedDate] && (
              <Badge variant="secondary">
                Total: ${expensesByDate.grouped[selectedDate].total.toFixed(2)}
              </Badge>
            )}
          </div>
          {filteredExpenses.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No expenses for this date
            </p>
          ) : (
            <ExpenseFeed
              expenses={filteredExpenses}
              currentUserId={user?.id}
              onDelete={handleDeleteExpense}
              onEdit={handleEditExpense}
              memberCount={members.length}
            />
          )}
        </div>
      ) : viewMode === "date" ? (
        <div className="space-y-6">
          {tripDates.map((date) => {
            const dateStr = format(date, "yyyy-MM-dd");
            const dateData = expensesByDate.grouped[dateStr];
            if (!dateData || dateData.expenses.length === 0) return null;
            return (
              <div key={dateStr}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium">{format(date, "EEEE, MMMM d")}</h3>
                  <Badge variant="secondary">${dateData.total.toFixed(2)}</Badge>
                </div>
                <ExpenseFeed
                  expenses={dateData.expenses}
                  currentUserId={user?.id}
                  onDelete={handleDeleteExpense}
                  onEdit={handleEditExpense}
                  memberCount={members.length}
                />
              </div>
            );
          })}
          {expensesByDate.noDate.length > 0 && (
            <div>
              <h3 className="font-medium mb-3 text-muted-foreground">No date assigned</h3>
              <ExpenseFeed
                expenses={expensesByDate.noDate}
                currentUserId={user?.id}
                onDelete={handleDeleteExpense}
                onEdit={handleEditExpense}
                memberCount={members.length}
              />
            </div>
          )}
        </div>
      ) : (
        <ExpenseFeed
          expenses={sortedExpenses}
          currentUserId={user?.id}
          onDelete={handleDeleteExpense}
          onEdit={handleEditExpense}
          memberCount={members.length}
        />
      )}

      <ExpenseForm
        members={members}
        currentUserId={user?.id}
        onSubmit={handleAddExpense}
        onUpdate={handleUpdateExpense}
        editExpense={editingExpense}
        onCancelEdit={() => setEditingExpense(null)}
        tripStartDate={activeTrip?.start_date}
        tripEndDate={activeTrip?.end_date}
      />
    </div>
  );
}
