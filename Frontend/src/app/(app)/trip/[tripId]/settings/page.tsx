"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAppStore } from "@/lib/store";
import { useTrips } from "@/lib/hooks";
import { trips as tripsApi } from "@/lib/api/endpoints";
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

export default function SettingsPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = Number(params.tripId);
  const { user, activeTrip } = useAppStore();
  const { mutate: mutateTrips } = useTrips();
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmName, setConfirmName] = useState("");

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
    <div className="p-4 max-w-2xl mx-auto space-y-4">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <Settings className="h-5 w-5" />
        Trip Settings
      </h2>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Invite Members</CardTitle>
          <CardDescription>Share the invite code or link with others to join this trip</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm text-muted-foreground">Invite Code</Label>
            <div className="flex items-center gap-2 mt-1">
              <code className="flex-1 px-3 py-2 bg-muted rounded-md font-mono text-sm">
                {activeTrip?.invite_code}
              </code>
              <Button variant="outline" size="icon" onClick={copyInviteCode}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <Button variant="outline" className="w-full" onClick={shareInviteLink}>
            <Share2 className="h-4 w-4 mr-2" />
            Share Invite Link
          </Button>
          <p className="text-xs text-muted-foreground">
            Note: New members will need admin approval before they can access the trip.
          </p>
        </CardContent>
      </Card>

      {isOwner && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-base text-red-600">Danger Zone</CardTitle>
            <CardDescription>Irreversible actions that affect the entire trip</CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Trip
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Trip</AlertDialogTitle>
                  <AlertDialogDescription className="space-y-3">
                    <p>
                      This action cannot be undone. This will permanently delete the trip
                      <strong> &quot;{activeTrip?.name}&quot;</strong> and all associated data including:
                    </p>
                    <ul className="list-disc list-inside text-sm space-y-1">
                      <li>All stay options and votes</li>
                      <li>All expenses and splits</li>
                      <li>All member data</li>
                    </ul>
                    <div className="pt-2">
                      <Label htmlFor="confirm-name">
                        Type <strong>{activeTrip?.name}</strong> to confirm
                      </Label>
                      <Input
                        id="confirm-name"
                        value={confirmName}
                        onChange={(e) => setConfirmName(e.target.value)}
                        placeholder="Enter trip name"
                        className="mt-2"
                      />
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setConfirmName("")}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteTrip}
                    disabled={confirmName !== activeTrip?.name || isDeleting}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {isDeleting ? "Deleting..." : "Delete Trip"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
