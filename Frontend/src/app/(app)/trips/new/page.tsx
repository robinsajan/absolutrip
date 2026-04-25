"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  ArrowLeft,
  ArrowRight,
  Copy,
  Share2,
  Check,
  Calendar,
  MapPin,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trips as tripsApi } from "@/lib/api/endpoints";
import { useTrips } from "@/lib/hooks";
import type { Trip } from "@/types";
import { FullscreenDatePicker } from "@/components/ui/fullscreen-date-picker";
import { LocationPickerModal, type SelectedLocation } from "@/components/ui/location-picker-modal";
import { DateRange } from "react-day-picker";

type Step = "name" | "location" | "dates" | "invite";
const STEPS: Step[] = ["name", "location", "dates", "invite"];

export default function NewTripPage() {
  const router = useRouter();
  const { mutate } = useTrips();
  const [step, setStep] = useState<Step>("name");
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  const [name, setName] = useState("");
  const [location, setLocation] = useState<SelectedLocation | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [createdTrip, setCreatedTrip] = useState<Trip | null>(null);

  const handleNext = async () => {
    if (step === "name") {
      if (!name.trim()) {
        toast.error("Please enter a trip name");
        return;
      }
      setStep("location");
    } else if (step === "location") {
      // Location is optional — user can skip
      setStep("dates");
    } else if (step === "dates") {
      if (!dateRange?.from || !dateRange?.to) {
        toast.error("Please select both dates");
        return;
      }

      setIsLoading(true);
      try {
        const result = await tripsApi.create({
          name: name.trim(),
          start_date: format(dateRange.from, "yyyy-MM-dd"),
          end_date: format(dateRange.to, "yyyy-MM-dd"),
          google_maps_url: location?.maps_url,
        });
        setCreatedTrip(result.trip);
        mutate();
        setStep("invite");
        toast.success("Trip created!");
      } catch (error: unknown) {
        const err = error as { response?: { data?: { error?: string } } };
        toast.error(err.response?.data?.error || "Failed to create trip");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleBack = () => {
    if (step === "location") setStep("name");
    else if (step === "dates") setStep("location");
  };

  const copyInviteCode = async () => {
    if (!createdTrip) return;
    await navigator.clipboard.writeText(createdTrip.invite_code);
    setCopied(true);
    toast.success("Invite code copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const shareInvite = async () => {
    if (!createdTrip) return;
    const shareData = {
      title: `Join ${createdTrip.name} on AbsoluTrip`,
      text: `Join my trip "${createdTrip.name}" on AbsoluTrip! Use invite code: ${createdTrip.invite_code}`,
      url: `${window.location.origin}/trips/join?code=${createdTrip.invite_code}`,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        copyInviteCode();
      }
    } else {
      copyInviteCode();
    }
  };

  const goToTrip = () => {
    if (createdTrip) {
      router.push(`/trip/${createdTrip.id}/explore`);
    }
  };

  const stepIndex = STEPS.indexOf(step);

  return (
    <div className="min-h-screen bg-background">
      <header className="z-10 bg-card border-b px-4 py-3">
        <div className="max-w-md mx-auto flex items-center gap-4">
          {step !== "invite" && (
            <Button
              variant="ghost"
              size="icon"
              onClick={step === "name" ? () => router.back() : handleBack}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <h1 className="text-lg font-semibold">
            {step === "invite" ? "Invite Friends" : "New Trip"}
          </h1>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4">
        {/* Progress bar */}
        <div className="flex gap-2 mb-6">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-all duration-300 ${stepIndex >= i ? "bg-primary" : "bg-muted"
                }`}
            />
          ))}
        </div>

        {/* Step: Name */}
        {step === "name" && (
          <Card>
            <CardHeader>
              <CardTitle>What&apos;s your trip called?</CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                placeholder="Beach Vacation 2026"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleNext()}
              />
            </CardContent>
            <CardFooter>
              <Button className="w-full" onClick={handleNext}>
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* Step: Location */}
        {step === "location" && (
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight">
                Where are you headed?
              </h2>
              <p className="text-muted-foreground">
                Pin your destination on the map. You can skip this.
              </p>
            </div>

            <div className="space-y-3">
              {/* Location button */}
              <button
                onClick={() => setShowLocationPicker(true)}
                className={cn(
                  "w-full h-20 flex items-center gap-4 px-6 rounded-2xl border-2 transition-all active:scale-[0.98] shadow-sm text-left",
                  location
                    ? "border-primary/40 bg-primary/5"
                    : "border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900"
                )}
              >
                <div
                  className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors",
                    location ? "bg-primary/15" : "bg-muted"
                  )}
                >
                  <MapPin
                    className={cn(
                      "h-5 w-5",
                      location ? "text-primary" : "text-muted-foreground"
                    )}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  {location ? (
                    <>
                      <p className="font-semibold text-foreground text-base leading-tight truncate">
                        {location.short_name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {location.display_name}
                      </p>
                    </>
                  ) : (
                    <p className="font-semibold text-muted-foreground text-base">
                      Select your destination
                    </p>
                  )}
                </div>
                {location && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setLocation(null);
                    }}
                    className="w-7 h-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0 hover:bg-destructive/20 transition-colors"
                  >
                    <X className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                )}
              </button>

              {/* Map mini preview if selected */}
              {location && (
                <div className="rounded-2xl overflow-hidden border border-primary/20 shadow-sm" style={{ height: 160 }}>
                  <iframe
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${location.lon - 0.05},${location.lat - 0.05},${location.lon + 0.05},${location.lat + 0.05}&layer=mapnik&marker=${location.lat},${location.lon}`}
                    width="100%"
                    height="100%"
                    style={{ border: 0, display: "block" }}
                    title="Location Preview"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Button
                className="w-full h-14 rounded-2xl text-lg font-bold shadow-lg shadow-primary/20"
                onClick={handleNext}
              >
                {location ? "Continue" : "Skip for Now"}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
              {!location && (
                <p className="text-center text-xs text-muted-foreground">
                  You can always add a location later from trip settings
                </p>
              )}
            </div>
          </div>
        )}

        {/* Step: Dates */}
        {step === "dates" && (
          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight">
                When are you going?
              </h2>
              <p className="text-muted-foreground">
                Pick the start and end dates for your trip.
              </p>
            </div>

            <div className="space-y-4">
              <FullscreenDatePicker
                date={dateRange}
                onSelect={setDateRange}
                title="Select Trip Dates"
                confirmText="Save Dates"
                trigger={
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full h-20 justify-start rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 text-left font-semibold text-lg transition-all active:scale-[0.98] shadow-sm",
                      !dateRange?.from && "text-muted-foreground"
                    )}
                  >
                    <Calendar className="mr-3 h-6 w-6 text-primary" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <span className="text-slate-900 dark:text-slate-100">
                          {format(dateRange.from, "MMM d")} -{" "}
                          {format(dateRange.to, "MMM d, yyyy")}
                        </span>
                      ) : (
                        <span className="text-slate-900 dark:text-slate-100">
                          {format(dateRange.from, "MMM d, yyyy")}
                        </span>
                      )
                    ) : (
                      "Select your trip dates"
                    )}
                  </Button>
                }
              />
            </div>

            <Button
              className="w-full h-14 rounded-2xl text-lg font-bold shadow-lg shadow-primary/20"
              onClick={handleNext}
              disabled={isLoading || !dateRange?.from || !dateRange?.to}
            >
              {isLoading ? "Creating..." : "Create Trip"}
            </Button>
          </div>
        )}

        {/* Step: Invite */}
        {step === "invite" && createdTrip && (
          <Card>
            <CardHeader>
              <CardTitle className="text-center">
                Invite your friends!
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Location badge in invite card */}
              {location && (
                <div className="flex items-center gap-2 rounded-xl bg-primary/8 border border-primary/20 px-3 py-2">
                  <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
                  <p className="text-sm font-medium text-foreground truncate">
                    {location.short_name}
                  </p>
                </div>
              )}

              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">
                  Share this code with your travel buddies
                </p>
                <div className="bg-muted rounded-lg p-4">
                  <p className="text-2xl font-mono font-bold tracking-wider">
                    {createdTrip.invite_code}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={copyInviteCode}
                >
                  {copied ? (
                    <Check className="h-4 w-4 mr-2" />
                  ) : (
                    <Copy className="h-4 w-4 mr-2" />
                  )}
                  {copied ? "Copied!" : "Copy"}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={shareInvite}
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
              </div>

              <div className="text-center text-sm text-muted-foreground">
                <p>
                  {format(new Date(createdTrip.start_date), "MMM d")} –{" "}
                  {format(new Date(createdTrip.end_date), "MMM d, yyyy")}
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full" onClick={goToTrip}>
                Go to Trip
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardFooter>
          </Card>
        )}
      </main>

      {/* Location Picker Modal */}
      <LocationPickerModal
        open={showLocationPicker}
        onClose={() => setShowLocationPicker(false)}
        onSelect={(loc) => setLocation(loc)}
        initialValue={location}
      />
    </div>
  );
}
