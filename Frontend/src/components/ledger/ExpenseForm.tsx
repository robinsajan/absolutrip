"use client";

import { useState, useEffect, useMemo } from "react";
import { Plus, Check, X, CalendarIcon, Utensils, Car, Home, Sparkles, MoreHorizontal, Users, Percent, Calculator, Hash, Receipt, Globe, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format, parseISO, eachDayOfInterval, startOfDay, endOfDay, isWithinInterval, differenceInDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import api from "@/lib/api/client";
import { useOptions } from "@/lib/hooks";
import type { TripMember, ExpenseCategory, Expense } from "@/types";

interface SplitDataItem {
  user_id: number;
  share_count?: number;
  percentage?: number;
  amount?: number;
}

interface ExpenseFormProps {
  tripId?: number;
  members: TripMember[];
  currentUserId?: number;
  onSubmit: (data: {
    amount: number;
    description: string;
    category: ExpenseCategory;
    paid_by: number;
    split_type: 'equally' | 'shares' | 'percentage' | 'exact';
    split_data: SplitDataItem[];
    expense_date?: string;
    currency?: string;
    base_amount?: number;
    exchange_rate?: number;
    receipt_url?: string;
  }) => Promise<void>;
  onUpdate?: (
    expenseId: number,
    data: {
      amount?: number;
      description?: string;
      category?: ExpenseCategory;
      split_type?: 'equally' | 'shares' | 'percentage' | 'exact';
      split_data?: SplitDataItem[];
      expense_date?: string;
      currency?: string;
      base_amount?: number;
      exchange_rate?: number;
      receipt_url?: string;
    }
  ) => Promise<void>;
  editExpense?: Expense | null;
  onCancelEdit?: () => void;
  tripStartDate?: string;
  tripEndDate?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showTrigger?: boolean;
}

const categories: { value: ExpenseCategory; label: string; icon: React.ReactNode }[] = [
  { value: "stay", label: "Stay", icon: <Home className="h-4 w-4" /> },
  { value: "activity", label: "Activity", icon: <Sparkles className="h-4 w-4" /> },
  { value: "food", label: "Food", icon: <Utensils className="h-4 w-4" /> },
  { value: "transport", label: "Transport", icon: <Car className="h-4 w-4" /> },
  { value: "other", label: "Other", icon: <MoreHorizontal className="h-4 w-4" /> },
];

const currencies = [
  { code: 'USD', symbol: '$' },
  { code: 'EUR', symbol: '€' },
  { code: 'GBP', symbol: '£' },
  { code: 'INR', symbol: '₹' },
  { code: 'JPY', symbol: '¥' },
];

export function ExpenseForm({
  tripId,
  members,
  currentUserId,
  onSubmit,
  onUpdate,
  editExpense,
  onCancelEdit,
  tripStartDate,
  tripEndDate,
  open: externalOpen,
  onOpenChange: externalOnOpenChange,
  showTrigger = true,
}: ExpenseFormProps) {
  const [internalOpen, setInternalOpen] = useState(false);

  // Use external control if provided, otherwise fallback to internal state
  const isOpen = externalOpen !== undefined ? externalOpen : internalOpen;
  const setIsOpen = (val: boolean) => {
    if (externalOnOpenChange) externalOnOpenChange(val);
    setInternalOpen(val);
  };

  const [isLoading, setIsLoading] = useState(false);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("food");
  const [paidBy, setPaidBy] = useState<number | undefined>(currentUserId);
  const [expenseDate, setExpenseDate] = useState<Date | undefined>(undefined);
  const [selectedStayOptionId, setSelectedStayOptionId] = useState<number | null>(null);

  // Advanced Split State
  const [splitType, setSplitType] = useState<'equally' | 'shares' | 'percentage' | 'exact'>('equally');
  const [selectedSplitUsers, setSelectedSplitUsers] = useState<number[]>(members.map(m => m.user_id));
  const [splitData, setSplitData] = useState<Record<number, Partial<SplitDataItem>>>({});

  // Metadata
  const [currency, setCurrency] = useState('USD');
  const [exchangeRate, setExchangeRate] = useState("1.0");
  const [baseAmount, setBaseAmount] = useState("");
  const [receiptUrl, setReceiptUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  // Options (used to simplify stay expenses)
  const { options } = useOptions(tripId ?? null);
  const stayOptions = useMemo(
    () => options.filter((o) => (o.category || "stay") === "stay" && typeof o.price === "number"),
    [options]
  );

  const calcStayTotal = useMemo(() => {
    return (opt: any) => {
      const memberCount = Math.max(members.length, 1);

      if (opt.price_per_day_pp !== undefined && opt.price_per_day_pp !== null) {
        let nights = 1;
        if (opt.check_in_date && opt.check_out_date) {
          nights = Math.max(differenceInDays(parseISO(opt.check_out_date), parseISO(opt.check_in_date)), 1);
        }
        return Number((opt.price_per_day_pp * memberCount * nights).toFixed(2));
      }

      const price = (Number(opt.price || 0) / memberCount);
      let total = price;

      if (opt.is_per_night && opt.check_in_date && opt.check_out_date) {
        try {
          const nights = Math.max(differenceInDays(parseISO(opt.check_out_date), parseISO(opt.check_in_date)), 1);
          total *= nights;
        } catch {
          // fallback to 1 night
        }
      }

      return Number(total.toFixed(2));
    };
  }, [members.length]);

  // FX Conversion Logic
  useEffect(() => {
    if (currency === 'USD') {
      setExchangeRate("1.0");
      setBaseAmount(amount);
    } else {
      const rate = parseFloat(exchangeRate) || 0;
      const base = parseFloat(baseAmount) || 0;
      if (rate > 0 && base > 0) {
        setAmount((base * rate).toFixed(2));
      }
    }
  }, [currency, exchangeRate, baseAmount]);

  useEffect(() => {
    if (currency === 'USD') {
      setBaseAmount(amount);
    }
  }, [amount, currency]);

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
      setSplitType(editExpense.split_type);
      setCurrency(editExpense.currency || 'USD');
      setExchangeRate(editExpense.exchange_rate?.toString() || "1.0");
      setBaseAmount(editExpense.base_amount?.toString() || editExpense.amount.toString());
      setReceiptUrl(editExpense.receipt_url || "");

      if (editExpense.expense_date) {
        setExpenseDate(parseISO(editExpense.expense_date));
      } else {
        setExpenseDate(undefined);
      }

      const splitUserIds = editExpense.splits?.map((s) => s.user_id) || [];
      setSelectedSplitUsers(splitUserIds);

      const initialSplitData: Record<number, Partial<SplitDataItem>> = {};
      editExpense.splits?.forEach(s => {
        initialSplitData[s.user_id] = {
          share_count: s.share_count,
          percentage: s.percentage,
          amount: s.amount
        };
      });
      setSplitData(initialSplitData);

      setIsOpen(true);
    } else {
      setSelectedSplitUsers(members.map(m => m.user_id));
    }
  }, [editExpense, members]);

  // Stay category: choose stay option -> auto-fill amount + split equally across all members
  useEffect(() => {
    if (category !== "stay") {
      setSelectedStayOptionId(null);
      return;
    }

    // enforce auto split for stay
    setSplitType("equally");
    setSelectedSplitUsers(members.map((m) => m.user_id));
    setSplitData({});
    setCurrency("USD");
    setExchangeRate("1.0");

    if (!selectedStayOptionId) return;
    const opt = stayOptions.find((o: any) => o.id === selectedStayOptionId);
    if (!opt) return;

    const total = calcStayTotal(opt);
    setAmount(total.toFixed(2));
    setBaseAmount(total.toFixed(2));
    setDescription(opt.title || "Stay");

    if (opt.check_in_date) {
      try {
        setExpenseDate(parseISO(opt.check_in_date));
      } catch {
        // ignore
      }
    }
  }, [category, selectedStayOptionId, stayOptions, members, calcStayTotal]);

  const resetForm = () => {
    setAmount("");
    setDescription("");
    setCategory("food");
    setPaidBy(currentUserId || members[0]?.user_id);
    setSplitType('equally');
    setSelectedSplitUsers(members.map(m => m.user_id));
    setSplitData({});
    setExpenseDate(new Date());
    setCurrency('USD');
    setReceiptUrl("");
    setSelectedStayOptionId(null);
  };

  const handleClose = () => {
    setIsOpen(false);
    if (onCancelEdit) {
      onCancelEdit();
    }
    resetForm();
  };

  const validateSplits = () => {
    const numAmount = parseFloat(amount);

    if (splitType === 'percentage') {
      const totalPct = selectedSplitUsers.reduce((sum, id) => sum + (splitData[id]?.percentage || 0), 0);
      if (Math.abs(totalPct - 100) > 0.1) {
        toast.error(`Percentages must sum to 100% (currently ${totalPct}%)`);
        return false;
      }
    }

    if (splitType === 'exact') {
      const totalAmt = selectedSplitUsers.reduce((sum, id) => sum + (splitData[id]?.amount || 0), 0);
      if (Math.abs(totalAmt - numAmount) > 0.1) {
        toast.error(`Split amounts must sum to ${numAmount} (currently ${totalAmt})`);
        return false;
      }
    }

    if (splitType === 'shares') {
      const totalShares = selectedSplitUsers.reduce((sum, id) => sum + (splitData[id]?.share_count || 1), 0);
      if (totalShares <= 0) {
        toast.error("Total shares must be greater than zero");
        return false;
      }
    }

    return true;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setIsUploading(true);
    try {
      const response = await api.post("/expenses/upload-receipt", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      setReceiptUrl(response.data.url);
      toast.success("Receipt uploaded successfully");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload receipt");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isEditMode && category === "stay" && !selectedStayOptionId) {
      toast.error("Please choose a stay option");
      return;
    }

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

    if (selectedSplitUsers.length === 0) {
      toast.error("Please select at least one person to split with");
      return;
    }

    if (!validateSplits()) return;

    setIsLoading(true);
    try {
      const expenseDateStr = expenseDate ? format(expenseDate, "yyyy-MM-dd") : undefined;

      const payloadSplitData: SplitDataItem[] = selectedSplitUsers.map(userId => ({
        user_id: userId,
        share_count: splitType === 'shares' ? (splitData[userId]?.share_count || 1) : undefined,
        percentage: splitType === 'percentage' ? (splitData[userId]?.percentage || 0) : undefined,
        amount: splitType === 'exact' ? (splitData[userId]?.amount || 0) : undefined,
      }));

      if (isEditMode && onUpdate && editExpense) {
        await onUpdate(editExpense.id, {
          amount: numAmount,
          base_amount: parseFloat(baseAmount) || numAmount,
          currency: currency,
          exchange_rate: parseFloat(exchangeRate) || 1.0,
          description: description.trim(),
          category,
          split_type: splitType,
          split_data: payloadSplitData,
          expense_date: expenseDateStr,
          receipt_url: receiptUrl,
        });
        toast.success("Expense updated!");
      } else {
        await onSubmit({
          amount: numAmount,
          base_amount: parseFloat(baseAmount) || numAmount,
          exchange_rate: parseFloat(exchangeRate) || 1.0,
          description: description.trim(),
          category,
          paid_by: paidBy,
          split_type: splitType,
          split_data: payloadSplitData,
          expense_date: expenseDateStr,
          currency,
          receipt_url: receiptUrl,
        });
        toast.success("Expense added!");
      }
      handleClose();
    } catch (error: any) {
      toast.error(error.response?.data?.error || `Failed to ${isEditMode ? "update" : "add"} expense`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSplitDataChange = (userId: number, field: keyof SplitDataItem, value: string) => {
    const numValue = parseFloat(value) || 0;
    setSplitData(prev => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        [field]: numValue
      }
    }));
  };

  const toggleSplitMember = (userId: number) => {
    if (category === "stay") return; // stay splits are always auto-calculated across all members
    setSelectedSplitUsers(prev =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const getInitials = (name: string) => {
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(val) => val ? setIsOpen(true) : handleClose()}>
        {showTrigger && !isEditMode && (
          <DialogTrigger asChild>
            <Button size="lg" className="fixed bottom-24 right-4 h-16 w-16 rounded-full shadow-2xl bg-primary hover:bg-primary/90 text-white lg:bottom-12 lg:right-12 z-40 transition-all hover:scale-110 active:scale-95 group">
              <span className="material-symbols-outlined text-3xl transition-transform group-hover:rotate-90">add</span>
            </Button>
          </DialogTrigger>
        )}
        <DialogContent className="max-w-md w-[95%] p-0 overflow-hidden border-none shadow-2xl rounded-[3rem] bg-white dark:bg-slate-900">
          <div className="max-h-[90vh] overflow-y-auto px-8 py-10 scrollbar-hide">
            <DialogHeader className="flex flex-row items-center justify-between pb-10">
              <div className="flex items-center gap-3">
                <div className="size-10 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined material-symbols-filled">
                    {isEditMode ? "edit" : "add_circle"}
                  </span>
                </div>
                <DialogTitle className="text-3xl font-extrabold tracking-tight serif-title italic">
                  {isEditMode ? "edit expense" : "add expense"}
                </DialogTitle>
              </div>
              <button onClick={handleClose} className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Amount & Currency Section */}
              <div className="space-y-4 rounded-[2.5rem] bg-gray-50 dark:bg-black/20 p-8 border border-gray-100 dark:border-white/5 shadow-inner">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2 block px-1">
                      {currency === 'USD' ? 'total amount' : `amount in ${currency}`}
                    </Label>
                    <div className="flex items-center">
                      <span className="text-5xl font-black text-gray-300 mr-3 tracking-tighter">$</span>
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={currency === 'USD' ? amount : baseAmount}
                        onChange={(e) => {
                          if (currency === 'USD') setAmount(e.target.value);
                          else setBaseAmount(e.target.value);
                        }}
                        className="text-5xl font-black h-16 p-0 border-none bg-transparent focus-visible:ring-0 text-gray-900 dark:text-white tracking-tighter"
                        disabled={isLoading}
                      />
                    </div>
                    {currency !== 'USD' && (
                      <div className="mt-4 flex items-center gap-3 animate-in slide-in-from-top-2 duration-300">
                        <div className="flex items-center gap-1.5 bg-accent-lime text-black px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm">
                          <span>Total:</span>
                          <span>${amount} USD</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-white dark:bg-gray-800 px-3 py-1.5 rounded-full border border-gray-100 dark:border-gray-700 text-[10px] font-bold">
                          <span className="material-symbols-outlined text-[14px]">language</span>
                          <span className="text-gray-400 uppercase tracking-widest">Rate:</span>
                          <input
                            type="number"
                            value={exchangeRate}
                            onChange={(e) => setExchangeRate(e.target.value)}
                            className="w-12 bg-transparent border-none focus:ring-0 p-0 font-black"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger className="w-24 h-14 rounded-2xl border-none bg-white dark:bg-gray-800 shadow-xl font-black text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-none shadow-2xl">
                      {currencies.map(c => (
                        <SelectItem key={c.code} value={c.code} className="rounded-xl font-bold">{c.code}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Description & Category */}
              <div className="grid grid-cols-1 gap-6">
                {category === "stay" ? (
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">Stay Details</Label>
                    {(selectedStayOptionId || isEditMode) ? (
                      (() => {
                        const opt = selectedStayOptionId
                          ? stayOptions.find((o: any) => o.id === selectedStayOptionId)
                          : null;
                        return (
                          <div className="rounded-[2rem] border border-gray-100 dark:border-white/5 bg-white dark:bg-black/20 p-6 shadow-sm">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-lg font-black text-gray-900 dark:text-white truncate tracking-tight uppercase">
                                  {opt?.title || description || "Selected stay"}
                                </p>
                                <div className="flex flex-col gap-1 mt-3">
                                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                    <span className="material-symbols-outlined text-xs">event_available</span>
                                    Date Set from stay {opt?.check_in_date ? `(${opt.check_in_date})` : ""}
                                  </p>
                                  <p className="text-[10px] font-bold text-primary uppercase tracking-widest flex items-center gap-2">
                                    <span className="material-symbols-outlined text-xs">auto_awesome</span>
                                    Auto-calculated • Equal Split
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()
                    ) : (
                      <>
                        <Select
                          value={selectedStayOptionId?.toString() ?? ""}
                          onValueChange={(v) => setSelectedStayOptionId(parseInt(v))}
                          disabled={!tripId || isLoading}
                        >
                          <SelectTrigger className="rounded-[2rem] border-gray-100 dark:border-white/5 bg-white dark:bg-black/20 h-16 px-6 font-bold shadow-sm">
                            <SelectValue placeholder={tripId ? "Choose a stay..." : "Unavailable"} />
                          </SelectTrigger>
                          <SelectContent className="rounded-2xl border-none shadow-2xl">
                            {stayOptions.length === 0 ? (
                              <SelectItem value="0" disabled>No stays found</SelectItem>
                            ) : (
                              stayOptions.map((o: any) => (
                                <SelectItem key={o.id} value={o.id.toString()} className="rounded-xl font-bold py-3">
                                  {o.title} • ${Number(o.price).toLocaleString()}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest px-1">
                          Auto-fills date, total, and distribution
                        </p>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Label htmlFor="description" className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">What was this for?</Label>
                    <Input
                      id="description"
                      placeholder="e.g. Dinner by the beach"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      disabled={isLoading}
                      className="rounded-[2rem] border-gray-100 dark:border-white/5 bg-white dark:bg-black/20 h-16 px-6 text-lg font-bold shadow-sm placeholder:text-gray-300"
                    />
                  </div>
                )}

                <div className="space-y-4">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">Category</Label>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((cat) => (
                      <Button
                        key={cat.value}
                        type="button"
                        variant={category === cat.value ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCategory(cat.value)}
                        className={cn(
                          "rounded-full h-11 px-6 border-gray-100 dark:border-white/5 transition-all text-[10px] font-black uppercase tracking-widest",
                          category === cat.value ? "bg-primary text-white shadow-xl shadow-primary/20 scale-105" : "bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
                        )}
                        disabled={isLoading}
                      >
                        <span className="material-symbols-outlined text-[18px] mr-2">
                          {cat.value === "stay" ? "home" : cat.value === "activity" ? "stars" : cat.value === "food" ? "restaurant" : cat.value === "transport" ? "directions_car" : "more_horiz"}
                        </span>
                        {cat.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Advanced Splitting Section */}
              <div className="space-y-6 pt-6 border-t border-gray-100 dark:border-white/5">
                <div className="flex items-center justify-between px-1">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[18px]">group</span>
                    Who is sharing this?
                  </Label>
                </div>

                {category === "stay" ? (
                  <div className="mt-2 space-y-3 bg-gray-50 dark:bg-black/20 p-6 rounded-[2.5rem] border border-gray-100 dark:border-white/5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <span className="material-symbols-outlined text-xs text-primary">numbers</span>
                        Automatic Equal Split
                      </span>
                      <span className="text-[10px] font-black text-primary px-3 py-1 bg-primary/10 rounded-full">
                        {selectedSplitUsers.length} members
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {members.map((member) => (
                        <div
                          key={member.user_id}
                          className="flex items-center justify-between text-[11px] bg-white dark:bg-slate-800/80 rounded-2xl px-4 py-3 border border-gray-50 dark:border-white/5 shadow-sm"
                        >
                          <span className="truncate font-extrabold uppercase tracking-tight">{member.user_name}</span>
                          <span className="font-black text-primary ml-2">
                            ${((parseFloat(amount) || 0) / Math.max(members.length, 1)).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <Tabs value={splitType} onValueChange={(v) => setSplitType(v as any)} className="w-full">
                    <TabsList className="grid grid-cols-4 w-full rounded-2xl p-1 bg-gray-100 dark:bg-gray-800 h-14 mb-6">
                      <TabsTrigger value="equally" className="rounded-xl data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm text-[10px] font-black uppercase tracking-widest">
                        Equal
                      </TabsTrigger>
                      <TabsTrigger value="shares" className="rounded-xl data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm text-[10px] font-black uppercase tracking-widest">
                        Shares
                      </TabsTrigger>
                      <TabsTrigger value="percentage" className="rounded-xl data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm text-[10px] font-black uppercase tracking-widest">
                        %
                      </TabsTrigger>
                      <TabsTrigger value="exact" className="rounded-xl data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm text-[10px] font-black uppercase tracking-widest">
                        $
                      </TabsTrigger>
                    </TabsList>

                    <div className="space-y-3 bg-gray-50 dark:bg-black/20 p-6 rounded-[2.5rem] border border-gray-100 dark:border-white/5">
                      {members.map((member) => (
                        <div key={member.user_id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-white/5 last:border-0 group">
                          <div className="flex items-center gap-4">
                            <Checkbox
                              id={`split-${member.user_id}`}
                              checked={selectedSplitUsers.includes(member.user_id)}
                              onCheckedChange={() => toggleSplitMember(member.user_id)}
                              className="w-6 h-6 rounded-lg"
                            />
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10 ring-2 ring-white dark:ring-gray-800 shadow-sm transition-transform group-hover:scale-110">
                                <AvatarFallback className="text-[10px] font-black bg-primary/10 text-primary">{getInitials(member.user_name)}</AvatarFallback>
                              </Avatar>
                              <Label htmlFor={`split-${member.user_id}`} className="text-xs font-black uppercase tracking-widest cursor-pointer text-gray-700 dark:text-gray-300">
                                {member.user_name}
                              </Label>
                            </div>
                          </div>

                          {selectedSplitUsers.includes(member.user_id) && splitType !== 'equally' && (
                            <div className="flex items-center gap-2 w-28 animate-in slide-in-from-right-4 duration-300">
                              {splitType === 'shares' && (
                                <div className="relative w-full">
                                  <Input
                                    type="number"
                                    placeholder="1"
                                    value={splitData[member.user_id]?.share_count || 1}
                                    onChange={(e) => handleSplitDataChange(member.user_id, 'share_count', e.target.value)}
                                    className="h-10 text-right text-xs rounded-xl font-black bg-white dark:bg-gray-800 border-none shadow-sm pr-10"
                                  />
                                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[8px] font-black text-gray-400 uppercase">shr</span>
                                </div>
                              )}
                              {splitType === 'percentage' && (
                                <div className="relative w-full">
                                  <Input
                                    type="number"
                                    placeholder="0"
                                    value={splitData[member.user_id]?.percentage || 0}
                                    onChange={(e) => handleSplitDataChange(member.user_id, 'percentage', e.target.value)}
                                    className="h-10 text-right text-xs rounded-xl font-black bg-white dark:bg-gray-800 border-none shadow-sm pr-10"
                                  />
                                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-400">%</span>
                                </div>
                              )}
                              {splitType === 'exact' && (
                                <div className="relative w-full">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-400">$</span>
                                  <Input
                                    type="number"
                                    placeholder="0.00"
                                    value={splitData[member.user_id]?.amount || 0}
                                    onChange={(e) => handleSplitDataChange(member.user_id, 'amount', e.target.value)}
                                    className="h-10 text-right text-xs rounded-xl font-black bg-white dark:bg-gray-800 border-none shadow-sm pl-7 pr-3"
                                  />
                                </div>
                              )}
                            </div>
                          )}

                          {selectedSplitUsers.includes(member.user_id) && splitType === 'equally' && (
                            <span className="text-[10px] font-black text-primary px-3 py-1 bg-primary/5 rounded-full uppercase tracking-tighter animate-in fade-in duration-300">
                              ${((parseFloat(amount) || 0) / selectedSplitUsers.length).toFixed(2)}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </Tabs>
                )}
              </div>

              {/* Extras: Date, Receipt, Payer */}
              <div className="space-y-6 pt-6 border-t border-gray-100 dark:border-white/5">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">Expense Date</Label>
                    {category === "stay" ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full h-14 rounded-2xl justify-start text-[10px] font-black uppercase tracking-widest border-gray-100 dark:border-white/5 bg-gray-50/50 cursor-default opacity-80"
                        disabled
                      >
                        <span className="material-symbols-outlined mr-3 text-primary text-[20px]">calendar_month</span>
                        {expenseDate ? format(expenseDate, "MMM d, yyyy") : "Auto-set"}
                      </Button>
                    ) : (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full h-14 rounded-2xl justify-start text-[10px] font-black uppercase tracking-widest border-gray-100 dark:border-white/5 bg-white dark:bg-black/20 hover:bg-gray-50 dark:hover:bg-gray-800 shadow-sm">
                            <span className="material-symbols-outlined mr-3 text-primary text-[20px]">calendar_month</span>
                            {expenseDate ? format(expenseDate, "MMM d, yyyy") : "Today"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 border-none shadow-2xl rounded-2xl" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={expenseDate}
                            onSelect={setExpenseDate}
                            disabled={isDateDisabled}
                            initialFocus
                            className="rounded-2xl"
                          />
                        </PopoverContent>
                      </Popover>
                    )}
                  </div>

                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">Paid By</Label>
                    <Select value={paidBy?.toString()} onValueChange={(v) => setPaidBy(parseInt(v))}>
                      <SelectTrigger className="w-full h-14 rounded-2xl border-none bg-white dark:bg-black/20 shadow-sm font-black text-[10px] uppercase tracking-widest px-6">
                        <SelectValue placeholder="Who paid?" />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-none shadow-2xl">
                        {members.map(m => (
                          <SelectItem key={m.user_id} value={m.user_id.toString()} className="rounded-xl font-bold py-3 uppercase tracking-tighter text-[10px]">{m.user_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">Receipt Evidence</Label>
                  <div className="flex items-center gap-4 mt-1">
                    {receiptUrl ? (
                      <div className="flex-1 flex items-center justify-between bg-primary/5 border border-primary/10 rounded-[2rem] h-16 px-6 animate-in fade-in zoom-in-95 duration-500 shadow-sm">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white">
                            <span className="material-symbols-outlined text-[16px]">receipt_long</span>
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-tight truncate max-w-[150px]">{receiptUrl.split('/').pop()}</span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setReceiptUrl("")}
                          className="h-10 w-10 rounded-full hover:bg-destructive/10 hover:text-destructive text-gray-400 transition-colors"
                        >
                          <span className="material-symbols-outlined text-[20px]">close</span>
                        </Button>
                      </div>
                    ) : (
                      <div className="flex-1">
                        <label className="flex items-center gap-4 cursor-pointer group">
                          <div className="flex-1 flex items-center justify-center gap-3 h-16 rounded-[2rem] border-2 border-dashed border-gray-100 dark:border-white/5 hover:border-primary/40 hover:bg-primary/5 transition-all bg-white dark:bg-black/20 shadow-sm">
                            {isUploading ? (
                              <Loader2 className="h-5 w-5 animate-spin text-primary" />
                            ) : (
                              <span className="material-symbols-outlined text-gray-300 group-hover:text-primary transition-colors">upload_file</span>
                            )}
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 group-hover:text-primary/70">
                              {isUploading ? "Uploading..." : "Click to add receipt"}
                            </span>
                          </div>
                          <input type="file" className="hidden" onChange={handleFileUpload} accept="image/*,application/pdf" disabled={isUploading || isLoading} />
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-4 pt-10">
                <Button
                  type="submit"
                  className="w-full h-16 rounded-[2rem] bg-black dark:bg-white text-white dark:text-black hover:opacity-90 font-black uppercase tracking-[0.4em] text-[10px] shadow-2xl transition-all active:scale-95 disabled:opacity-50"
                  disabled={isLoading || isUploading}
                >
                  {isLoading ? "Processing..." : (isEditMode ? "Update Transaction" : "Record Transaction")}
                </Button>
                {isEditMode && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleClose}
                    className="w-full h-12 rounded-full text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-destructive hover:bg-destructive/5 transition-all"
                  >
                    Cancel Edit
                  </Button>
                )}
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
