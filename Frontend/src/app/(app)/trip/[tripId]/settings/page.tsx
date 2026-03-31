"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAppStore } from "@/lib/store";
import { useTrips } from "@/lib/hooks";
import { trips as tripsApi, options as optionsApi } from "@/lib/api/endpoints";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Settings, Trash2, Copy, Share2 } from "lucide-react";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import { format } from "date-fns";

export default function SettingsPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params.tripId as string;
  const { user, activeTrip, setActiveTrip } = useAppStore();
  const { mutate: mutateTrips } = useTrips();
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmName, setConfirmName] = useState("");

  const [editName, setEditName] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editDateRange, setEditDateRange] = useState<DateRange | undefined>(undefined);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (activeTrip) {
      setEditName(activeTrip.name || "");
      setEditLocation(activeTrip.google_maps_url || "");
      setEditDateRange({
        from: activeTrip.start_date ? new Date(activeTrip.start_date) : undefined,
        to: activeTrip.end_date ? new Date(activeTrip.end_date) : undefined
      });
    }
  }, [activeTrip]);

  const handleUpdateTrip = async () => {
    if (!editName || !editDateRange?.from || !editDateRange?.to) {
      toast.error("Please fill out name and dates");
      return;
    }

    setIsUpdating(true);
    try {
      const startStr = format(editDateRange.from, "yyyy-MM-dd");
      const endStr = format(editDateRange.to, "yyyy-MM-dd");

      // Check if dates are changed
      const originalStart = activeTrip?.start_date ? new Date(activeTrip.start_date).toISOString().split("T")[0] : "";
      const originalEnd = activeTrip?.end_date ? new Date(activeTrip.end_date).toISOString().split("T")[0] : "";

      if (startStr !== originalStart || endStr !== originalEnd) {
        // Fetch all stays / options
        const { options } = await optionsApi.list(tripId);

        // Find stays that fall completely outside the new dates, or whose dates are outside the bounds
        const newStart = editDateRange.from;
        const newEnd = editDateRange.to;

        const invalidStay = options.find((opt) => {
          if (opt.category === 'stay' || (opt.check_in_date && opt.check_out_date)) {
            const stayStart = opt.check_in_date ? new Date(opt.check_in_date) : null;
            const stayEnd = opt.check_out_date ? new Date(opt.check_out_date) : null;

            if (stayStart && stayStart < newStart) return true;
            if (stayEnd && stayEnd > newEnd) return true;
          }
          return false;
        });

        if (invalidStay) {
          toast.error("This change can't be done. You need to update the stay dates first that exist outside this new range.");
          setIsUpdating(false);
          return;
        }
      }

      await tripsApi.update(tripId, {
        name: editName,
        google_maps_url: editLocation,
        start_date: startStr,
        end_date: endStr,
      });

      toast.success("Trip updated successfully!");
      // Refetch logic or active trip setting
      const res = await tripsApi.get(tripId);
      setActiveTrip(res.trip);
      mutateTrips();

    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to update trip");
    } finally {
      setIsUpdating(false);
    }
  };

  const isOwner = activeTrip?.created_by === user?.id;

  const copyInviteCode = async () => {
    if (!activeTrip) return;
    await navigator.clipboard.writeText(activeTrip.invite_code);
    toast.success("Invite code copied!");
  };

  const shareInviteLink = async () => {
    if (!activeTrip) return;
    const inviteUrl = `${window.location.origin}/trips/join?code=${activeTrip.invite_code}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${activeTrip.name}`,
          text: `You're invited to join the trip "${activeTrip.name}"`,
          url: inviteUrl,
        });
      } catch {
        await navigator.clipboard.writeText(inviteUrl);
        toast.success("Invite link copied!");
      }
    } else {
      await navigator.clipboard.writeText(inviteUrl);
      toast.success("Invite link copied!");
    }
  };

  const handleDeleteTrip = async () => {
    if (confirmName !== activeTrip?.name) {
      toast.error("Trip name doesn't match");
      return;
    }

    setIsDeleting(true);
    try {
      await tripsApi.delete(tripId);
      toast.success("Trip deleted");
      mutateTrips();
      router.replace("/trips");
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || "Failed to delete trip");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-8 pb-24">
      <div className="flex flex-col gap-1 px-1">
        <h2 className="text-2xl font-black tracking-tight flex items-center gap-3 lowercase italic serif-title">
          <span className="material-symbols-outlined text-primary text-2xl">settings</span>
          Trip Settings
        </h2>
        <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.15em]">Control your trip parameters</p>
      </div>

      {isOwner && (
        <Card className="border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 rounded-2xl overflow-hidden">
          <CardHeader className="p-6 pb-2 border-b border-slate-50 dark:border-slate-800">
            <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-base">edit</span>
              Edit Trip Info
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-5">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Trip Name</Label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="h-14 rounded-2xl border border-slate-200 dark:border-slate-800 focus:border-primary transition-all font-bold"
                  placeholder="E.g. Summer Vacation"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Location Map URL</Label>
                <Input
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  className="h-14 rounded-2xl border border-slate-200 dark:border-slate-800 focus:border-primary transition-all font-bold"
                  placeholder="https://maps.google.com/..."
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Trip Dates</Label>
                <DatePickerWithRange
                  date={editDateRange}
                  setDate={setEditDateRange}
                  className="w-full"
                />
              </div>
            </div>
            <Button
              onClick={handleUpdateTrip}
              disabled={isUpdating}
              className="w-full py-7 rounded-2xl bg-primary text-white font-black text-xs uppercase tracking-[0.2em] hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-primary/20"
            >
              {isUpdating ? "Saving..." : "Save Changes"}
            </Button>
          </CardContent>
        </Card>
      )}

      <Card className="border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 rounded-2xl overflow-hidden">
        <CardHeader className="p-6 pb-2 border-b border-slate-50 dark:border-slate-800">
          <CardTitle className="text-sm font-black uppercase tracking-widest">Invite Crew</CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div>
            <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Invite Code</Label>
            <div className="flex items-center gap-3 mt-3">
              <code className="flex-1 px-6 py-4 bg-slate-50 dark:bg-slate-800 rounded-2xl font-mono text-xl font-bold border border-slate-100 dark:border-slate-800 tracking-widest text-primary">
                {activeTrip?.invite_code}
              </code>
              <Button size="icon" className="size-14 rounded-2xl bg-primary hover:scale-105 active:scale-95 transition-all text-white shadow-xl shadow-primary/20" onClick={copyInviteCode}>
                <span className="material-symbols-outlined">content_copy</span>
              </Button>
            </div>
          </div>
          <Button variant="outline" className="w-full py-7 rounded-2xl border-2 border-slate-100 dark:border-slate-800 font-black text-xs uppercase tracking-[0.2em] hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm" onClick={shareInviteLink}>
            <span className="material-symbols-outlined mr-2">share</span>
            Share Invite Link
          </Button>
          <div className="flex items-center gap-2 p-4 bg-primary/5 rounded-2xl border border-primary/10">
            <span className="material-symbols-outlined text-sm text-primary">info</span>
            <p className="text-[10px] font-bold text-primary/70 uppercase tracking-tight">
              Admins must approve new members before they can access trip data.
            </p>
          </div>
        </CardContent>
      </Card>

      {isOwner && (
        <Card className="border border-red-100 dark:border-red-900/50 shadow-sm bg-red-50/10 dark:bg-red-950/10 rounded-2xl overflow-hidden">
          <CardHeader className="p-6 pb-2 border-b border-red-50 dark:border-red-900/20">
            <CardTitle className="text-sm font-black uppercase tracking-widest text-red-600">Danger Zone</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button className="w-full py-8 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-red-600/20 transition-all hover:-translate-y-1">
                  <span className="material-symbols-outlined mr-2">delete_forever</span>
                  Delete this Trip
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden bg-white dark:bg-slate-900">
                <div className="p-10">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-3xl font-black tracking-tight">Wait! Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription asChild>
                      <div className="space-y-6 pt-4">
                        <p className="text-slate-500 font-medium">
                          Deleting <strong>&quot;{activeTrip?.name}&quot;</strong> will permanently remove all data for everyone. This cannot be undone.
                        </p>

                        <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
                          <ul className="space-y-3">
                            {[
                              "All stay options and community votes",
                              "Entire expense ledger and balances",
                              "All member and invitation data"
                            ].map((item, i) => (
                              <li key={i} className="flex items-center gap-3 text-xs font-bold text-slate-400">
                                <span className="material-symbols-outlined text-red-500 text-sm">cancel</span>
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="pt-4 space-y-3">
                          <Label htmlFor="confirm-name" className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-400">
                            Type <span className="text-black dark:text-white">{activeTrip?.name}</span> below to confirm
                          </Label>
                          <Input
                            id="confirm-name"
                            value={confirmName}
                            onChange={(e) => setConfirmName(e.target.value)}
                            placeholder="Type trip name here"
                            className="h-14 rounded-2xl border-2 border-slate-100 dark:border-slate-800 focus:border-red-600 focus:ring-4 focus:ring-red-600/5 transition-all font-bold"
                          />
                        </div>
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="pt-10 flex flex-col md:flex-row gap-3">
                    <AlertDialogCancel onClick={() => setConfirmName("")} className="py-7 rounded-2xl border-none font-black text-xs uppercase tracking-widest hover:bg-slate-100">Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteTrip}
                      disabled={confirmName !== activeTrip?.name || isDeleting}
                      className="bg-red-600 hover:bg-red-700 text-white py-7 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-red-600/20 disabled:opacity-30 flex-grow"
                    >
                      {isDeleting ? "Deleting..." : "Delete Forever"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </div>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
