"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import useSWR from "swr";
import { Plus, LogOut, Users, Clock, Map, DollarSign, Calendar, Globe, Plane, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { trips as tripsApi, expenses as expensesApi } from "@/lib/api/endpoints";
import type { Trip } from "@/types";

function useTripSpent(tripId: number | null) {
  const { data } = useSWR(
    tripId ? `expenses-${tripId}` : null,
    () => (tripId ? expensesApi.list(tripId) : null)
  );
  const total =
    data?.expenses?.reduce((sum, e) => sum + e.amount, 0) ?? 0;
  return total;
}

function CurrentTripCard({ trip }: { trip: Trip }) {
  const spent = useTripSpent(trip.id);
  const memberCount = trip.members?.filter((m) => m.status === "approved").length ?? trip.members?.length ?? 0;
  const peopleLabel = memberCount === 1 ? "1 Person" : `${memberCount} People`;

  return (
    <Link href={`/trip/${trip.id}/explore`}>
      <Card className="group relative h-[400px] overflow-hidden rounded-2xl border-0 shadow-xl transition-all hover:shadow-2xl sm:h-[450px]">
        <Image
          src="https://tse4.mm.bing.net/th/id/OIP.D0OkZGTEV2heHtku9rouRgHaE8?rs=1&pid=ImgDetMain&o=7&rm=3"
          alt={trip.name}
          fill
          className="object-cover transition-transform group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, 800px"
          unoptimized
        />
        <div className="absolute inset-0 bg-black/40" />
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center sm:p-8">
          <p className="text-sm font-medium uppercase tracking-widest text-white/90">
            Current Trip
          </p>
          <h2
            className="mt-2 text-4xl font-bold tracking-tight text-white sm:text-5xl"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            {trip.name.toUpperCase()}
          </h2>
          <p className="mt-3 text-base text-white/95">
            {format(new Date(trip.start_date), "MMM d")} -{" "}
            {format(new Date(trip.end_date), "MMM d, yyyy")}
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-sm text-white/95">
            <span className="flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              {peopleLabel}
            </span>
            <span className="flex items-center gap-1.5">
              <DollarSign className="h-4 w-4" />
              ${Math.round(spent)} Spent
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
}

function PastTripCard({ trip }: { trip: Trip }) {
  const spent = useTripSpent(trip.id);
  const memberCount = trip.members?.filter((m) => m.status === "approved").length ?? trip.members?.length ?? 0;
  const peopleLabel = memberCount === 1 ? "1 Person" : `${memberCount} People`;

  return (
    <Link href={`/trip/${trip.id}/explore`}>
      <Card className="rounded-2xl border border-border bg-card shadow-sm transition-all hover:border-primary/30 hover:shadow-md">
        <CardContent className="p-4 sm:p-5">
          <h3 className="font-bold tracking-tight text-foreground">
            {trip.name.toUpperCase()}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {format(new Date(trip.start_date), "MMM d")} -{" "}
            {format(new Date(trip.end_date), "MMM d, yyyy")}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {peopleLabel}
            </span>
            <span className="flex items-center gap-1">
              <DollarSign className="h-3.5 w-3.5" />
              ${Math.round(spent)} Spent
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
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
  const [isCreating, setIsCreating] = useState(false);

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
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || "Invalid invite code");
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
      });
      toast.success("Trip created!");
      mutate();
      setNewTripDialogOpen(false);
      setTripName("");
      setStartDate("");
      setEndDate("");
      router.push(`/trip/${result.trip.id}/explore`);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || "Failed to create trip");
    } finally {
      setIsCreating(false);
    }
  };

  const sortedTrips = [...(trips ?? [])].sort(
    (a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
  );
  const currentTrip = sortedTrips[0] ?? null;
  const pastTrips = sortedTrips.slice(1);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 px-4 py-4 backdrop-blur-md lg:px-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            AbsoluTrip
          </h1>
          <div className="flex items-center gap-3">
            <p className="text-sm text-muted-foreground sm:text-base">
              Hi, {user?.name ?? "Guest"}
            </p>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="rounded-xl"
              aria-label="Log out"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-8 px-4 py-8 lg:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center sm:gap-4">
          <Dialog open={newTripDialogOpen} onOpenChange={setNewTripDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full rounded-xl bg-secondary px-6 py-3 font-semibold text-secondary-foreground shadow-lg hover:bg-secondary/90 sm:inline-flex sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                New Trip
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg rounded-2xl border border-border bg-card p-0 shadow-2xl">
              <div className="flex items-center justify-between border-b border-border px-8 py-6">
                <div>
                  <DialogTitle className="text-2xl font-bold tracking-tight text-foreground">
                    Create New Trip
                  </DialogTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Fill in the details for your next adventure.
                  </p>
                </div>
              </div>
              <form onSubmit={handleCreateTrip} className="space-y-6 p-8">
                <div className="space-y-2">
                  <Label
                    htmlFor="tripName"
                    className="text-base font-semibold text-foreground"
                    style={{ fontFamily: "var(--font-serif)" }}
                  >
                    Trip Name
                  </Label>
                  <Input
                    id="tripName"
                    placeholder="e.g. European Summer Escapade"
                    value={tripName}
                    onChange={(e) => setTripName(e.target.value)}
                    className="rounded-xl border-border bg-muted/50 px-4 py-3 focus:border-primary focus:ring-primary"
                    disabled={isCreating}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label
                      htmlFor="startDate"
                      className="text-sm font-medium text-foreground"
                    >
                      Start Date
                    </Label>
                    <div className="relative">
                      <Calendar className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="startDate"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="rounded-xl border-border bg-muted/50 py-3 pl-11 pr-4 focus:border-primary focus:ring-primary"
                        disabled={isCreating}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="endDate"
                      className="text-sm font-medium text-foreground"
                    >
                      End Date
                    </Label>
                    <div className="relative">
                      <Calendar className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="endDate"
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        min={startDate}
                        className="rounded-xl border-border bg-muted/50 py-3 pl-11 pr-4 focus:border-primary focus:ring-primary"
                        disabled={isCreating}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <Button
                    type="submit"
                    disabled={isCreating}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-secondary py-4 text-lg font-bold text-secondary-foreground shadow-lg shadow-secondary/20 transition-all hover:bg-secondary/90"
                  >
                    <span>{isCreating ? "Creating..." : "Create Trip"}</span>
                    <Plane className="h-5 w-5" />
                  </Button>
                  <p className="mt-4 text-center text-xs text-muted-foreground">
                    By creating a trip, you agree to our Terms of Service.
                  </p>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="w-full rounded-xl border-2 font-medium sm:inline-flex sm:w-auto"
              >
                Join Trip
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl">
              <DialogHeader>
                <DialogTitle>Join a Trip</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <Input
                  placeholder="Enter invite code"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleJoinTrip()}
                  className="rounded-xl"
                />
                <Button
                  className="w-full rounded-xl font-semibold"
                  onClick={handleJoinTrip}
                  disabled={isJoining}
                >
                  {isJoining ? "Joining..." : "Request to Join"}
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  Your request will be sent to the trip admin for approval
                </p>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {pendingRequests.length > 0 && (
          <Card className="rounded-2xl border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/30">
            <CardContent className="p-4">
              <h3 className="mb-3 flex items-center gap-2 font-medium text-amber-800 dark:text-amber-200">
                <Clock className="h-4 w-4" />
                Pending Requests
              </h3>
              <div className="space-y-2">
                {pendingRequests.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between rounded-xl border border-amber-200 bg-white p-2 dark:border-amber-800 dark:bg-amber-950/20"
                  >
                    <span className="font-medium">{request.trip_name}</span>
                    <Badge
                      variant="outline"
                      className="border-amber-500 text-amber-700 dark:text-amber-400"
                    >
                      Awaiting approval
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : trips.length === 0 ? (
          <Card className="rounded-2xl border border-border">
            <CardContent className="py-16 text-center">
              <p className="text-muted-foreground">No trips yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Create a new trip or join an existing one
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <section>
              <CurrentTripCard trip={currentTrip!} />
            </section>

            {pastTrips.length > 0 && (
              <section className="space-y-4">
                <h2 className="text-center text-xl font-bold tracking-tight text-foreground">
                  Past Trips
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {pastTrips.map((trip) => (
                    <PastTripCard key={trip.id} trip={trip} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
