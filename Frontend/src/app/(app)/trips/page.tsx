"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
import { FullPageLoader } from "@/components/common/FullPageLoader";
import { SafeImage } from "@/components/common/SafeImage";
import { cn } from "@/lib/utils";
import { Plus, MapPin, Sparkles, ArrowRight } from "lucide-react";

function TripCard({ trip }: { trip: Trip }) {
  const now = new Date();
  const start = new Date(trip.start_date);
  const bonusEnd = new Date(trip.end_date);
  bonusEnd.setHours(23, 59, 59, 999);

  const isPast = trip.is_past;
  const isPresent = now >= start && now <= bonusEnd;
  const hasEnded = now >= bonusEnd;

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
            className="text-[#1877F2] font-black text-sm flex items-center gap-1 group-hover:gap-2 transition-all tracking-tight"
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

  // Join Trip dialog state
  const [joinCode, setJoinCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [showAllTrips, setShowAllTrips] = useState(false);

  const searchParams = useSearchParams();
  useEffect(() => {
    setMounted(true);
    const modal = searchParams.get("modal");
    if (modal === "join-trip") setJoinDialogOpen(true);
  }, [searchParams]);

  const handleLogout = async () => {
    await logout();
    router.push("/login");
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

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <h1 className="text-2xl md:text-6xl font-extrabold tracking-tight mb-2 serif-title italic truncate max-w-full">Welcome back, {user?.name}!</h1>
            <p className="text-slate-500 font-bold tracking-widest text-[10px] md:text-s">
              {isLoading ? "loading your adventures..." : (
                (() => {
                  const comingUpCount = trips?.filter(t => {
                    const expiry = new Date(t.end_date);
                    expiry.setHours(23, 59, 59, 999);
                    return new Date() < expiry;
                  }).length || 0;
                  return `You have ${comingUpCount} trip${comingUpCount !== 1 ? 's' : ''} coming up. Ready for your next adventure?`;
                })()
              )}
            </p>
          </div>

          <div className="flex gap-2">
            {/* Mobile: Link button to /trips/new */}
            <Link
              href="/trips/new"
              className="md:hidden bg-primary text-white px-4 py-2 rounded-full font-bold text-xs flex items-center gap-2 shadow-lg shadow-primary/20"
            >
              <Plus className="w-4 h-4" />
              new trip
            </Link>

            {/* Join trip dialog — same on both */}
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
              <DialogContent className="p-0 overflow-hidden border-none flex flex-col bg-white dark:bg-slate-900">
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

        {/* Desktop: Plan a New Trip CTA Banner */}
        <section className="mb-16 hidden md:block">
          <Link href="/trips/new" className="block group">
            <div className="bg-primary rounded-[3rem] p-8 md:p-10 text-white relative overflow-hidden shadow-2xl shadow-primary/10 transition-all group-hover:shadow-primary/25 group-hover:scale-[1.01]">
              <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/5 rounded-full blur-[120px] -mr-48 -mt-48 pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-white/3 rounded-full blur-[80px] -ml-24 -mb-24 pointer-events-none" />
              <div className="relative z-10 flex items-center justify-between">
                <div>
                  <p className="text-blue-200 font-bold uppercase tracking-widest text-[8px] mb-2 flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3" />
                    quick start
                  </p>
                  <h2 className="text-3xl font-extrabold tracking-tight mb-1">Plan a new trip</h2>
                  <p className="text-blue-200 text-sm font-medium opacity-80">
                    Name it, pin it on the map, set your dates — all in one flow
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  {/* Feature pills */}
                  <div className="hidden lg:flex flex-col gap-2 text-right">
                    <span className="inline-flex items-center gap-1.5 bg-white/10 border border-white/15 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest">
                      <MapPin className="w-3 h-3" /> Map Location
                    </span>
                    <span className="inline-flex items-center gap-1.5 bg-white/10 border border-white/15 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest">
                      <span className="material-symbols-outlined text-xs">calendar_today</span> Trip Dates
                    </span>
                    <span className="inline-flex items-center gap-1.5 bg-white/10 border border-white/15 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest">
                      <span className="material-symbols-outlined text-xs">group_add</span> Invite Friends
                    </span>
                  </div>

                  {/* Arrow CTA */}
                  <div className="w-16 h-16 bg-white/15 border border-white/20 rounded-2xl flex items-center justify-center group-hover:bg-accent-lime group-hover:border-transparent transition-all shadow-inner">
                    <ArrowRight className="w-7 h-7 group-hover:text-black transition-colors" />
                  </div>
                </div>
              </div>
            </div>
          </Link>
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
                  .filter(t => {
                    const bonusEnd = new Date(t.end_date);
                    bonusEnd.setHours(23, 59, 59, 999);
                    return new Date() < bonusEnd;
                  })
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

            {trips.some(t => {
              const bonusEnd = new Date(t.end_date);
              bonusEnd.setHours(23, 59, 59, 999);
              return new Date() >= bonusEnd;
            }) && (
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
                          .filter(t => {
                            const bonusEnd = new Date(t.end_date);
                            bonusEnd.setHours(23, 59, 59, 999);
                            return new Date() >= bonusEnd;
                          })
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
      </div>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-6 py-20 border-t border-slate-100 dark:border-slate-800 text-center">
        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">
          © {new Date().getFullYear()} absolutrip — made for the modern explorer
        </p>
      </footer>
    </div>
  );
}
