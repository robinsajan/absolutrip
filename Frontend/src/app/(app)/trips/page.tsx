"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import { useTrips, useAuth } from "@/lib/hooks";
import { trips as tripsApi } from "@/lib/api/endpoints";
import type { Trip } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function TripCard({ trip }: { trip: Trip }) {
  const isPast = new Date(trip.end_date) < new Date();
  const status = isPast ? "past" : "planning";
  const statusColor = isPast
    ? "bg-slate-100 dark:bg-slate-800 text-slate-500"
    : "bg-white/90 dark:bg-slate-900/90 backdrop-blur-md text-slate-800 dark:text-slate-200";

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] overflow-hidden group border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all h-full flex flex-col">
      <div className="relative h-60 overflow-hidden">
        <img
          alt={trip.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
          src={trip.image_url || "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=2070&auto=format&fit=crop"}
        />
        <div className={`absolute top-5 right-5 ${statusColor} px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm`}>
          {status}
        </div>
      </div>
      <div className="p-10 flex flex-col flex-1">
        <div className="mb-8">
          <h3 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-2 line-clamp-1">{trip.name}</h3>
          <p className="text-slate-500 font-medium text-sm flex items-center gap-1.5 focus:outline-none">
            <span className="material-symbols-outlined text-base outline-icon">location_on</span>
            {trip.google_maps_url ? "View Location" : "TBD"}
          </p>
        </div>
        <div className="mt-auto flex items-center justify-between pt-8 border-t border-slate-100 dark:border-slate-800">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              {trip.members?.length || 0} member{(trip.members?.length || 0) !== 1 ? 's' : ''}
            </span>
            <span className="text-sm font-bold text-slate-600 dark:text-slate-400">
              {format(new Date(trip.start_date), "MMM dd")} - {format(new Date(trip.end_date), "MMM dd")}
            </span>
          </div>
          <div className="text-right">
            <Link
              href={`/trip/${trip.id}/explore`}
              className="text-primary font-black text-sm flex items-center justify-end gap-1.5 group-hover:gap-2.5 transition-all uppercase tracking-tight"
            >
              open
              <span className="material-symbols-outlined text-lg outline-icon">arrow_forward</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TripsPage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { trips, isLoading, mutate } = useTrips();
  const [mounted, setMounted] = useState(false);

  // Create Trip form state
  const [tripName, setTripName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [mapsUrl, setMapsUrl] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Join Trip dialog state
  const [joinCode, setJoinCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [showAllTrips, setShowAllTrips] = useState(false);
  const [showOverlapDialog, setShowOverlapDialog] = useState(false);
  const [pendingTripData, setPendingTripData] = useState<any>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const handleCreateTrip = async (e?: React.FormEvent, force: boolean = false) => {
    if (e) e.preventDefault();
    const data = pendingTripData || {
      name: tripName.trim(),
      start_date: startDate,
      end_date: endDate,
      google_maps_url: mapsUrl.trim(),
    };

    if (!data.name || !data.start_date || !data.end_date) {
      toast.error("Please fill in trip name and dates");
      return;
    }

    // Overlap Check (Bonus)
    if (!force) {
      const newStart = new Date(data.start_date);
      const newEnd = new Date(data.end_date);
      const overlap = trips?.find(t => {
        const tStart = new Date(t.start_date);
        const tEnd = new Date(t.end_date);
        return (newStart <= tEnd && newEnd >= tStart);
      });

      if (overlap) {
        setPendingTripData(data);
        setShowOverlapDialog(true);
        return;
      }
    }

    setIsCreating(true);
    try {
      const result = await tripsApi.create(data);
      toast.success("Trip created!");
      mutate();
      setTripName("");
      setStartDate("");
      setEndDate("");
      setMapsUrl("");
      setPendingTripData(null);
      setShowOverlapDialog(false);
      router.push(`/trip/${result.trip.id}/explore`);
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to create trip");
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinTrip = async () => {
    if (!joinCode.trim()) {
      toast.error("Please enter an invite code");
      return;
    }
    setIsJoining(true);
    try {
      const result = await tripsApi.join(joinCode.trim());
      if (result.status === "approved") {
        toast.success(`Joined ${result.trip?.name}!`);
        mutate();
        setJoinDialogOpen(false);
        setJoinCode("");
        router.push(`/trip/${result.trip?.id}/explore`);
      } else {
        toast.info(result.message);
        setJoinDialogOpen(false);
        setJoinCode("");
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Invalid invite code");
    } finally {
      setIsJoining(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="bg-[#fbfbf9] dark:bg-background-dark text-slate-900 dark:text-slate-100 min-h-screen">
      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-2 serif-title italic">my trips</h1>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">
              {isLoading ? "loading your adventures..." : `${trips?.length || 0} trips in records`}
            </p>
          </div>
          <div className="flex gap-3">
            <Dialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
              <DialogTrigger asChild>
                <button className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 px-8 py-4 rounded-full font-bold text-lg flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm">
                  <span className="material-symbols-outlined text-xl outline-icon">group_add</span>
                  join trip
                </button>
              </DialogTrigger>
              <DialogContent className="dark:bg-slate-900 border-none rounded-[2rem]">
                <DialogHeader>
                  <DialogTitle className="text-3xl font-extrabold tracking-tight serif-title">Join a Trip</DialogTitle>
                </DialogHeader>
                <div className="space-y-6 pt-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Invite Code</Label>
                    <Input
                      placeholder="Paste your 16-character code"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value)}
                      className="rounded-2xl h-14 font-mono text-center tracking-widest text-lg"
                    />
                  </div>
                  <button
                    onClick={handleJoinTrip}
                    disabled={isJoining}
                    className="w-full bg-primary text-white py-5 rounded-2xl font-bold text-lg hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
                  >
                    {isJoining ? "joining..." : "request access"}
                  </button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Quick Create Section */}
        <section className="mb-16">
          <div className="bg-primary rounded-[3rem] p-8 md:p-10 text-white relative overflow-hidden shadow-2xl shadow-primary/10">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/5 rounded-full blur-[120px] -mr-48 -mt-48"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <p className="text-blue-200 font-bold uppercase tracking-widest text-[8px] mb-2">quick start</p>
                  <h2 className="text-3xl font-extrabold tracking-tight">Plan a new trip</h2>
                </div>
              </div>

              <form onSubmit={handleCreateTrip} className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-7 gap-2 bg-white/5 p-2 rounded-[2rem] border border-white/10">
                <div className="lg:col-span-2 bg-white/10 rounded-2xl p-2.5 border border-white/10 focus-within:bg-white/20 transition-all">
                  <label className="block text-[7px] font-black uppercase tracking-widest text-blue-100 mb-0.5 opacity-70">Trip name</label>
                  <input
                    className="w-full bg-transparent border-none p-0 text-white placeholder:text-white/30 focus:ring-0 font-extrabold text-xs"
                    placeholder="Goa Trip"
                    type="text"
                    value={tripName}
                    onChange={(e) => setTripName(e.target.value)}
                  />
                </div>
                <div className="lg:col-span-2 bg-white/10 rounded-2xl p-2.5 border border-white/10 focus-within:bg-white/20 transition-all">
                  <label className="block text-[7px] font-black uppercase tracking-widest text-blue-100 mb-0.5 opacity-70">Location Link</label>
                  <input
                    className="w-full bg-transparent border-none p-0 text-white placeholder:text-white/30 focus:ring-0 font-extrabold text-xs"
                    placeholder="Google Maps URL"
                    type="text"
                    value={mapsUrl}
                    onChange={(e) => setMapsUrl(e.target.value)}
                  />
                </div>
                <div className="bg-white/10 rounded-2xl p-2.5 border border-white/10 focus-within:bg-white/20 transition-all">
                  <label className="block text-[7px] font-black uppercase tracking-widest text-blue-100 mb-0.5 opacity-70">Start</label>
                  <input
                    className="w-full bg-transparent border-none p-0 text-white placeholder:text-white/30 focus:ring-0 font-extrabold text-xs [color-scheme:dark]"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="bg-white/10 rounded-2xl p-2.5 border border-white/10 focus-within:bg-white/20 transition-all">
                  <label className="block text-[7px] font-black uppercase tracking-widest text-blue-100 mb-0.5 opacity-70">End</label>
                  <input
                    className="w-full bg-transparent border-none p-0 text-white placeholder:text-white/30 focus:ring-0 font-extrabold text-xs [color-scheme:dark]"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={startDate}
                  />
                </div>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="bg-accent-lime text-black font-extrabold px-6 rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-black/10 text-sm"
                >
                  {isCreating ? "..." : "create"}
                </button>
              </form>
            </div>
          </div>
        </section>

        {/* Trips Grid */}
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-4">
            <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Curating your adventures...</p>
          </div>
        ) : trips && trips.length > 0 ? (
          <div className="space-y-12">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
              {[...trips]
                .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
                .slice(0, showAllTrips ? trips.length : 3)
                .map(trip => (
                  <TripCard key={trip.id} trip={trip} />
                ))}
            </div>

            {trips.length > 3 && (
              <div className="flex justify-center pt-8">
                <button
                  onClick={() => setShowAllTrips(!showAllTrips)}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-primary px-10 py-4 rounded-full font-black uppercase tracking-widest text-xs transition-all flex items-center gap-2 shadow-sm"
                >
                  {showAllTrips ? "Show fewer" : `Show all ${trips.length} trips`}
                  <span className="material-symbols-outlined text-lg">
                    {showAllTrips ? "expand_less" : "expand_more"}
                  </span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-20 text-center border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-8">
              <span className="material-symbols-outlined text-5xl text-slate-300 outline-icon">beach_access</span>
            </div>
            <h3 className="text-3xl font-extrabold mb-4">No trips found</h3>
            <p className="text-slate-500 font-medium max-w-sm mx-auto mb-10 text-lg">Your passport looks a bit lonely. Start planning a new journey above!</p>
          </div>
        )}

        {/* Overlap Warning Dialog */}
        <Dialog open={showOverlapDialog} onOpenChange={setShowOverlapDialog}>
          <DialogContent className="dark:bg-slate-900 border-none rounded-[2rem] max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black text-amber-500 flex items-center gap-2">
                <span className="material-symbols-outlined">warning</span>
                Sync Conflict
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6 pt-4">
              <p className="text-slate-500 font-medium">
                Oops! Looks like you already have a trip scheduled during these dates. Do you want to create it anyway?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowOverlapDialog(false)}
                  className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-500 py-4 rounded-2xl font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleCreateTrip(undefined, true)}
                  className="flex-1 bg-primary text-white py-4 rounded-2xl font-bold shadow-lg shadow-primary/20 transition-all"
                >
                  Yes, Continue
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </main>

      {/* Footer / Credits */}
      <footer className="max-w-7xl mx-auto px-6 py-20 border-t border-slate-100 dark:border-slate-800 text-center">
        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">
          © {new Date().getFullYear()} absolutrip — made for the modern explorer
        </p>
      </footer>
    </div>
  );
}
