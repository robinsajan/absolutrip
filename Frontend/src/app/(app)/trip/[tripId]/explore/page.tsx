"use client";

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { format, parseISO, eachDayOfInterval } from "date-fns";
import Image from "next/image";
import { useRankedOptions, useTripMembers, useAuth } from "@/lib/hooks";
import { useAppStore } from "@/lib/store";
import { options as optionsApi, votes as votesApi } from "@/lib/api/endpoints";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, Plus, Grid3x3, TrendingUp, Calendar, CheckCircle2, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import type { RankedOption, OptionCategory, TripMember } from "@/types";
import { AddOptionForm } from "@/components/explore";

type SortOption = "votes" | "price" | "created_at";
type ViewMode = "grid" | "date";

export default function ExplorePage() {
  const params = useParams();
  const tripId = Number(params.tripId);
  const { user } = useAuth();
  const { activeTrip } = useAppStore();
  const { rankedOptions, isLoading, mutate } = useRankedOptions(tripId);
  const { members } = useTripMembers(tripId);
  const [sortBy, setSortBy] = useState<SortOption>("votes");
  const [viewMode, setViewMode] = useState<ViewMode>("date");
  const [showAddOption, setShowAddOption] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const isOwner = useMemo(() => {
    if (!user || !members) return false;
    const membership = members.find((m: TripMember) => m.user_id === user.id);
    return membership?.role === "owner";
  }, [user, members]);

  const tripDates = useMemo(() => {
    if (!activeTrip?.start_date || !activeTrip?.end_date) return [];
    try {
      return eachDayOfInterval({
        start: parseISO(activeTrip.start_date),
        end: parseISO(activeTrip.end_date),
      });
    } catch {
      return [];
    }
  }, [activeTrip?.start_date, activeTrip?.end_date]);

  const sortedOptions = [...rankedOptions].sort((a, b) => {
    switch (sortBy) {
      case "votes":
        return b.total_score - a.total_score || b.vote_count - a.vote_count;
      case "price":
        return a.option.price - b.option.price;
      case "created_at":
        return (
          new Date(b.option.created_at).getTime() -
          new Date(a.option.created_at).getTime()
        );
      default:
        return 0;
    }
  });

  const filteredOptions = useMemo(() => {
    if (viewMode !== "date" || !selectedDate) return sortedOptions;
    return sortedOptions.filter((ro) => ro.option.check_in_date === selectedDate);
  }, [sortedOptions, viewMode, selectedDate]);

  const optionsByDate = useMemo(() => {
    const grouped: Record<string, RankedOption[]> = {};
    const noDate: RankedOption[] = [];
    
    sortedOptions.forEach((ro) => {
      if (ro.option.check_in_date) {
        if (!grouped[ro.option.check_in_date]) {
          grouped[ro.option.check_in_date] = [];
        }
        grouped[ro.option.check_in_date].push(ro);
      } else {
        noDate.push(ro);
      }
    });
    
    return { grouped, noDate };
  }, [sortedOptions]);

  const handleVote = async (optionId: number, score: number) => {
    try {
      await votesApi.cast(optionId, score);
      mutate();
      toast.success(score > 0 ? "Vote added!" : "Vote removed!");
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || "Failed to vote");
    }
  };

  const handleAddOption = async (data: {
    title: string;
    link: string;
    price: number;
    notes?: string;
    check_in_date?: string;
    check_out_date?: string;
    category?: OptionCategory;
  }) => {
    const result = await optionsApi.create(tripId, data);
    mutate();
    setShowAddOption(false);
    return result;
  };

  const handleImageUpload = async (optionId: number, file: File) => {
    await optionsApi.uploadImage(optionId, file);
    mutate();
  };

  const handleFinalize = async (optionId: number) => {
    try {
      await optionsApi.finalize(optionId);
      toast.success("Option selected!");
      mutate();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || "Failed to select option");
    }
  };

  const handleUnfinalize = async (optionId: number) => {
    try {
      await optionsApi.unfinalize(optionId);
      toast.success("Option unselected!");
      mutate();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || "Failed to unselect option");
    }
  };

  const handleDeleteOption = async (optionId: number) => {
    try {
      await optionsApi.delete(optionId);
      toast.success("Option deleted");
      mutate();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || "Failed to delete option");
    }
  };

  const goToPreviousDate = () => {
    if (!selectedDate || tripDates.length === 0) return;
    const currentIndex = tripDates.findIndex(
      (d) => format(d, "yyyy-MM-dd") === selectedDate
    );
    if (currentIndex > 0) {
      setSelectedDate(format(tripDates[currentIndex - 1], "yyyy-MM-dd"));
    }
  };

  const goToNextDate = () => {
    if (!selectedDate || tripDates.length === 0) return;
    const currentIndex = tripDates.findIndex(
      (d) => format(d, "yyyy-MM-dd") === selectedDate
    );
    if (currentIndex < tripDates.length - 1) {
      setSelectedDate(format(tripDates[currentIndex + 1], "yyyy-MM-dd"));
    }
  };

  const getUserVote = (rankedOption: RankedOption) => {
    if (!user) return null;
    return rankedOption.voters.find((v: { user_id: number; user_name: string; score: number }) => v.user_id === user.id);
  };

  const renderOptionCard = (rankedOption: RankedOption) => {
    const userVote = getUserVote(rankedOption);
    const hasVoted = !!userVote;
    const canDelete = user && rankedOption.option.added_by === user.id;
    
    // Use uploaded image first (image_path), then external URL (image_url), then fallback
    let imageUrl = "/static/image.png";
    if (rankedOption.option.image_path) {
      // Uploaded image - construct URL to backend upload endpoint
      imageUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/uploads/options/${rankedOption.option.image_path}`;
    } else if (rankedOption.option.image_url) {
      // External scraped URL
      imageUrl = rankedOption.option.image_url;
    }

    return (
      <Card
        key={rankedOption.option.id}
        className="group overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all hover:shadow-md"
      >
        {/* Image */}
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
          <Image
            src={imageUrl}
            alt={rankedOption.option.title}
            fill
            className="object-cover transition-transform group-hover:scale-105"
            unoptimized
          />
          {rankedOption.option.is_finalized && (
            <div className="absolute right-3 top-3 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-bold text-white shadow-lg">
              ✓ Selected
            </div>
          )}
          {canDelete && (
            <button
              onClick={(e) => {
                e.preventDefault();
                if (window.confirm("Are you sure you want to delete this option?")) {
                  handleDeleteOption(rankedOption.option.id);
                }
              }}
              className="absolute left-3 top-3 rounded-lg bg-red-600 p-2 text-white shadow-lg transition-all hover:bg-red-700 active:scale-95"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Content */}
        <CardContent className="p-4">
          {/* Title and Heart Row */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-lg text-foreground leading-tight">
                {rankedOption.option.title}
              </h3>
            </div>
            <button
              onClick={(e) => {
                e.preventDefault();
                handleVote(rankedOption.option.id, hasVoted ? 0 : 1);
              }}
              className="group flex flex-col items-center gap-1 flex-shrink-0 transition-transform active:scale-95"
            >
              <Heart
                className={`h-7 w-7 transition-all ${
                  hasVoted
                    ? "fill-red-500 text-red-500"
                    : "text-gray-400 hover:text-red-400"
                }`}
              />
              {rankedOption.vote_count > 0 && (
                <span className="text-xs font-semibold text-muted-foreground">
                  {rankedOption.vote_count}
                </span>
              )}
            </button>
          </div>

          {/* Notes and Dates Row */}
          <div className="mt-2 flex items-center gap-3 text-sm text-muted-foreground">
            {rankedOption.option.notes && (
              <span className="truncate">{rankedOption.option.notes}</span>
            )}
            {(rankedOption.option.check_in_date || rankedOption.option.check_out_date) && (
              <div className="flex items-center gap-1 flex-shrink-0">
                <Calendar className="h-3.5 w-3.5" />
                {rankedOption.option.check_in_date && (
                  <span>{format(parseISO(rankedOption.option.check_in_date), "MMM d")}</span>
                )}
                {rankedOption.option.check_in_date && rankedOption.option.check_out_date && (
                  <span>-</span>
                )}
                {rankedOption.option.check_out_date && (
                  <span>{format(parseISO(rankedOption.option.check_out_date), "MMM d")}</span>
                )}
              </div>
            )}
          </div>

          {/* Price and Action Row */}
          <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
            <div>
              <p className="text-2xl font-bold text-foreground">
                ${rankedOption.option.price.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">
                {rankedOption.vote_count} vote{rankedOption.vote_count !== 1 ? "s" : ""}
              </p>
            </div>
            {isOwner && (
              rankedOption.option.is_finalized ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.preventDefault();
                    handleUnfinalize(rankedOption.option.id);
                  }}
                  className="rounded-lg border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                  Unselect
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    handleFinalize(rankedOption.option.id);
                  }}
                  className="rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Select
                </Button>
              )
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="flex h-full">
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="border-b border-border bg-card px-6 py-4 lg:px-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {activeTrip?.name || "Trip"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {activeTrip?.start_date && activeTrip?.end_date
                  ? `${format(parseISO(activeTrip.start_date), "MMM d")} - ${format(
                      parseISO(activeTrip.end_date),
                      "MMM d, yyyy"
                    )}`
                  : ""}
              </p>
            </div>
            <Button
              onClick={() => setShowAddOption(true)}
              className="rounded-xl bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground shadow-sm hover:bg-primary/90"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Option
            </Button>
          </div>

          {/* Filters */}
          <div className="mt-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant={sortBy === "votes" ? "default" : "ghost"}
                size="sm"
                onClick={() => setSortBy("votes")}
                className="rounded-lg text-xs font-medium"
              >
                
                Top Voted
              </Button>
              <Button
                variant={sortBy === "price" ? "default" : "ghost"}
                size="sm"
                onClick={() => setSortBy("price")}
                className="rounded-lg text-xs font-medium"
              >
                Lowest Price
              </Button>
              <Button
                variant={sortBy === "created_at" ? "default" : "ghost"}
                size="sm"
                onClick={() => setSortBy("created_at")}
                className="rounded-lg text-xs font-medium"
              >
                Newest
              </Button>
            </div>

            <div className="flex items-center gap-1 rounded-lg border border-border p-1">
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="icon"
                onClick={() => {
                  setViewMode("grid");
                  setSelectedDate(null);
                }}
                className="h-7 w-7 rounded"
              >
                <Grid3x3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "date" ? "secondary" : "ghost"}
                size="icon"
                onClick={() => setViewMode("date")}
                disabled={tripDates.length === 0}
                className="h-7 w-7 rounded"
              >
                <Calendar className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Options Grid/List */}
        <div className="p-6 lg:p-10">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : sortedOptions.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-muted-foreground">No options yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Add a stay or activity option to get started
              </p>
            </div>
          ) : viewMode === "date" && selectedDate ? (
            <div className="space-y-4">
              {/* Date Navigation Header */}
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={goToPreviousDate}
                  disabled={
                    !selectedDate ||
                    tripDates.findIndex((d) => format(d, "yyyy-MM-dd") === selectedDate) === 0
                  }
                  className="rounded-lg"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <h3 className="font-semibold text-xl">
                  {format(parseISO(selectedDate), "EEEE, MMMM d")}
                </h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={goToNextDate}
                  disabled={
                    !selectedDate ||
                    tripDates.findIndex((d) => format(d, "yyyy-MM-dd") === selectedDate) ===
                      tripDates.length - 1
                  }
                  className="rounded-lg"
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
              {filteredOptions.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No options for this date
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredOptions.map((rankedOption) => renderOptionCard(rankedOption))}
                </div>
              )}
            </div>
          ) : viewMode === "date" ? (
            <div className="space-y-6">
              {tripDates.map((date) => {
                const dateStr = format(date, "yyyy-MM-dd");
                const dateOptions = optionsByDate.grouped[dateStr] || [];
                if (dateOptions.length === 0) return null;
                return (
                  <div key={dateStr}>
                    <h3 className="font-medium text-lg mb-3 flex items-center gap-2">
                      {format(date, "EEEE, MMMM d")}
                      <Badge variant="outline">{dateOptions.length}</Badge>
                    </h3>
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                      {dateOptions.map((rankedOption) => renderOptionCard(rankedOption))}
                    </div>
                  </div>
                );
              })}
              {optionsByDate.noDate.length > 0 && (
                <div>
                  <h3 className="font-medium text-lg mb-3 flex items-center gap-2 text-muted-foreground">
                    No date assigned
                    <Badge variant="outline">{optionsByDate.noDate.length}</Badge>
                  </h3>
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {optionsByDate.noDate.map((rankedOption) => renderOptionCard(rankedOption))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {sortedOptions.map((rankedOption) => renderOptionCard(rankedOption))}
            </div>
          )}
        </div>
      </div>

      {/* Add Option Dialog */}
      {showAddOption && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="text-xl font-bold text-foreground">Add New Option</h2>
              <button
                onClick={() => setShowAddOption(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>
            <div className="p-6">
              <AddOptionForm
                onSubmit={handleAddOption}
                onImageUpload={handleImageUpload}
                tripStartDate={activeTrip?.start_date}
                tripEndDate={activeTrip?.end_date}
                onCancel={() => setShowAddOption(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
