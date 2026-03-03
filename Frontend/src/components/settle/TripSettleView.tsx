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
  const { mutate: mutateExpenses } = useExpenses(tripId);

  const currentUserId = user?.id;

  const currentUserBalance = useMemo(
    () => balances.find((b) => b.user_id === currentUserId),
    [balances, currentUserId]
  );
  const youAreOwed = Math.max(currentUserBalance?.balance ?? 0, 0);
  const youOwe = Math.max(-(currentUserBalance?.balance ?? 0), 0);

  const whoOwesYou = useMemo<PersonAmount[]>(() => {
    if (!currentUserId) return [];
    const byUser = new Map<number, PersonAmount>();
    for (const s of settlements) {
      if (s.to_user_id !== currentUserId) continue;
      const prev = byUser.get(s.from_user_id);
      byUser.set(s.from_user_id, {
        user_id: s.from_user_id,
        user_name: s.from_user_name,
        amount: (prev?.amount ?? 0) + s.amount,
      });
    }
    return [...byUser.values()].sort((a, b) => b.amount - a.amount);
  }, [settlements, currentUserId]);

  const whoYouOwe = useMemo<PersonAmount[]>(() => {
    if (!currentUserId) return [];
    const byUser = new Map<number, PersonAmount>();
    for (const s of settlements) {
      if (s.from_user_id !== currentUserId) continue;
      const prev = byUser.get(s.to_user_id);
      byUser.set(s.to_user_id, {
        user_id: s.to_user_id,
        user_name: s.to_user_name,
        amount: (prev?.amount ?? 0) + s.amount,
      });
    }
    return [...byUser.values()].sort((a, b) => b.amount - a.amount);
  }, [settlements, currentUserId]);

  // --- Settle dialog ---
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [fromUserId, setFromUserId] = useState<number | null>(currentUserId ?? null);
  const [toUserId, setToUserId] = useState<number | null>(null);
  const [date, setDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [submitting, setSubmitting] = useState(false);

  const resetDialog = () => {
    setAmount("");
    setFromUserId(currentUserId ?? null);
    setToUserId(null);
    setDate(format(new Date(), "yyyy-MM-dd"));
  };

  const openPrefilled = (opts: { from?: number | null; to?: number | null; amount?: number }) => {
    setFromUserId(opts.from ?? (currentUserId ?? null));
    setToUserId(opts.to ?? null);
    setAmount(opts.amount ? opts.amount.toFixed(2) : "");
    setOpen(true);
  };

  const handleRecordSettlement = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if (!fromUserId || !toUserId || fromUserId === toUserId) {
      toast.error("Select payer and receiver");
      return;
    }

    try {
      setSubmitting(true);
      await expensesApi.settle(tripId, {
        amount: amt,
        from_user_id: fromUserId,
        to_user_id: toUserId,
        date,
      });
      toast.success("Settlement recorded");
      setOpen(false);
      resetDialog();
      await Promise.all([mutateSettle(), mutateExpenses()]);
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to record settlement");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-full bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100">
      {/* Header */}
      <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md flex items-center justify-between px-4 lg:px-8 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary">account_balance_wallet</span>
          <h2 className="text-lg font-bold tracking-tight">Settle Balances</h2>
        </div>
        <div className="flex items-center gap-3">
          <button className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors relative">
            <span className="material-symbols-outlined">notifications</span>
            <span className="absolute top-2 right-2 size-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-900" />
          </button>
          <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 mx-1" />
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">
              {getInitials(user?.name || "You")}
            </div>
            <span className="text-sm font-semibold hidden md:block">{user?.name || "You"}</span>
          </div>
        </div>
      </header>

      {/* Page Content */}
      <div className="p-4 lg:p-8 max-w-5xl mx-auto w-full pb-24 lg:pb-8">
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Settle Balances
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Record payments and clear debts with your group
            </p>
          </div>
          <button
            className="bg-primary text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all w-full md:w-auto"
            onClick={() => {
              // Default to “you owe” first if present; else open blank
              if (currentUserId && whoYouOwe[0]) {
                openPrefilled({ from: currentUserId, to: whoYouOwe[0].user_id, amount: whoYouOwe[0].amount });
              } else {
                setOpen(true);
              }
            }}
          >
            <span className="material-symbols-outlined">handshake</span>
            Settle Up
          </button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col gap-1">
            <span className="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wider">
              You are owed
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-emerald-600">{money(youAreOwed)}</span>
              <span className="text-emerald-500 text-xs font-bold bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full">
                Net
              </span>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col gap-1">
            <span className="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wider">
              You owe
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-rose-600">{money(youOwe)}</span>
              <span className="text-rose-500 text-xs font-bold bg-rose-50 dark:bg-rose-500/10 px-2 py-0.5 rounded-full">
                Net
              </span>
            </div>
          </div>
        </div>

        {/* Balances List */}
        <div className="space-y-10">
          {/* Who owes you */}
          <section>
            <div className="flex items-center justify-between mb-4 px-2">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-500">trending_up</span>
                Who owes you
              </h3>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                {whoOwesYou.length} {whoOwesYou.length === 1 ? "Person" : "People"}
              </span>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
              {whoOwesYou.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  {isLoading ? "Loading…" : "No one owes you right now"}
                </div>
              ) : (
                whoOwesYou.map((p) => (
                  <button
                    key={p.user_id}
                    className="w-full text-left flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                    onClick={() => openPrefilled({ from: p.user_id, to: currentUserId ?? null, amount: p.amount })}
                  >
                    <div className="flex items-center gap-4">
                      <div className="size-12 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center border-2 border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-100 font-bold">
                        {getInitials(p.user_name)}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white">{p.user_name}</h4>
                        <p className="text-xs text-slate-500">Tap to record payment</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-slate-500">owes you</p>
                      <p className="text-xl font-extrabold text-emerald-600">{money(p.amount)}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </section>

          {/* Who you owe */}
          <section>
            <div className="flex items-center justify-between mb-4 px-2">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-rose-500">trending_down</span>
                Who you owe
              </h3>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                {whoYouOwe.length} {whoYouOwe.length === 1 ? "Person" : "People"}
              </span>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
              {whoYouOwe.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  {isLoading ? "Loading…" : "You don’t owe anyone right now"}
                </div>
              ) : (
                whoYouOwe.map((p) => (
                  <button
                    key={p.user_id}
                    className="w-full text-left flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                    onClick={() => openPrefilled({ from: currentUserId ?? null, to: p.user_id, amount: p.amount })}
                  >
                    <div className="flex items-center gap-4">
                      <div className="size-12 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center border-2 border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-100 font-bold">
                        {getInitials(p.user_name)}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white">{p.user_name}</h4>
                        <p className="text-xs text-slate-500">Tap to record payment</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-slate-500">you owe</p>
                      <p className="text-xl font-extrabold text-rose-600">{money(p.amount)}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </section>

          {/* Settling Flow (Informational UI) */}
          <section className="bg-primary/5 dark:bg-primary/10 rounded-2xl p-6 sm:p-8 border border-primary/10 flex flex-col items-center text-center">
            <div className="bg-white dark:bg-slate-800 size-16 rounded-full flex items-center justify-center shadow-lg text-primary mb-4">
              <span className="material-symbols-outlined text-3xl">qr_code_2</span>
            </div>
            <h3 className="text-xl font-bold mb-2">Need to settle fast?</h3>
            <p className="text-slate-600 dark:text-slate-400 max-w-md mb-6">
              Record a cash payment or share your payment link to clear balances instantly with your travel companions.
            </p>
            <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-3 w-full">
              <button
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-5 py-2.5 rounded-lg text-sm font-bold shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors w-full sm:w-auto"
                onClick={() => setOpen(true)}
              >
                Record Cash Payment
              </button>
              <button
                className="bg-primary text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-md hover:bg-primary/90 transition-all w-full sm:w-auto"
                onClick={() => toast.message("Link requests coming soon")}
              >
                Request via Link
              </button>
            </div>
          </section>
        </div>

        {/* Record Settlement Dialog */}
        <Dialog
          open={open}
          onOpenChange={(v) => {
            setOpen(v);
            if (!v) resetDialog();
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">handshake</span>
                Record Settlement
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Payer</Label>
                  <Select
                    value={fromUserId?.toString() ?? ""}
                    onValueChange={(v) => setFromUserId(Number(v))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select payer" />
                    </SelectTrigger>
                    <SelectContent>
                      {members.map((m) => (
                        <SelectItem key={m.user_id} value={m.user_id.toString()}>
                          {m.user_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Receiver</Label>
                  <Select
                    value={toUserId?.toString() ?? ""}
                    onValueChange={(v) => setToUserId(Number(v))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select receiver" />
                    </SelectTrigger>
                    <SelectContent>
                      {members.map((m) => (
                        <SelectItem key={m.user_id} value={m.user_id.toString()}>
                          {m.user_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Amount</Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
              </div>

              {fromUserId && toUserId && fromUserId === toUserId && (
                <p className="text-sm text-rose-600 font-semibold">Payer and receiver must be different.</p>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  className={cn("flex-1", submitting && "opacity-80")}
                  onClick={handleRecordSettlement}
                  disabled={submitting}
                >
                  {submitting ? "Recording…" : "Record"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

