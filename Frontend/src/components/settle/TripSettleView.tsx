"use client";

import { useMemo, useState } from "react";
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

function money(n: number) {
  return `$${n.toFixed(2)}`;
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

export function TripSettleView({ tripId }: { tripId: number }) {
  const { user } = useAuth();
  const { members } = useTripMembers(tripId);
  const { balances, settlements, isLoading, mutate: mutateSettle } = useSettlement(tripId);
  const { mutate: mutateExpenses } = useExpenses(mutateExpenseTripId(tripId));

  const totalOutstanding = useMemo(() =>
    settlements.reduce((sum, s) => sum + s.amount, 0),
    [settlements]
  );

  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [fromUserId, setFromUserId] = useState<number | null>(null);
  const [toUserId, setToUserId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

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

  if (isLoading) {
    return (
      <div className="p-20 text-center">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4" />
        <p className="text-xs font-black uppercase tracking-widest text-gray-400">Loading ledger...</p>
      </div>
    );
  }

  return (
    <div className="bg-[#fbfbf8] dark:bg-background-dark min-h-screen">
      <main className="max-w-7xl mx-auto px-6 py-12 space-y-12">
        {/* Dark Banner Header */}
        <div className="bg-slate-900 text-white p-12 rounded-[2.5rem] relative overflow-hidden flex flex-col justify-between min-h-[320px] shadow-2xl shadow-black/20 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="relative z-10">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Total Outstanding</p>
            <div className="flex items-start gap-4">
              <h2 className="text-7xl font-black tracking-tighter">${Math.round(totalOutstanding).toLocaleString()}</h2>
              <div className="mt-2 bg-accent-lime/10 text-accent-lime text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border border-accent-lime/20 flex items-center gap-1.5 backdrop-blur-md">
                <span className="material-symbols-outlined text-xs filled-icon">error</span>
                Pending
              </div>
            </div>
            <p className="text-sm text-slate-400 font-bold mt-2 uppercase tracking-widest">Across {settlements.length} active settlements</p>
          </div>

          <div className="flex flex-wrap gap-4 mt-8 relative z-10">
            <div className="bg-slate-800/50 backdrop-blur-md px-8 py-5 rounded-3xl flex flex-col gap-1 min-w-[140px] border border-white/5">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Settled</span>
              <span className="text-2xl font-black text-accent-lime">0</span>
            </div>
            <div className="bg-slate-800/50 backdrop-blur-md px-8 py-5 rounded-3xl flex flex-col gap-1 min-w-[140px] border border-white/5">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Pending</span>
              <span className="text-2xl font-black text-primary"> {settlements.length} </span>
            </div>
            <div className="bg-slate-800/50 backdrop-blur-md px-8 py-5 rounded-3xl flex flex-col gap-1 min-w-[140px] border border-white/5">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Members</span>
              <span className="text-2xl font-black text-white">{members.length}</span>
            </div>
          </div>

          <div className="absolute right-12 top-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none scale-[2]">
            <span className="material-symbols-outlined text-[240px] text-accent-lime font-light">account_balance_wallet</span>
          </div>
        </div>

        {/* Settlement Ledger */}
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
          <div className="flex items-center justify-between mb-8 px-4">
            <h3 className="text-[10px] font-black text-black dark:text-white uppercase tracking-[0.3em]">Who Owes Whom</h3>
            <button className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline px-4 py-2 bg-primary/5 rounded-full flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">history</span>
              Audit Logs
            </button>
          </div>

          <div className="space-y-4">
            {settlements.length === 0 ? (
              <div className="p-16 text-center bg-white dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm">
                <span className="material-symbols-outlined text-4xl text-gray-300 mb-4">check_circle</span>
                <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Everyone is settled up</p>
              </div>
            ) : (
              settlements.map((s, idx) => {
                const canSettle = user?.id === s.from_user_id;

                return (
                  <div
                    key={idx}
                    className={cn(
                      "bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] flex items-center justify-between border border-gray-50 dark:border-gray-800 transition-all",
                      canSettle ? "hover:shadow-2xl hover:scale-[1.01] group cursor-pointer" : "opacity-90"
                    )}
                    onClick={() => {
                      if (!canSettle) return;
                      setFromUserId(s.from_user_id);
                      setToUserId(s.to_user_id);
                      setAmount(s.amount.toString());
                      setOpen(true);
                    }}
                  >
                    <div className="flex flex-col md:flex-row md:items-center gap-6">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-purple-50 dark:bg-purple-900/20 rounded-2xl flex items-center justify-center text-purple-600 dark:text-purple-400 font-black text-lg shadow-sm">
                          {getInitials(s.from_user_name)}
                        </div>
                        <span className="font-extrabold text-gray-900 dark:text-white text-lg tracking-tight lowercase">{s.from_user_name}</span>
                      </div>

                      <div className="flex items-center justify-center w-8 h-8 md:w-12 md:h-12 bg-gray-50 dark:bg-gray-800 rounded-full">
                        <span className={cn("material-symbols-outlined text-gray-300 transition-colors text-sm md:text-base", canSettle && "group-hover:text-primary")}>arrow_forward</span>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-primary/5 dark:bg-primary/20 rounded-2xl flex items-center justify-center text-primary font-black text-lg shadow-sm">
                          {getInitials(s.to_user_name)}
                        </div>
                        <span className="font-extrabold text-gray-900 dark:text-white text-lg tracking-tight lowercase">{s.to_user_name}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 md:gap-10">
                      <div className="text-right hidden sm:block">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 lowercase">amount</p>
                        <span className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white tracking-tighter">${Math.round(s.amount).toLocaleString()}</span>
                      </div>
                      <button
                        className={cn(
                          "h-12 md:h-14 px-6 md:px-10 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all",
                          canSettle
                            ? "bg-primary text-white hover:opacity-90 hover:scale-105 active:scale-95 shadow-xl shadow-primary/20"
                            : "bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed"
                        )}
                        disabled={!canSettle}
                      >
                        {canSettle ? "settle" : "waiting"}
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Footer Banner */}
        <div className="bg-[#f3efff] dark:bg-[#1a152e] border border-[#e4d9ff] dark:border-[#352a5c] rounded-[2.5rem] p-10 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
          <div className="flex items-center gap-6 text-center md:text-left">
            <div className="w-16 h-16 bg-white dark:bg-gray-800 rounded-2xl flex items-center justify-center text-[#7c5cf2] shadow-sm transform -rotate-3 shrink-0">
              <span className="material-symbols-outlined filled-icon text-3xl">account_balance_wallet</span>
            </div>
            <div>
              <h4 className="font-black text-xl text-gray-900 dark:text-white tracking-tight lowercase">pay via upi / payment link</h4>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Coming soon — instant settlement integration</p>
            </div>
          </div>
          <span className="bg-purple-200 dark:bg-purple-900 text-purple-700 dark:text-purple-300 px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border border-purple-300/30 whitespace-nowrap">Available Soon</span>
        </div>
      </main>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-gray-900 rounded-[3rem] p-10 border-none shadow-2xl">
          <DialogHeader className="pb-8">
            <DialogTitle className="text-4xl font-black tracking-tighter lowercase italic">record settlement</DialogTitle>
          </DialogHeader>

          <div className="space-y-8">
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
                <h3 className="text-5xl font-black tracking-tighter text-gray-900 dark:text-white">${amount}</h3>
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
        </DialogContent>
      </Dialog>
    </div>
  );
}

function mutateExpenseTripId(tripId: number): number {
  return tripId;
}

