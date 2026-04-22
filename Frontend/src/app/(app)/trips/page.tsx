"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
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
import { FullscreenDatePicker } from "@/components/ui/fullscreen-date-picker";
import { DateRange } from "react-day-picker";
import { FullPageLoader } from "@/components/common/FullPageLoader";
import { SafeImage } from "@/components/common/SafeImage";
import { cn } from "@/lib/utils";

function TripCard({ trip }: { trip: Trip }) {
  const now = new Date();
  const start = new Date(trip.start_date);
  const end = new Date(trip.end_date);

  const isPast = trip.is_past;
  const isPresent = now >= start && now <= end;
  const hasEnded = now > end;

  const status = isPast || hasEnded ? "past" : isPresent ? "active" : "upcoming";
  const statusColor = (status === "past")
    ? "bg-slate-100 dark:bg-slate-800 text-slate-500"
    : isPresent
      ? "bg-green-500 text-white"
      : "bg-white text-[#1877F2]";

  return (
    <div className={cn(
      "bg-white dark:bg-slate-900 rounded-[1.5rem] overflow-hidden group border transition-all h-full flex flex-col",
      isPast
        ? "border-slate-100 dark:border-slate-800 opacity-80"
        : "border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl"
    )}>
      <div className="relative h-56 overflow-hidden">
        <SafeImage
          src={trip.image_url || "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=2070&auto=format&fit=crop"}
          alt={trip.name}
          className="group-hover:scale-110 transition-transform duration-700"
        />
        <div className={`absolute top-4 right-4 ${statusColor} px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm flex items-center gap-1.5`}>
          {isPast && <span className="material-symbols-outlined text-[10px]">lock</span>}
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

  const searchParams = useSearchParams();
  useEffect(() => {
    setMounted(true);

    const modal = searchParams.get("modal");
    if (modal === "new-trip") setCreateDialogOpen(true);
    if (modal === "join-trip") setJoinDialogOpen(true);
    if (modal === "date-conflict") setShowOverlapDialog(true);
  }, [searchParams]);

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
      google_maps_url: mapsUrl,
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
      <div className="max-w-7xl mx-auto px-6 pt-10 pb-12 md:pt-16 md:pb-24">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <h1 className="text-2xl md:text-6xl font-extrabold tracking-tight mb-2 serif-title italic truncate max-w-full">Welcome back, {user?.name}!</h1>
            <p className="text-slate-500 font-bold tracking-widest text-[10px] md:text-s">
              {isLoading ? "loading your adventures..." : `You have ${trips?.length || 0} trip${(trips?.length || 0) !== 1 ? 's' : ''} coming up. Ready for your next adventure?`}
            </p>
          </div>
          <div className="flex gap-2">
            <Dialog
              open={createDialogOpen}
              onOpenChange={setCreateDialogOpen}
              urlKey="modal"
              urlValue="new-trip"
            >
              <DialogTrigger asChild>
                <button className="md:hidden bg-primary text-white px-4 py-2 rounded-full font-bold text-xs flex items-center gap-2 shadow-lg shadow-primary/20">
                  <span className="material-symbols-outlined text-base">add</span>
                  new trip
                </button>
              </DialogTrigger>
              <DialogContent className="fixed inset-0 translate-x-0 translate-y-0 w-full h-full max-w-none p-0 overflow-hidden border-none rounded-none shadow-none bg-white dark:bg-slate-900 sm:left-[50%] sm:top-[50%] sm:translate-x-[-50%] sm:translate-y-[-50%] sm:w-[95%] sm:max-w-md sm:h-auto sm:rounded-[3rem] sm:shadow-2xl flex flex-col">
                <div className="bg-primary p-6 pt-[calc(1.5rem+env(safe-area-inset-top,0px))] text-white text-center shrink-0">
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
                  <div className="space-y-1.5 pt-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Trip Dates</Label>
                    <FullscreenDatePicker
                      date={dateRange}
                      onSelect={setDateRange}
                      title="Select Trip Dates"
                      confirmText="Confirm Dates"
                      trigger={
                        <button className="w-full h-14 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center px-4 gap-3 text-sm font-bold text-slate-600 dark:text-slate-300 transition-all active:scale-[0.98]">
                          <span className="material-symbols-outlined text-lg">calendar_today</span>
                          {dateRange?.from ? (
                            dateRange.to ? `${format(dateRange.from, "MMM d")} - ${format(dateRange.to, "MMM d, yyyy")}` : format(dateRange.from, "MMM d, yyyy")
                          ) : (
                            "Select start and end dates"
                          )}
                        </button>
                      }
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

            <Dialog
              open={joinDialogOpen}
              onOpenChange={setJoinDialogOpen}
              urlKey="modal"
              urlValue="join-trip"
            >
              <DialogTrigger asChild>
                <button className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 px-4 py-2 md:px-8 md:py-4 rounded-full font-bold text-xs md:text-lg flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm">
                  <span className="material-symbols-outlined text-base md:text-xl outline-icon">group_add</span>
                  join trip
                </button>
              </DialogTrigger>
              <DialogContent className="fixed inset-0 translate-x-0 translate-y-0 w-full h-full max-w-none p-0 overflow-hidden border-none rounded-none shadow-none bg-white dark:bg-slate-900 sm:left-[50%] sm:top-[50%] sm:translate-x-[-50%] sm:translate-y-[-50%] sm:w-[95%] sm:max-w-md sm:h-auto sm:rounded-[3rem] sm:shadow-2xl flex flex-col">
                <div className="bg-primary p-6 pt-[calc(1.5rem+env(safe-area-inset-top,0px))] text-white text-center shrink-0">
                  <h2 className="text-2xl font-black italic serif-title">Join a Trip</h2>
                </div>
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
                <div className="lg:col-span-2 bg-white/10 rounded-2xl p-2.5 border border-white/10 focus-within:bg-white/20 transition-all h-full">
                  <label className="block text-[7px] font-black uppercase tracking-widest text-blue-100 mb-0.5 opacity-70">Dates</label>
                  <FullscreenDatePicker
                    date={dateRange}
                    onSelect={setDateRange}
                    title="Select Trip Dates"
                    confirmText="Save Dates"
                    trigger={
                      <button type="button" className="w-full bg-transparent border-none p-0 text-white placeholder:text-white/30 focus:ring-0 font-extrabold text-xs items-center flex gap-2 h-full">
                        <span className="material-symbols-outlined text-xs">calendar_today</span>
                        {dateRange?.from ? (
                          dateRange.to ? `${format(dateRange.from, "MMM d")} - ${format(dateRange.to, "MMM d")}` : format(dateRange.from, "MMM d")
                        ) : (
                          "Select dates"
                        )}
                      </button>
                    }
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
            <div>
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-6 flex items-center gap-3">
                <span className="h-px w-8 bg-primary/20"></span>
                Active Adventures
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                {[...trips]
                  .filter(t => new Date() <= new Date(t.end_date))
                  .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
                  .map(trip => (
                    <TripCard key={trip.id} trip={trip} />
                  ))}
              </div>
              {trips.filter(t => new Date() <= new Date(t.end_date)).length === 0 && (
                <div className="p-12 text-center bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No active trips. Time to plan something new!</p>
                </div>
              )}
            </div>

            {trips.some(t => new Date() > new Date(t.end_date)) && (
              <div className="pt-8 border-t border-slate-100 dark:border-slate-800">
                {!showAllTrips ? (
                  <button
                    onClick={() => setShowAllTrips(true)}
                    className="w-full group py-10 flex flex-col items-center justify-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-[2.5rem] transition-all border border-dashed border-slate-200 dark:border-slate-800"
                  >
                    <span className="material-symbols-outlined text-4xl text-slate-300 group-hover:text-primary transition-colors">history</span>
                    <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 group-hover:text-primary transition-colors">View Past Trips</span>
                  </button>
                ) : (
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center justify-between">
                      <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-3">
                        <span className="h-px w-8 bg-slate-200"></span>
                        Past Journeys
                      </h2>
                      <button
                        onClick={() => setShowAllTrips(false)}
                        className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline transition-all"
                      >
                        Hide Past
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 opacity-60 hover:opacity-100 transition-opacity">
                      {[...trips]
                        .filter(t => new Date() > new Date(t.end_date))
                        .sort((a, b) => new Date(b.end_date).getTime() - new Date(a.end_date).getTime())
                        .map(trip => (
                          <TripCard key={trip.id} trip={trip} />
                        ))}
                    </div>
                  </div>
                )}
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
        <Dialog
          open={showOverlapDialog}
          onOpenChange={setShowOverlapDialog}
          urlKey="modal"
          urlValue="date-conflict"
        >
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
      </div>

      {/* Footer / Credits */}
      <footer className="max-w-7xl mx-auto px-6 py-20 border-t border-slate-100 dark:border-slate-800 text-center">
        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">
          © {new Date().getFullYear()} absolutrip — made for the modern explorer
        </p>
      </footer>
    </div>
  );
}
