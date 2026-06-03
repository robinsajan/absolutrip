"use client";

import { useParams, useSearchParams, useRouter, usePathname } from "next/navigation";
import { TripLedgerView } from "@/components/ledger/TripLedgerView";
import { TripSettleView } from "@/components/settle/TripSettleView";
import { cn } from "@/lib/utils";

export default function LedgerPage() {
  const params = useParams();
  const tripId = params.tripId as string;
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const tab = searchParams.get("tab") || "transactions";

  const setTab = (t: string) => {
    router.push(`${pathname}?tab=${t}`);
  };

  return (
    <div>
      <div className="sticky top-0 z-40 bg-[#fbfbf8] dark:bg-background-dark pt-4 pb-2 px-6 border-b border-slate-100 dark:border-slate-800">
        <div className="max-w-7xl mx-auto grid grid-cols-2 gap-2">
          <button
            onClick={() => setTab("settle")}
            className={cn(
              "py-3 rounded-full text-xs font-black uppercase tracking-widest transition-all",
              tab === "settle"
                ? "bg-black dark:bg-white text-white dark:text-black shadow-lg"
                : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
            )}
          >
            Settle Up
          </button>
          <button
            onClick={() => setTab("transactions")}
            className={cn(
              "py-3 rounded-full text-xs font-black uppercase tracking-widest transition-all",
              tab === "transactions"
                ? "bg-black dark:bg-white text-white dark:text-black shadow-lg"
                : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
            )}
          >
            Transactions
          </button>
        </div>
      </div>
      {tab === "settle" ? <TripSettleView tripId={tripId} /> : <TripLedgerView tripId={tripId} onSettleUpClick={() => setTab("settle")} />}
    </div>
  );
}
