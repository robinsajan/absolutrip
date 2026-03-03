"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { toast } from "sonner";
import { useTripMembers } from "@/lib/hooks";
import { useAppStore } from "@/lib/store";
import { trips as tripsApi } from "@/lib/api/endpoints";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Users, Crown, Clock, Check, X, UserMinus } from "lucide-react";
import type { JoinRequest } from "@/types";

export default function MembersPage() {
  const params = useParams();
  const tripId = Number(params.tripId);
  const { members, isLoading, mutate: mutateMembers } = useTripMembers(tripId);
  const { user, activeTrip } = useAppStore();
  const [removingMember, setRemovingMember] = useState<number | null>(null);

  const isOwner = activeTrip?.created_by === user?.id;

  const { data: requestsData, mutate: mutateRequests } = useSWR(
    isOwner ? `join-requests-${tripId}` : null,
    () => tripsApi.getJoinRequests(tripId)
  );

  const pendingRequests = requestsData?.requests || [];

  const handleApprove = async (requestId: number) => {
    try {
      await tripsApi.approveJoinRequest(tripId, requestId);
      toast.success("Member approved");
      mutateRequests();
      mutateMembers();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || "Failed to approve");
    }
  };

  const handleReject = async (requestId: number) => {
    try {
      await tripsApi.rejectJoinRequest(tripId, requestId);
      toast.success("Request rejected");
      mutateRequests();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || "Failed to reject");
    }
  };

  const handleRemoveMember = async () => {
    if (!removingMember) return;
    try {
      await tripsApi.removeMember(tripId, removingMember);
      toast.success("Member removed");
      mutateMembers();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || "Failed to remove member");
    } finally {
      setRemovingMember(null);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-4">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <Users className="h-5 w-5" />
        Trip Members
      </h2>

      {isOwner && pendingRequests.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-amber-800">
              <Clock className="h-5 w-5" />
              Pending Requests ({pendingRequests.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingRequests.map((request: JoinRequest) => (
              <div
                key={request.id}
                className="flex flex-col sm:flex-row items-center justify-between p-4 bg-white rounded-xl border border-amber-200 gap-4"
              >
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarFallback className="bg-amber-100 text-amber-700">{getInitials(request.user_name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 truncate">{request.user_name}</p>
                    <p className="text-xs text-slate-500 truncate">{request.user_email}</p>
                  </div>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button
                    size="sm"
                    className="flex-1 sm:flex-none h-9 bg-green-600 hover:bg-green-700 text-white font-bold"
                    onClick={() => handleApprove(request.id)}
                  >
                    <Check className="h-4 w-4 mr-1.5" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="flex-1 sm:flex-none h-9 text-red-600 hover:text-red-700 hover:bg-red-50 font-bold"
                    onClick={() => handleReject(request.id)}
                  >
                    <X className="h-4 w-4 mr-1.5" />
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Members ({members.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between p-3 rounded-lg border"
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback>{getInitials(member.user_name)}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{member.user_name}</p>
                    {member.role === "owner" && (
                      <Badge variant="secondary" className="gap-1">
                        <Crown className="h-3 w-3" />
                        Admin
                      </Badge>
                    )}
                    {member.user_id === user?.id && (
                      <Badge variant="outline">You</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{member.user_email}</p>
                </div>
              </div>
              {isOwner && member.user_id !== user?.id && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => setRemovingMember(member.user_id)}
                >
                  <UserMinus className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <AlertDialog open={removingMember !== null} onOpenChange={() => setRemovingMember(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this member from the trip? They will lose access to all trip data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveMember}
              className="bg-red-600 hover:bg-red-700"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
