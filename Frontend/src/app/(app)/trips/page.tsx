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
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import { FullPageLoader } from "@/components/common/FullPageLoader";

function TripCard({ trip }: { trip: Trip }) {
  const now = new Date();
  const start = new Date(trip.start_date);
  const end = new Date(trip.end_date);

  const isPast = now > end;
  const isPresent = now >= start && now <= end;

  const status = isPast ? "past" : isPresent ? "active" : "upcoming";
  const statusColor = isPast
    ? "bg-slate-100 dark:bg-slate-800 text-slate-500"
    : isPresent
      ? "bg-green-500 text-white"
      : "bg-white text-[#1877F2]";

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] overflow-hidden group border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all h-full flex flex-col">
      <div className="relative h-56 overflow-hidden">
        <img
          alt={trip.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
          src={trip.image_url || "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=2070&auto=format&fit=crop"}
        />
        <div className={`absolute top-4 right-4 ${statusColor} px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm`}>
          {status}
        </div>
      </div>
      <div className="p-6 flex flex-col flex-1">
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2 gap-2">
            <h3 className="text-2xl font-bold tracking-tight line-clamp-1">{trip.name}</h3>
            <div className="flex items-center gap-2 shrink-0">
              {trip.google_maps_url && (
                <a href={trip.google_maps_url} target="_blank" rel="noreferrer" className="flex items-center text-[#1877F2] hover:text-blue-600 transition-colors" title="View Location">
                  <span className="material-symbols-outlined text-[20px]">location_on</span>
                </a>
              )}
            </div>
          </div>
          <div className="flex items-center text-slate-500 text-sm">

            <span>{format(new Date(trip.start_date), "MMM dd")} - {format(new Date(trip.end_date), "MMM dd, yyyy")}</span>
          </div>
        </div>

        <div className="mt-auto pt-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {(trip.members?.slice(0, 3) || []).map((m, i) => (
                <div key={i} className="w-8 h-8 rounded-full bg-[#eef5fd] dark:bg-slate-800 border-2 border-white dark:border-slate-900 flex items-center justify-center text-[#1877F2] dark:text-blue-400 text-xs font-bold">
                  {(m.user_name || m.user_email || "J").charAt(0).toUpperCase()}
                </div>
              ))}
              {(!trip.members || trip.members.length === 0) && (
                <div className="w-8 h-8 rounded-full bg-[#eef5fd] dark:bg-slate-800 border-2 border-white dark:border-slate-900 flex items-center justify-center text-[#1877F2] dark:text-blue-400 text-xs font-bold">
                  J
                </div>
              )}
            </div>
            <span className="text-sm font-medium text-slate-400">
              {trip.members?.length || 1} Member{(trip.members?.length || 1) !== 1 ? 's' : ''}
            </span>
          </div>
          <Link
            href={`/trip/${trip.id}/explore`}
            className="text-[#1877F2] font-black text-sm flex items-center gap-1 group-hover:gap-2 transition-all  tracking-tight"
          >
            View Trip
            <span className="material-symbols-outlined text-lg outline-icon">arrow_forward</span>
          </Link>
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
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [mapsUrl, setMapsUrl] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Join Trip dialog state
  const [joinCode, setJoinCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
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
      start_date: dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : "",
      end_date: dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : "",
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
      setDateRange(undefined);
      setMapsUrl("");
      setPendingTripData(null);
      setShowOverlapDialog(false);
      setCreateDialogOpen(false);
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
      <main className="max-w-7xl mx-auto px-6 pt-4 pb-12 md:py-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <h1 className="text-2xl md:text-6xl font-extrabold tracking-tight mb-2 serif-title italic truncate max-w-full">Welcome back, {user?.name}!</h1>
            <p className="text-slate-500 font-bold tracking-widest text-[10px] md:text-s">
              {isLoading ? "loading your adventures..." : `You have ${trips?.length || 0} trips coming up. Ready for your next adventure?`}
            </p>
          </div>
          <div className="flex gap-2">
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <button className="md:hidden bg-primary text-white px-4 py-2 rounded-full font-bold text-xs flex items-center gap-2 shadow-lg shadow-primary/20">
                  <span className="material-symbols-outlined text-base">add</span>
                  new trip
                </button>
              </DialogTrigger>
              <DialogContent className="dark:bg-slate-900 border-none rounded-[2rem] p-0 overflow-hidden max-w-sm">
                <div className="bg-primary p-6 text-white text-center">
                  <h2 className="text-2xl font-black italic serif-title">Plan a new trip</h2>
                </div>
                <div className="p-6 space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Trip Name</Label>
                    <Input
                      placeholder="Goa Trip"
                      className="rounded-xl h-12"
                      value={tripName}
                      onChange={(e) => setTripName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Location Link</Label>
                    <Input
                      placeholder="Google Maps URL"
                      className="rounded-xl h-12"
                      value={mapsUrl}
                      onChange={(e) => setMapsUrl(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Trip Dates</Label>
                    <DatePickerWithRange
                      date={dateRange}
                      setDate={setDateRange}
                      placeholder="Select start and end dates"
                    />
                  </div>
                  <button
                    onClick={() => handleCreateTrip()}
                    disabled={isCreating}
                    className="w-full bg-primary text-white py-4 rounded-xl font-bold text-lg shadow-xl shadow-primary/10 hover:opacity-90 transition-all"
                  >
                    {isCreating ? "creating..." : "Create Trip ✨"}
                  </button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
              <DialogTrigger asChild>
                <button className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 px-4 py-2 md:px-8 md:py-4 rounded-full font-bold text-xs md:text-lg flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm">
                  <span className="material-symbols-outlined text-base md:text-xl outline-icon">group_add</span>
                  join trip
                </button>
              </DialogTrigger>
              <DialogContent className="dark:bg-slate-900 border-none rounded-[2rem] p-0 overflow-hidden max-w-sm">
                <DialogHeader className="bg-primary p-6 text-white text-center">
                  <DialogTitle className="text-2xl font-black italic serif-title">Join a Trip</DialogTitle>
                </DialogHeader>
                <div className="p-6 space-y-6">
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
                    {isJoining ? "joining..." : "Request access"}
                  </button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Quick Create Section */}
        <section className="mb-16 hidden md:block">
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
                <div className="lg:col-span-2 bg-white/10 rounded-2xl p-2.5 border border-white/10 focus-within:bg-white/20 transition-all">
                  <label className="block text-[7px] font-black uppercase tracking-widest text-blue-100 mb-0.5 opacity-70">Dates</label>
                  <DatePickerWithRange
                    date={dateRange}
                    setDate={setDateRange}
                    className="grid gap-0"
                    buttonClassName="h-auto border-none p-0 bg-transparent text-white placeholder:text-white/30 focus:ring-0 font-extrabold text-xs items-center"
                    placeholder="Select dates"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="bg-accent-lime text-black font-extrabold px-10 py-5 md:px-6 md:py-0 rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-black/10 text-sm uppercase tracking-widest"
                >
                  {isCreating ? "..." : "create"}
                </button>
              </form>
            </div>
          </div>
        </section>

        {/* Trips Grid */}
        {isLoading ? (
          <FullPageLoader />
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
