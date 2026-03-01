"use client";

import { useState, useEffect, useMemo } from "react";
import { Plus, Check, X, CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { format, parseISO, eachDayOfInterval, startOfDay, endOfDay, isWithinInterval } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { TripMember, ExpenseCategory, Expense } from "@/types";

interface ExpenseFormProps {
  members: TripMember[];
  currentUserId?: number;
  onSubmit: (data: {
    amount: number;
    description: string;
    category: ExpenseCategory;
    paid_by: number;
    split_among?: number[];
    expense_date?: string;
  }) => Promise<void>;
  onUpdate?: (
    expenseId: number,
    data: {
      amount?: number;
      description?: string;
      category?: ExpenseCategory;
      split_among?: number[];
      expense_date?: string;
    }
  ) => Promise<void>;
  editExpense?: Expense | null;
  onCancelEdit?: () => void;
  tripStartDate?: string;
  tripEndDate?: string;
}

const categories: { value: ExpenseCategory; label: string }[] = [
  { value: "food", label: "Food" },
  { value: "transport", label: "Transport" },
  { value: "stay", label: "Stay" },
  { value: "activity", label: "Activity" },
  { value: "other", label: "Other" },
];

const quickAmounts = [10, 20, 50, 100];

export function ExpenseForm({
  members,
  currentUserId,
  onSubmit,
  onUpdate,
  editExpense,
  onCancelEdit,
  tripStartDate,
  tripEndDate,
}: ExpenseFormProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("food");
  const [paidBy, setPaidBy] = useState<number | undefined>(currentUserId);
  const [splitAmong, setSplitAmong] = useState<number[]>([]);
  const [splitAll, setSplitAll] = useState(true);
  const [expenseDate, setExpenseDate] = useState<Date | undefined>(undefined);

  const isEditMode = !!editExpense;

  const tripDateRange = useMemo(() => {
    if (!tripStartDate || !tripEndDate) return null;
    return {
      start: startOfDay(parseISO(tripStartDate)),
      end: endOfDay(parseISO(tripEndDate)),
    };
  }, [tripStartDate, tripEndDate]);

  const tripDates = useMemo(() => {
    if (!tripDateRange) return [];
    return eachDayOfInterval({ start: tripDateRange.start, end: tripDateRange.end });
  }, [tripDateRange]);

  const isDateDisabled = (date: Date) => {
    if (!tripDateRange) return false;
    return !isWithinInterval(date, { start: tripDateRange.start, end: tripDateRange.end });
  };

  useEffect(() => {
    if (editExpense) {
      setAmount(editExpense.amount.toString());
      setDescription(editExpense.description);
      setCategory(editExpense.category);
      setPaidBy(editExpense.paid_by);
      
      if (editExpense.expense_date) {
        setExpenseDate(parseISO(editExpense.expense_date));
      } else {
        setExpenseDate(undefined);
      }
      
      const splitUserIds = editExpense.splits?.map((s) => s.user_id) || [];
      setSplitAmong(splitUserIds);
      
      const allMemberIds = members.map((m) => m.user_id);
      const isAllMembers =
        splitUserIds.length === allMemberIds.length &&
        allMemberIds.every((id) => splitUserIds.includes(id));
      setSplitAll(isAllMembers);
      
      setOpen(true);
    }
  }, [editExpense, members]);

  const resetForm = () => {
    setAmount("");
    setDescription("");
    setCategory("food");
    setPaidBy(currentUserId);
    setSplitAmong([]);
    setSplitAll(true);
    setExpenseDate(undefined);
  };

  const handleClose = () => {
    setOpen(false);
    if (isEditMode && onCancelEdit) {
      onCancelEdit();
    }
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (!description.trim()) {
      toast.error("Please enter a description");
      return;
    }

    if (!paidBy) {
      toast.error("Please select who paid");
      return;
    }

    if (!splitAll && splitAmong.length === 0) {
      toast.error("Please select at least one person to split with");
      return;
    }

    setIsLoading(true);
    try {
      const expenseDateStr = expenseDate ? format(expenseDate, "yyyy-MM-dd") : undefined;
      
      if (isEditMode && onUpdate && editExpense) {
        await onUpdate(editExpense.id, {
          amount: numAmount,
          description: description.trim(),
          category,
          split_among: splitAll ? undefined : splitAmong,
          expense_date: expenseDateStr,
        });
        toast.success("Expense updated!");
      } else {
        await onSubmit({
          amount: numAmount,
          description: description.trim(),
          category,
          paid_by: paidBy,
          split_among: splitAll ? undefined : splitAmong,
          expense_date: expenseDateStr,
        });
        toast.success("Expense added!");
      }
      handleClose();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || `Failed to ${isEditMode ? "update" : "add"} expense`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAmount = (value: number) => {
    setAmount((prev) => {
      const current = parseFloat(prev) || 0;
      return (current + value).toString();
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const toggleSplitMember = (userId: number) => {
    setSplitAmong((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSplitAllChange = (checked: boolean) => {
    setSplitAll(checked);
    if (checked) {
      setSplitAmong([]);
    } else {
      setSplitAmong(members.map((m) => m.user_id));
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={(isOpen) => {
        if (!isOpen) {
          handleClose();
        } else {
          setOpen(true);
        }
      }}>
        {!isEditMode && (
          <SheetTrigger asChild>
            <Button
              size="lg"
              className="fixed bottom-24 right-4 h-14 w-14 rounded-full shadow-lg lg:bottom-8 z-40"
            >
              <Plus className="h-6 w-6" />
            </Button>
          </SheetTrigger>
        )}
        <SheetContent side="bottom" className="h-[90vh] rounded-t-xl overflow-y-auto">
          <SheetHeader className="flex flex-row items-center justify-between">
            <SheetTitle>{isEditMode ? "Edit Expense" : "Add Expense"}</SheetTitle>
            {isEditMode && (
              <Button variant="ghost" size="icon" onClick={handleClose}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </SheetHeader>
          <form onSubmit={handleSubmit} className="space-y-6 mt-6 pb-8">
            <div className="space-y-2">
              <Label>Amount</Label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl text-muted-foreground">
                  $
                </span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="text-3xl font-bold h-16 pl-10 text-center"
                  disabled={isLoading}
                />
              </div>
              <div className="flex gap-2 justify-center mt-2">
                {quickAmounts.map((value) => (
                  <Button
                    key={value}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickAmount(value)}
                    disabled={isLoading}
                  >
                    +${value}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="What was this for?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setCategory(cat.value)}
                    className={cn(
                      "px-4 py-2 rounded-full text-sm font-medium transition-colors",
                      category === cat.value
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                    disabled={isLoading}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Date</Label>
                {tripDateRange && (
                  <span className="text-xs text-muted-foreground">
                    Trip: {format(tripDateRange.start, "MMM d")} - {format(tripDateRange.end, "MMM d")}
                  </span>
                )}
              </div>
              {tripDates.length > 0 ? (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  <Button
                    type="button"
                    variant={!expenseDate ? "default" : "outline"}
                    size="sm"
                    onClick={() => setExpenseDate(undefined)}
                    disabled={isLoading}
                  >
                    No date
                  </Button>
                  {tripDates.map((date) => (
                    <Button
                      key={date.toISOString()}
                      type="button"
                      variant={expenseDate && format(expenseDate, "yyyy-MM-dd") === format(date, "yyyy-MM-dd") ? "default" : "outline"}
                      size="sm"
                      onClick={() => setExpenseDate(date)}
                      disabled={isLoading}
                    >
                      {format(date, "MMM d")}
                    </Button>
                  ))}
                </div>
              ) : (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !expenseDate && "text-muted-foreground"
                      )}
                      disabled={isLoading}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {expenseDate ? format(expenseDate, "PPP") : "Select date (optional)"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={expenseDate}
                      onSelect={setExpenseDate}
                      disabled={isDateDisabled}
                      defaultMonth={tripDateRange?.start}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              )}
            </div>

            {!isEditMode && (
              <div className="space-y-2">
                <Label>Paid by</Label>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {members.map((member) => (
                    <button
                      key={member.user_id}
                      type="button"
                      onClick={() => setPaidBy(member.user_id)}
                      className={cn(
                        "flex flex-col items-center gap-1 p-2 rounded-lg transition-colors min-w-[70px]",
                        paidBy === member.user_id
                          ? "bg-primary/10 ring-2 ring-primary"
                          : "hover:bg-muted"
                      )}
                      disabled={isLoading}
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarFallback
                          className={cn(
                            paidBy === member.user_id
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          )}
                        >
                          {getInitials(member.user_name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs truncate max-w-[60px]">
                        {member.user_name.split(" ")[0]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Split among</Label>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="split-all"
                    checked={splitAll}
                    onCheckedChange={(checked) => handleSplitAllChange(checked as boolean)}
                    disabled={isLoading}
                  />
                  <label
                    htmlFor="split-all"
                    className="text-sm text-muted-foreground cursor-pointer"
                  >
                    Everyone equally
                  </label>
                </div>
              </div>
              
              {!splitAll && (
                <div className="grid grid-cols-2 gap-2">
                  {members.map((member) => (
                    <button
                      key={member.user_id}
                      type="button"
                      onClick={() => toggleSplitMember(member.user_id)}
                      className={cn(
                        "flex items-center gap-2 p-3 rounded-lg border transition-colors text-left",
                        splitAmong.includes(member.user_id)
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted"
                      )}
                      disabled={isLoading}
                    >
                      <div
                        className={cn(
                          "h-5 w-5 rounded border flex items-center justify-center",
                          splitAmong.includes(member.user_id)
                            ? "bg-primary border-primary"
                            : "border-muted-foreground"
                        )}
                      >
                        {splitAmong.includes(member.user_id) && (
                          <Check className="h-3 w-3 text-primary-foreground" />
                        )}
                      </div>
                      <span className="text-sm truncate">{member.user_name}</span>
                    </button>
                  ))}
                </div>
              )}
              
              {!splitAll && splitAmong.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  Split: ${(parseFloat(amount) / splitAmong.length || 0).toFixed(2)} per person
                </p>
              )}
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
              {isLoading
                ? isEditMode
                  ? "Updating..."
                  : "Adding..."
                : isEditMode
                ? "Update Expense"
                : "Add Expense"}
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
}
