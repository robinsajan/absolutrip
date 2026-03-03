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
}: ExpenseFormProps) {
  const [open, setOpen] = useState(false);
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
      const price = Number(opt.price || 0);
      let total = price;

      if (opt.is_per_person) total *= memberCount;

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

      setOpen(true);
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
    setPaidBy(currentUserId);
    setSplitType('equally');
    setSelectedSplitUsers(members.map(m => m.user_id));
    setSplitData({});
    setExpenseDate(undefined);
    setCurrency('USD');
    setReceiptUrl("");
    setSelectedStayOptionId(null);
  };

  const handleClose = () => {
    setOpen(false);
    if (isEditMode && onCancelEdit) {
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
      <Dialog open={open} onOpenChange={(isOpen) => isOpen ? setOpen(true) : handleClose()}>
        {!isEditMode && (
          <DialogTrigger asChild>
            <Button size="lg" className="fixed bottom-24 right-4 h-14 w-14 rounded-full shadow-lg lg:bottom-8 z-40">
              <Plus className="h-6 w-6" />
            </Button>
          </DialogTrigger>
        )}
        <DialogContent className="max-w-md w-[95%] p-0 overflow-hidden border-none shadow-2xl rounded-[2.5rem]">
          <div className="max-h-[85vh] overflow-y-auto px-6 py-8 scrollbar-hide">
            <DialogHeader className="flex flex-row items-center justify-between pb-6">
              <DialogTitle className="text-2xl font-serif font-bold italic tracking-tight">
                {isEditMode ? "Edit Expense" : "Add Expense"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Amount & Currency Section */}
              <div className="space-y-4 rounded-3xl bg-slate-50 dark:bg-slate-800/50 p-6 border border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 block px-1">
                      {currency === 'USD' ? 'Total Amount' : `Amount in ${currency}`}
                    </Label>
                    <div className="flex items-center">
                      <span className="text-4xl font-light text-slate-300 mr-2">$</span>
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={currency === 'USD' ? amount : baseAmount}
                        onChange={(e) => {
                          if (currency === 'USD') setAmount(e.target.value);
                          else setBaseAmount(e.target.value);
                        }}
                        className="text-4xl font-black h-12 p-0 border-none bg-transparent focus-visible:ring-0 text-slate-900 dark:text-white"
                        disabled={isLoading}
                      />
                    </div>
                    {currency !== 'USD' && (
                      <div className="mt-2 flex items-center gap-3 text-xs animate-in slide-in-from-top-1 duration-200">
                        <div className="flex items-center gap-1.5 bg-primary/5 text-primary px-2 py-1 rounded-lg border border-primary/10">
                          <span className="font-bold">Total:</span>
                          <span className="font-black">${amount} USD</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                          <Globe className="h-3 w-3 text-slate-400" />
                          <span className="text-slate-500">Rate:</span>
                          <input
                            type="number"
                            value={exchangeRate}
                            onChange={(e) => setExchangeRate(e.target.value)}
                            className="w-16 bg-transparent border-none focus:ring-0 p-0 font-bold"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger className="w-20 rounded-xl border-none bg-white dark:bg-slate-900 shadow-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map(c => (
                        <SelectItem key={c.code} value={c.code}>{c.code}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Description & Category */}
              <div className="grid grid-cols-1 gap-4">
                {category === "stay" ? (
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Stay</Label>
                    {(selectedStayOptionId || isEditMode) ? (
                      (() => {
                        const opt = selectedStayOptionId
                          ? stayOptions.find((o: any) => o.id === selectedStayOptionId)
                          : null;
                        return (
                          <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-black/20 p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="font-bold text-slate-900 dark:text-white truncate">
                                  {opt?.title || description || "Selected stay"}
                                </p>
                                <p className="text-xs text-slate-500 mt-1">
                                  Date auto-set from stay {opt?.check_in_date ? `(${opt.check_in_date})` : ""}
                                </p>
                                <p className="text-xs text-slate-500 mt-1">
                                  Total auto-calculated • Split equally across all members
                                </p>
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
                          <SelectTrigger className="rounded-2xl border-slate-100 dark:border-slate-800 bg-white dark:bg-black/20 h-14">
                            <SelectValue placeholder={tripId ? "Choose a stay option…" : "Stay options unavailable"} />
                          </SelectTrigger>
                          <SelectContent>
                            {stayOptions.length === 0 ? (
                              <SelectItem value="0" disabled>
                                No stay options found
                              </SelectItem>
                            ) : (
                              stayOptions.map((o: any) => (
                                <SelectItem key={o.id} value={o.id.toString()}>
                                  {o.title} • ${Number(o.price).toLocaleString()}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-slate-500">
                          Selecting a stay auto-fills the date, total, and split.
                        </p>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-sm font-semibold">Description</Label>
                    <Input
                      id="description"
                      placeholder="What was this for?"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      disabled={isLoading}
                      className="rounded-2xl border-slate-100 dark:border-slate-800 bg-white dark:bg-black/20 h-14"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Category</Label>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((cat) => (
                      <Button
                        key={cat.value}
                        type="button"
                        variant={category === cat.value ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCategory(cat.value)}
                        className={cn("rounded-full h-10 px-4", category === cat.value && "shadow-md")}
                        disabled={isLoading}
                      >
                        {cat.icon}
                        <span className="ml-2 text-xs font-semibold">{cat.label}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Advanced Splitting Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    Split Details
                  </Label>
                </div>

                {category === "stay" ? (
                  <div className="mt-2 space-y-3 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-3xl border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                        <Hash className="h-4 w-4 text-primary" />
                        Auto split (equally)
                      </span>
                      <span className="text-xs font-bold text-slate-500">
                        {selectedSplitUsers.length} members
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {members.map((member) => (
                        <div
                          key={member.user_id}
                          className="flex items-center justify-between text-xs bg-white/80 dark:bg-slate-800/60 rounded-lg px-3 py-2 border border-slate-100 dark:border-slate-800"
                        >
                          <span className="truncate font-medium">{member.user_name}</span>
                          <span className="font-bold text-primary ml-2">
                            ${((parseFloat(amount) || 0) / Math.max(members.length, 1)).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <Tabs value={splitType} onValueChange={(v) => setSplitType(v as any)} className="w-full">
                    <TabsList className="grid grid-cols-4 w-full rounded-2xl p-1 bg-slate-100 dark:bg-slate-900 h-12">
                      <TabsTrigger value="equally" className="rounded-xl data-[state=active]:shadow-sm">
                        <Hash className="h-3 w-3 mr-1" /> Equally
                      </TabsTrigger>
                      <TabsTrigger value="shares" className="rounded-xl data-[state=active]:shadow-sm">
                        <Users className="h-3 w-3 mr-1" /> Shares
                      </TabsTrigger>
                      <TabsTrigger value="percentage" className="rounded-xl data-[state=active]:shadow-sm">
                        <Percent className="h-3 w-3 mr-1" /> %
                      </TabsTrigger>
                      <TabsTrigger value="exact" className="rounded-xl data-[state=active]:shadow-sm">
                        <Calculator className="h-3 w-3 mr-1" /> $
                      </TabsTrigger>
                    </TabsList>

                  <div className="mt-4 space-y-3 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-3xl border border-slate-100 dark:border-slate-800">
                    {members.map((member) => (
                      <div key={member.user_id} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            id={`split-${member.user_id}`}
                            checked={selectedSplitUsers.includes(member.user_id)}
                            onCheckedChange={() => toggleSplitMember(member.user_id)}
                          />
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-[10px]">{getInitials(member.user_name)}</AvatarFallback>
                          </Avatar>
                          <Label htmlFor={`split-${member.user_id}`} className="text-xs font-medium cursor-pointer">
                            {member.user_name}
                          </Label>
                        </div>

                        {selectedSplitUsers.includes(member.user_id) && splitType !== 'equally' && (
                          <div className="flex items-center gap-2 w-24">
                            {splitType === 'shares' && (
                              <Input
                                type="number"
                                placeholder="1"
                                value={splitData[member.user_id]?.share_count || 1}
                                onChange={(e) => handleSplitDataChange(member.user_id, 'share_count', e.target.value)}
                                className="h-8 text-right text-xs rounded-lg"
                              />
                            )}
                            {splitType === 'percentage' && (
                              <div className="relative">
                                <Input
                                  type="number"
                                  placeholder="0"
                                  value={splitData[member.user_id]?.percentage || 0}
                                  onChange={(e) => handleSplitDataChange(member.user_id, 'percentage', e.target.value)}
                                  className="h-8 text-right text-xs rounded-lg pr-5 w-20"
                                />
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">%</span>
                              </div>
                            )}
                            {splitType === 'exact' && (
                              <div className="relative">
                                <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">$</span>
                                <Input
                                  type="number"
                                  placeholder="0.00"
                                  value={splitData[member.user_id]?.amount || 0}
                                  onChange={(e) => handleSplitDataChange(member.user_id, 'amount', e.target.value)}
                                  className="h-8 text-right text-xs rounded-lg pl-4 w-24"
                                />
                              </div>
                            )}
                          </div>
                        )}

                        {selectedSplitUsers.includes(member.user_id) && splitType === 'equally' && (
                          <span className="text-[10px] font-bold text-slate-400">
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
              <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">Expense Date</Label>
                    {category === "stay" ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full h-12 rounded-2xl justify-start text-xs font-medium cursor-default"
                        disabled
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                        {expenseDate ? format(expenseDate, "MMM d, yyyy") : "Select a stay to set date"}
                      </Button>
                    ) : (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full h-12 rounded-2xl justify-start text-xs font-medium">
                            <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                            {expenseDate ? format(expenseDate, "MMM d, yyyy") : "Today"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={expenseDate}
                            onSelect={setExpenseDate}
                            disabled={isDateDisabled}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">Paid By</Label>
                    <Select value={paidBy?.toString()} onValueChange={(v) => setPaidBy(parseInt(v))}>
                      <SelectTrigger className="w-full h-12 rounded-2xl bg-white dark:bg-slate-900 border-slate-100">
                        <SelectValue placeholder="Who paid?" />
                      </SelectTrigger>
                      <SelectContent>
                        {members.map(m => (
                          <SelectItem key={m.user_id} value={m.user_id.toString()}>{m.user_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">Receipt (Image or PDF)</Label>
                  <div className="flex items-center gap-2 mt-1">
                    {receiptUrl ? (
                      <div className="flex-1 flex items-center justify-between bg-primary/5 border border-primary/20 rounded-2xl h-12 px-4 animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-2 min-w-0">
                          <Receipt className="h-4 w-4 text-primary shrink-0" />
                          <span className="text-xs font-medium truncate">{receiptUrl.split('/').pop()}</span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-full"
                          onClick={() => setReceiptUrl("")}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex-1 relative">
                        <Input
                          type="file"
                          accept="image/*,application/pdf"
                          onChange={handleFileUpload}
                          className="hidden"
                          id="receipt-upload"
                          disabled={isUploading || isLoading}
                        />
                        <Label
                          htmlFor="receipt-upload"
                          className={cn(
                            "flex items-center gap-2 justify-center w-full h-12 rounded-2xl border border-dashed cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-xs font-medium",
                            isUploading ? "opacity-50 cursor-not-allowed border-primary" : "border-slate-200 dark:border-slate-700 hover:border-primary/50",
                            (isLoading) && "pointer-events-none opacity-50"
                          )}
                        >
                          {isUploading ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <Upload className="h-4 w-4 text-slate-400" />}
                          {isUploading ? "Uploading..." : "Upload Receipt"}
                        </Label>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-6">
                <Button type="button" variant="ghost" className="flex-1 rounded-2xl h-14 font-bold text-slate-500" onClick={handleClose}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-1 rounded-2xl h-14 font-bold shadow-xl shadow-primary/20" disabled={isLoading}>
                  {isLoading ? "Saving..." : isEditMode ? "Update" : "Add Expense"}
                </Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
