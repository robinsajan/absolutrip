"use client";

import { useMemo, useState, useEffect } from "react";
import { useSearchParams, usePathname } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import { useAuth, useExpenses, useSettlement, useTripMembers } from "@/lib/hooks";
import { expenses as expensesApi } from "@/lib/api/endpoints";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ExpenseForm } from "@/components/ledger/ExpenseForm";
import { useAppStore } from "@/lib/store";

function money(n: number) {
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
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

type PersonAmount = { user_id: number; user_name: string; amount: number };

export function TripSettleView({ tripId }: { tripId: string }) {
  const { user } = useAuth();
  const { members } = useTripMembers(tripId);
  const { balances, settlements, isLoading, mutate: mutateSettle } = useSettlement(tripId);
  const { expenses, mutate: mutateExpenses } = useExpenses(tripId);

  const { activeTrip } = useAppStore();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [fromUserId, setFromUserId] = useState<number | null>(null);
  const [toUserId, setToUserId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any>(null);

  // Sync state with URL
  useEffect(() => {
    const modal = searchParams.get("modal");
    if (modal === "record-settlement") {
      setOpen(true);
    }
  }, [searchParams]);

  const myId = user?.id;

  // Business logic moved to the top and memoized
  const owedByMe = useMemo(() => settlements.filter((s) => s.from_user_id === myId), [settlements, myId]);
  const owesMe = useMemo(() => settlements.filter((s) => s.to_user_id === myId), [settlements, myId]);

  const totalOwedByMe = useMemo(() => owedByMe.reduce((sum, s) => sum + s.amount, 0), [owedByMe]);
  const totalOwedToMe = useMemo(() => owesMe.reduce((sum, s) => sum + s.amount, 0), [owesMe]);

  const settledWithMe = useMemo(() =>
    balances.filter(
      (b) =>
        b.user_id !== myId &&
        !owedByMe.some((s) => s.to_user_id === b.user_id) &&
        !owesMe.some((s) => s.from_user_id === b.user_id)
    ), [balances, myId, owedByMe, owesMe]);

  const settlementHistory = useMemo(() => {
    return (expenses || []).filter((e) => e.category === "settlement");
  }, [expenses]);

  const handleRecordSettlement = async (s?: any) => {
    const amt = s ? s.amount : Number(amount);
    const from = s ? s.from_user_id : fromUserId;
    const to = s ? s.to_user_id : toUserId;

    if (!amt || !from || !to) {
      toast.error("Invalid settlement data");
      return;
    }

    try {
      setSubmitting(true);
      await expensesApi.settle(tripId, {
        amount: amt,
        from_user_id: from,
        to_user_id: to,
        date: format(new Date(), "yyyy-MM-dd"),
      });
      toast.success("Settlement recorded!");
      setOpen(false);
      await Promise.all([mutateSettle(), mutateExpenses()]);
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to record settlement");
    } finally {
      setSubmitting(false);
    }
  };

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

  const getFontSize = (amt: number) => {
    const len = Math.round(amt).toString().length;
    if (len > 6) return "text-xl md:text-2xl";
    if (len > 4) return "text-2xl md:text-3xl";
    return "text-3xl md:text-4xl";
  };

  if (isLoading) {
    return (
      <div className="p-20 text-center animate-pulse">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4" />
        <p className="text-xs font-black uppercase tracking-widest text-gray-400">Loading ledger...</p>
      </div>
    );
  }

  return (
    <div className="bg-[#fcfcf9] dark:bg-[#0a0a0b] min-h-screen text-slate-900 dark:text-slate-100">
      <main className="max-w-2xl mx-auto px-6 py-10 space-y-10">
        {/* Simple Summary Header */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-500">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 text-center truncate">You need to pay</p>
            <h2 className={cn("font-black text-center tracking-tight text-slate-900 dark:text-white transition-all duration-300", getFontSize(totalOwedByMe))}>
              ₹{Math.round(totalOwedByMe).toLocaleString('en-IN')}
            </h2>
          </div>
          <div className="bg-slate-100/50 dark:bg-slate-800/50 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-700">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 text-center truncate">You get back</p>
            <h2 className={cn("font-black text-center tracking-tight text-slate-900 dark:text-white transition-all duration-300", getFontSize(totalOwedToMe))}>
              ₹{Math.round(totalOwedToMe).toLocaleString('en-IN')}
            </h2>
          </div>
        </div>

        <div className="space-y-12 pb-48 animate-in fade-in slide-in-from-bottom-4 duration-1000">
          {/* Section: Owed by Me */}
          {owedByMe.length > 0 && (
            <section>
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6 px-2">You need to pay</h3>
              <div className="space-y-4">
                {owedByMe.map((s, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-4 bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-50 dark:border-slate-800/50 group hover:shadow-md transition-all cursor-pointer"
                    onClick={() => {
                      setFromUserId(s.from_user_id);
                      setToUserId(s.to_user_id);
                      setAmount(s.amount.toString());
                      setOpen(true);
                    }}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-400 font-extrabold text-sm border-2 border-white dark:border-slate-800 shadow-inner">
                        {getInitials(s.to_user_name)}
                      </div>
                      <div>
                        <p className="font-extrabold text-sm tracking-tight">{s.to_user_name}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-[9px]">Awaiting settlement</p>
                      </div>
                    </div>
                    <span className="text-lg font-black text-slate-900 dark:text-white">₹{Math.round(s.amount).toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Section: Owes Me */}
          {owesMe.length > 0 && (
            <section>
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6 px-2">
                {owesMe.length} {owesMe.length === 1 ? "person will" : "people will"} pay you
              </h3>
              <div className="space-y-4">
                {owesMe.map((s, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-4 bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-50 dark:border-slate-800/50 group hover:shadow-md transition-all cursor-pointer"
                    onClick={() => {
                      setFromUserId(s.from_user_id);
                      setToUserId(s.to_user_id);
                      setAmount(s.amount.toString());
                      setOpen(true);
                    }}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-400 font-extrabold text-sm border-2 border-white dark:border-slate-800 shadow-inner">
                        {getInitials(s.from_user_name)}
                      </div>
                      <div>
                        <p className="font-extrabold text-sm tracking-tight">{s.from_user_name}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-[9px]">Pending Payment</p>
                      </div>
                    </div>
                    <span className="text-lg font-black text-slate-900 dark:text-white">₹{Math.round(s.amount).toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {owedByMe.length === 0 && owesMe.length === 0 ? (
            <section className="bg-emerald-50 border border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 p-8 rounded-3xl text-center shadow-sm">
              <span className="material-symbols-outlined text-4xl mb-2 text-emerald-500">task_alt</span>
              <p className="text-xs font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">You are all settled!</p>
            </section>
          ) : (
            settledWithMe.length > 0 && (
              <section>
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-6 px-2">Settled</h3>
                <div className="space-y-2">
                  {settledWithMe.map((b, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-900 dark:text-slate-100 font-extrabold text-xs">
                          {getInitials(b.user_name)}
                        </div>
                        <div>
                          <p className="font-bold text-sm tracking-tight text-slate-900 dark:text-white">{b.user_name}</p>
                          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{b.expenses_paid} total expenses</p>
                        </div>
                      </div>
                      <span className="text-xs font-black text-slate-900 dark:text-white">₹0</span>
                    </div>
                  ))}
                </div>
              </section>
            )
          )}

          {/* Section: Settlement History */}
          {settlementHistory.length > 0 && (
            <section>
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-6 px-2">Settlement History</h3>
              <div className="space-y-4">
                {settlementHistory.map((s, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-4 bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-50 dark:border-slate-800/50"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-extrabold text-sm border-2 border-white dark:border-slate-800 shadow-inner">
                        {getInitials(s.payer_name)}
                      </div>
                      <div>
                        <p className="font-extrabold text-sm tracking-tight">{s.payer_name}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-[9px]">
                          Paid {s.splits && s.splits.length > 0 && s.splits[0].user_id !== s.paid_by ? s.splits[0].user_name : "Someone"}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">₹{Math.round(s.amount).toLocaleString('en-IN')}</span>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                        {format(new Date(s.expense_date || s.created_at), "MMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

      </main>

      {/* Add Expense FAB */}
      <button
        onClick={() => {
          setEditingExpense(null);
          setShowAddExpense(true);
        }}
        style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 4.5rem)" }}
        className="fixed right-4  bg-black dark:bg-white dark:text-black text-white w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-transform active:scale-90 animate-in fade-in zoom-in duration-500"
        aria-label="Add expense"
      >
        <span className="material-symbols-outlined text-3xl">add</span>
      </button>

      <Dialog open={open} onOpenChange={setOpen} urlKey="modal" urlValue="record-settlement">
        <DialogContent className="max-w-md bg-white dark:bg-gray-900 rounded-[3rem] p-0 border-none shadow-2xl z-[300] overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-accent-lime/30 via-accent-lime to-accent-lime/30 opacity-50 z-50" />
          <div className="p-10 pt-[calc(3rem+env(safe-area-inset-top,0px))] pb-[calc(2.5rem+env(safe-area-inset-bottom,0px))]">
            <DialogHeader className="pb-8">
              <DialogTitle className="text-4xl font-black tracking-tighter lowercase italic animate-in fade-in slide-in-from-top-4 duration-500">record settlement</DialogTitle>
            </DialogHeader>

            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="bg-gray-50 dark:bg-gray-800 p-8 rounded-[2rem] border border-gray-100 dark:border-gray-800">
                <div className="flex items-center justify-between mb-6">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-white dark:bg-gray-700 rounded-xl flex items-center justify-center mb-2 mx-auto shadow-sm">
                      <span className="text-xs font-black">{getInitials(members?.find(m => m.user_id === fromUserId)?.user_name || "")}</span>
                    </div>
                    <p className="text-[10px] font-black uppercase text-gray-400">Payer</p>
                  </div>
                  <span className="material-symbols-outlined text-gray-200">arrow_forward</span>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-white dark:bg-gray-700 rounded-xl flex items-center justify-center mb-2 mx-auto shadow-sm">
                      <span className="text-xs font-black">{getInitials(members?.find(m => m.user_id === toUserId)?.user_name || "")}</span>
                    </div>
                    <p className="text-[10px] font-black uppercase text-gray-400">Receiver</p>
                  </div>
                </div>
                <div className="text-center pt-4">
                  <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Confirm Amount</p>
                  <h3 className="text-5xl font-black tracking-tighter text-gray-900 dark:text-white">₹{amount}</h3>
                </div>
              </div>

              <Button
                className="w-full h-16 rounded-[1.5rem] bg-accent-lime text-black font-black uppercase tracking-widest hover:opacity-90 shadow-xl shadow-accent-lime/10"
                onClick={() => handleRecordSettlement()}
                disabled={submitting}
              >
                {submitting ? "Processing..." : "Confirm & Settle"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ExpenseForm
        tripId={tripId}
        members={members}
        currentUserId={user?.id}
        onSubmit={async (data) => {
          setShowAddExpense(false);
          try {
            await handleAddExpense(data);
          } catch {
            setShowAddExpense(true);
          }
        }}
        onUpdate={handleUpdateExpense}
        editExpense={editingExpense}
        onCancelEdit={() => setEditingExpense(null)}
        tripStartDate={activeTrip?.start_date}
        tripEndDate={activeTrip?.end_date}
        open={showAddExpense}
        onOpenChange={(open) => {
          setShowAddExpense(open);
          if (!open) setEditingExpense(null);
        }}
        showTrigger={false}
      />
    </div>
  );
}
