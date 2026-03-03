"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import useSWR from "swr";
import { LogOut, Search, Plus, Users, Map as MapIcon, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useTrips, useAuth } from "@/lib/hooks";
import { trips as tripsApi } from "@/lib/api/endpoints";
import type { Trip } from "@/types";

function TripCard({ trip }: { trip: Trip }) {
  const isUpcoming = new Date(trip.start_date) > new Date();

  return (
    <div className="group flex flex-col bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-shadow border border-slate-100 dark:border-slate-800">
      <div className="relative h-56 w-full overflow-hidden">
        <div
          className="absolute inset-0 bg-center bg-cover transition-transform duration-500 group-hover:scale-105"
          style={{ backgroundImage: `url("https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=2070&auto=format&fit=crop")` }}
        ></div>
        <div className="absolute top-4 right-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-primary uppercase">
          {isUpcoming ? "Upcoming" : "Past"}
        </div>
      </div>
      <div className="p-6 flex flex-col gap-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 serif-title leading-tight">{trip.name}</h3>
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mt-1">
              <span className="material-symbols-outlined text-sm">calendar_month</span>
              <span className="text-sm">
                {format(new Date(trip.start_date), "MMM dd")} - {format(new Date(trip.end_date), "MMM dd, yyyy")}
              </span>
            </div>
            {trip.google_maps_url && (
              <div className="flex items-center gap-2 text-primary mt-1">
                <span className="material-symbols-outlined text-sm">location_on</span>
                <a
                  href={trip.google_maps_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-semibold hover:underline truncate max-w-[200px]"
                >
                  View on Maps
                </a>
              </div>
            )}
          </div>
          <button className="size-10 rounded-full flex items-center justify-center bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-primary transition-colors">
            <span className="material-symbols-outlined">more_horiz</span>
          </button>
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-4">
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {trip.members?.slice(0, 3).map((m, i) => (
                <div
                  key={m.id}
                  className="size-8 rounded-full border-2 border-white dark:border-slate-900 bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary"
                  title={m.user_name}
                >
                  {m.user_name?.trim().charAt(0).toUpperCase() || "?"}
                </div>
              ))}
              {(trip.members?.length ?? 0) > 3 && (
                <div className="size-8 rounded-full border-2 border-white dark:border-slate-900 bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-500">
                  +{(trip.members?.length ?? 0) - 3}
                </div>
              )}
            </div>
            <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
              {trip.members?.length || 0} Member{trip.members?.length !== 1 ? 's' : ''}
            </span>
          </div>
          <Link
            href={`/trip/${trip.id}/explore`}
            className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-primary/90 transition-all"
          >
            Manage Trip
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
  const [joinCode, setJoinCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);

  // New Trip Dialog state
  const [newTripDialogOpen, setNewTripDialogOpen] = useState(false);
  const [tripName, setTripName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [googleMapsUrl, setGoogleMapsUrl] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const { data: myRequestsData } = useSWR("my-join-requests", () =>
    tripsApi.getMyRequests()
  );
  const pendingRequests = myRequestsData?.requests || [];

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
      } else if (result.status === "pending") {
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

  const handleCreateTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tripName.trim()) {
      toast.error("Please enter a trip name");
      return;
    }
    if (!startDate || !endDate) {
      toast.error("Please select both dates");
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      toast.error("End date must be after start date");
      return;
    }

    setIsCreating(true);
    try {
      const result = await tripsApi.create({
        name: tripName.trim(),
        start_date: startDate,
        end_date: endDate,
        google_maps_url: googleMapsUrl.trim(),
      });
      toast.success("Trip created!");
      mutate();
      setNewTripDialogOpen(false);
      setTripName("");
      setStartDate("");
      setEndDate("");
      setGoogleMapsUrl("");
      router.push(`/trip/${result.trip.id}/explore`);
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to create trip");
    } finally {
      setIsCreating(false);
    }
  };

  const allCurrent = (trips ?? []).filter(t => new Date(t.end_date) >= new Date()).sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
  const allPast = (trips ?? []).filter(t => new Date(t.end_date) < new Date()).sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());

  let currentTrips = allCurrent;
  let pastTrips = allPast;

  if (!showAll) {
    currentTrips = allCurrent.slice(0, 2);
    const remainingSlots = Math.max(0, 2 - currentTrips.length);
    pastTrips = allPast.slice(0, remainingSlots);
  }

  return (
    <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 min-h-screen font-sans">
      <div className="relative flex h-auto min-h-screen w-full flex-col group/design-root overflow-x-hidden">
        <div className="layout-container flex h-full grow flex-col">
          {/* Navigation */}
          <header className="flex items-center justify-between border-b border-solid border-primary/10 px-6 md:px-20 py-4 bg-white dark:bg-background-dark">
            <div className="flex items-center gap-4 md:gap-12">
              <Link href="/" className="flex items-center gap-2 md:gap-3 text-primary">
                <div className="size-7 md:size-8 flex items-center justify-center">
                  <span className="material-symbols-outlined text-2xl md:text-3xl">map</span>
                </div>
                <h2 className="text-slate-900 dark:text-slate-100 text-xl md:text-2xl font-bold leading-tight tracking-[-0.015em] serif-title">AbsoluTrip</h2>
              </Link>
              <nav className="hidden md:flex items-center gap-8">
                <a className="text-slate-600 dark:text-slate-400 hover:text-primary transition-colors text-sm font-semibold leading-normal flex items-center gap-2" href="#">
                  <span className="material-symbols-outlined text-lg">explore</span> Explore
                </a>
                <a className="text-slate-600 dark:text-slate-400 hover:text-primary transition-colors text-sm font-semibold leading-normal flex items-center gap-2" href="#">
                  <span className="material-symbols-outlined text-lg">settings</span> Settings
                </a>
                <button
                  onClick={handleLogout}
                  className="text-slate-600 dark:text-slate-400 hover:text-destructive transition-colors text-sm font-semibold leading-normal flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-lg">logout</span> Logout
                </button>
              </nav>
            </div>
            <div className="flex flex-1 justify-end gap-3 md:gap-6 items-center">
              <label className="hidden lg:flex flex-col min-w-40 h-10 max-w-64">
                <div className="flex w-full flex-1 items-stretch rounded-lg h-full overflow-hidden border border-slate-200 dark:border-slate-800">
                  <div className="text-slate-400 flex bg-white dark:bg-slate-900 items-center justify-center pl-4">
                    <span className="material-symbols-outlined text-xl">search</span>
                  </div>
                  <input className="form-input flex w-full min-w-0 flex-1 border-none bg-white dark:bg-slate-900 focus:ring-0 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 px-3 text-sm" placeholder="Search destinations..." />
                </div>
              </label>
              <div className="flex items-center justify-center aspect-square rounded-full size-9 md:size-10 border-2 border-primary/20 bg-slate-100 dark:bg-slate-800 text-sm font-bold text-slate-600 dark:text-slate-400">
                {(user?.name || "Guest").charAt(0).toUpperCase()}
              </div>
            </div>
          </header>

          <main className="flex-1 px-6 md:px-20 py-10 max-w-[1200px] mx-auto w-full">
            {/* Welcome Section */}
            <section className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
              <div className="flex flex-col gap-2">
                <h1 className="text-slate-900 dark:text-slate-100 text-4xl font-bold leading-tight tracking-tight serif-title">
                  Welcome back, {user?.name?.split(' ')[0] || "Traveler"}
                </h1>
                <p className="text-slate-500 dark:text-slate-400 text-lg">
                  {currentTrips.length > 0
                    ? `You have ${currentTrips.length} trip${currentTrips.length > 1 ? 's' : ''} coming up. Ready for your next adventure?`
                    : "Ready to plan your next adventure?"}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Dialog open={newTripDialogOpen} onOpenChange={setNewTripDialogOpen}>
                  <DialogTrigger asChild>
                    <button className="flex items-center gap-2 min-w-[140px] cursor-pointer justify-center rounded-xl h-12 px-6 bg-primary text-white text-base font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all">
                      <span className="material-symbols-outlined">add</span>
                      <span>Create New Trip</span>
                    </button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg rounded-2xl border-none bg-white dark:bg-slate-900 p-0 shadow-2xl overflow-hidden">
                    <div className="bg-primary px-8 py-6 text-white">
                      <DialogTitle className="text-2xl font-bold serif-title">Start a New Journey</DialogTitle>
                      <p className="text-white/80 text-sm mt-1">Fill in the details for your group adventure.</p>
                    </div>
                    <form onSubmit={handleCreateTrip} className="p-8 space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="tripName" className="text-sm font-bold text-slate-700 dark:text-slate-300">TRIP NAME</Label>
                        <Input
                          id="tripName"
                          placeholder="e.g. Tokyo Summer 2024"
                          value={tripName}
                          onChange={(e) => setTripName(e.target.value)}
                          className="h-12 rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="startDate" className="text-sm font-bold text-slate-700 dark:text-slate-300">START DATE</Label>
                          <Input
                            id="startDate"
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="h-12 rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="endDate" className="text-sm font-bold text-slate-700 dark:text-slate-300">END DATE</Label>
                          <Input
                            id="endDate"
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            min={startDate}
                            className="h-12 rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="googleMapsUrl" className="text-sm font-bold text-slate-700 dark:text-slate-300">GOOGLE MAPS LINK (OPTIONAL)</Label>
                        <div className="relative">
                          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">link</span>
                          <Input
                            id="googleMapsUrl"
                            placeholder="Paste link from Google Maps"
                            value={googleMapsUrl}
                            onChange={(e) => setGoogleMapsUrl(e.target.value)}
                            className="h-12 pl-10 rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50"
                          />
                        </div>
                      </div>
                      <button
                        type="submit"
                        disabled={isCreating}
                        className="w-full h-14 bg-primary text-white rounded-xl font-bold text-lg shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
                      >
                        {isCreating ? "Creating..." : "Create Trip"}
                        <span className="material-symbols-outlined">send</span>
                      </button>
                    </form>
                  </DialogContent>
                </Dialog>

                <Dialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
                  <DialogTrigger asChild>
                    <button className="flex items-center gap-2 min-w-[140px] cursor-pointer justify-center rounded-xl h-12 px-6 bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary text-base font-bold hover:bg-primary/20 transition-all">
                      <span className="material-symbols-outlined">group_add</span>
                      <span>Join a Trip</span>
                    </button>
                  </DialogTrigger>
                  <DialogContent className="rounded-2xl dark:bg-slate-900 border-none">
                    <DialogHeader>
                      <DialogTitle className="serif-title text-2xl">Join a Trip</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">INVITE CODE</Label>
                        <Input
                          placeholder="Enter 16-character code"
                          value={joinCode}
                          onChange={(e) => setJoinCode(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleJoinTrip()}
                          className="h-12 rounded-xl text-center font-mono text-lg tracking-widest"
                        />
                      </div>
                      <button
                        className="w-full h-12 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-all"
                        onClick={handleJoinTrip}
                        disabled={isJoining}
                      >
                        {isJoining ? "Joining..." : "Request Access"}
                      </button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </section>

            {pendingRequests.length > 0 && (
              <section className="mb-12">
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-6">
                  <h3 className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-200 mb-4">
                    <span className="material-symbols-outlined">pending_actions</span>
                    Pending Join Requests
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {pendingRequests.map((request) => (
                      <div key={request.id} className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-amber-100 dark:border-amber-900 flex justify-between items-center">
                        <span className="font-bold">{request.trip_name}</span>
                        <Badge variant="outline" className="bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 border-none">Awaiting approval</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* My Trips Section */}
            <section>
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-slate-900 dark:text-slate-100 text-2xl font-bold serif-title">My Trips</h2>
                <button
                  onClick={() => setShowAll(!showAll)}
                  className="text-primary font-semibold text-sm hover:underline flex items-center gap-1"
                >
                  {showAll ? "Show upcoming" : "View all trips"}
                  <span className="material-symbols-outlined text-sm">
                    {showAll ? "expand_less" : "chevron_right"}
                  </span>
                </button>
              </div>

              {isLoading ? (
                <div className="py-20 flex justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
                </div>
              ) : (trips?.length ?? 0) === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-16 text-center border-2 border-dashed border-slate-200 dark:border-slate-800">
                  <span className="material-symbols-outlined text-6xl text-slate-300 mb-4">travel_explore</span>
                  <h3 className="text-xl font-bold mb-2">No trips planned yet</h3>
                  <p className="text-slate-500 mb-8 max-w-sm mx-auto">Start by creating a new trip or ask a friend for an invite code.</p>
                  <button
                    onClick={() => setNewTripDialogOpen(true)}
                    className="bg-primary text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-primary/20"
                  >
                    Create Your First Trip
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {currentTrips.map(trip => (
                    <TripCard key={trip.id} trip={trip} />
                  ))}
                  {pastTrips.map(trip => (
                    <TripCard key={trip.id} trip={trip} />
                  ))}
                </div>
              )}
            </section>

            {/* Quick Tips / Discovery */}
            <section className="mt-20 bg-primary/5 dark:bg-primary/20 rounded-[2.5rem] p-10 flex flex-col md:flex-row items-center gap-10 border border-primary/10 overflow-hidden relative">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
              <div className="flex-1 relative z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-4">
                  <span className="material-symbols-outlined text-sm">lightbulb</span> AI Suggestion
                </div>
                <h3 className="text-3xl font-bold text-slate-900 dark:text-slate-100 serif-title mb-4">Discover hidden gems</h3>
                <p className="text-slate-600 dark:text-slate-400 mb-8 text-lg leading-relaxed">
                  Our AI-powered engine suggests unique experiences based on your past trips and preferences. Explore what's trending in your destinations.
                </p>
                <button className="text-primary font-bold flex items-center gap-2 hover:gap-3 transition-all group">
                  Explore Recommendations
                  <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
                </button>
              </div>
              <div className="w-full md:w-2/5 aspect-[4/3] bg-cover bg-center rounded-3xl shadow-2xl relative z-10" style={{ backgroundImage: `url("https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=2021&auto=format&fit=crop")` }}>
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent rounded-3xl"></div>
              </div>
            </section>
          </main>

          {/* Footer */}
          <footer className="px-6 md:px-20 py-10 mt-10 border-t border-slate-200 dark:border-slate-800 text-center text-slate-500 text-sm">
            <p>© {new Date().getFullYear()} AbsoluTrip. All rights reserved. Your journey begins here.</p>
          </footer>
        </div>
      </div>
    </div>
  );
}
