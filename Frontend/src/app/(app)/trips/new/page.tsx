"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeft, ArrowRight, Copy, Share2, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trips as tripsApi } from "@/lib/api/endpoints";
import { useTrips } from "@/lib/hooks";
import type { Trip } from "@/types";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";

type Step = "name" | "dates" | "invite";

export default function NewTripPage() {
  const router = useRouter();
  const { mutate } = useTrips();
  const [step, setStep] = useState<Step>("name");
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const [name, setName] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [createdTrip, setCreatedTrip] = useState<Trip | null>(null);

  const handleNext = async () => {
    if (step === "name") {
      if (!name.trim()) {
        toast.error("Please enter a trip name");
        return;
      }
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
    if (step === "dates") {
      setStep("name");
    }
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

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-card border-b px-4 py-3">
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
        <div className="flex gap-2 mb-6">
          {["name", "dates", "invite"].map((s, i) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full ${["name", "dates", "invite"].indexOf(step) >= i
                ? "bg-primary"
                : "bg-muted"
                }`}
            />
          ))}
        </div>

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

        {step === "dates" && (
          <Card>
            <CardHeader>
              <CardTitle>When are you going?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Trip Dates</Label>
                <DatePickerWithRange
                  date={dateRange}
                  setDate={setDateRange}
                  placeholder="Select trip duration"
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full"
                onClick={handleNext}
                disabled={isLoading}
              >
                {isLoading ? "Creating..." : "Create Trip"}
              </Button>
            </CardFooter>
          </Card>
        )}

        {step === "invite" && createdTrip && (
          <Card>
            <CardHeader>
              <CardTitle className="text-center">Invite your friends!</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
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
                  {format(new Date(createdTrip.start_date), "MMM d")} -{" "}
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
    </div>
  );
}
