"use client";

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { format, parseISO, eachDayOfInterval, isWithinInterval } from "date-fns";
import Image from "next/image";
import { useRankedOptions, useTripMembers, useAuth } from "@/lib/hooks";
import { useAppStore } from "@/lib/store";
import { options as optionsApi, votes as votesApi } from "@/lib/api/endpoints";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, Plus, Grid3x3, TrendingUp, Calendar, CheckCircle2, ChevronLeft, ChevronRight, Trash2, Star, ThumbsUp, ShoppingCart, CheckCircle, MapPin } from "lucide-react";
import type { RankedOption, OptionCategory, TripMember } from "@/types";
import { AddOptionForm } from "@/components/explore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  const { showAddOption, setShowAddOption } = useAppStore();
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
    const selected = parseISO(selectedDate);

    return sortedOptions.filter((ro) => {
      if (!ro.option.check_in_date) return false;
      const start = parseISO(ro.option.check_in_date);

      // If there's a check_out_date, check if selectedDate is within the range
      if (ro.option.check_out_date) {
        const end = parseISO(ro.option.check_out_date);
        return isWithinInterval(selected, { start, end });
      }

      // Otherwise, just match the check_in_date
      return ro.option.check_in_date === selectedDate;
    });
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
      imageUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/uploads/options/${rankedOption.option.image_path}`;
    } else if (rankedOption.option.image_url) {
      imageUrl = rankedOption.option.image_url;
    }

    const isStay = rankedOption.option.category === "stay";

    return (
      <div
        key={rankedOption.option.id}
        className="group bg-white dark:bg-slate-900 rounded-xl overflow-hidden border border-primary/5 hover:shadow-xl transition-all flex flex-col h-full"
      >
        <div className="relative h-48 overflow-hidden shrink-0">
          <div
            className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
            style={{ backgroundImage: `url('${imageUrl}')` }}
          />
          {rankedOption.option.is_finalized && (
            <div className="absolute top-3 left-3 bg-green-500 text-white text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full shadow-sm">
              Selected
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
              className="absolute bottom-3 right-3 size-8 bg-red-500 text-white rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
            >
              <Trash2 className="size-4" />
            </button>
          )}
        </div>

        <div className="p-5 flex flex-col grow">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h4 className="font-bold text-lg text-slate-900 dark:text-white leading-tight font-serif truncate">
              {rankedOption.option.title}
            </h4>
          </div>
          <p className="text-slate-500 text-sm mb-4 flex items-center gap-1">
            <MapPin className="size-3" />
            {isStay ? "Hotel & Area" : "Experience Location"}
          </p>

          <div className="flex items-center justify-between mt-auto">
            <div className="flex flex-col">
              {rankedOption.option.check_in_date && (
                <span className="text-[10px] text-primary font-bold uppercase mb-1 flex items-center gap-1">
                  <Calendar className="size-3" />
                  {(() => {
                    const getDayNum = (dateStr: string) => {
                      const idx = tripDates.findIndex(d => format(d, "yyyy-MM-dd") === dateStr);
                      return idx !== -1 ? `Day ${idx + 1}` : format(parseISO(dateStr), "MMM d");
                    };

                    const startLabel = getDayNum(rankedOption.option.check_in_date);
                    if (rankedOption.option.check_out_date) {
                      const endLabel = getDayNum(rankedOption.option.check_out_date);
                      return `${startLabel} - ${endLabel}`;
                    }
                    return startLabel;
                  })()}
                </span>
              )}
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">
                {(() => {
                  let label = isStay ? "Starting from" : "Per person";
                  if (rankedOption.option.is_per_person && rankedOption.option.is_per_night) label = "Per person / night";
                  else if (rankedOption.option.is_per_person) label = "Per person";
                  else if (rankedOption.option.is_per_night) label = "Per night";
                  return label;
                })()}
              </span>
              <span className="text-primary font-bold text-xl">
                ${rankedOption.option.price.toLocaleString()}
                {rankedOption.option.is_per_night && <span className="text-xs font-normal text-slate-400">/night</span>}
                {rankedOption.option.is_per_person && !rankedOption.option.is_per_night && <span className="text-xs font-normal text-slate-400">/person</span>}
              </span>
            </div>

            <button
              onClick={() => handleVote(rankedOption.option.id, hasVoted ? 0 : 1)}
              className={cn(
                "transition-all px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2",
                hasVoted
                  ? "bg-primary text-white shadow-lg shadow-primary/20"
                  : "bg-primary/10 text-primary hover:bg-primary hover:text-white"
              )}
            >
              <ThumbsUp className={cn("size-4", hasVoted && "fill-current")} />
              {hasVoted ? "Voted" : "Vote"}
              {rankedOption.vote_count > 0 && <span>• {rankedOption.vote_count}</span>}
            </button>
          </div>

          {isOwner && !rankedOption.option.is_finalized && (
            <button
              onClick={() => handleFinalize(rankedOption.option.id)}
              className="mt-3 w-full py-2 border border-green-500/20 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg text-xs font-bold transition-colors"
            >
              Finalize Choice
            </button>
          )}
          {isOwner && rankedOption.option.is_finalized && (
            <button
              onClick={() => handleUnfinalize(rankedOption.option.id)}
              className="mt-3 w-full py-2 border border-red-500/20 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-xs font-bold transition-colors"
            >
              Remove Selection
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      {/* Search Header (Mobile only, Desktop is in TripHeader) */}
      <div className="flex md:hidden items-center gap-3 mb-6">
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
          <input
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border-none rounded-lg focus:ring-2 focus:ring-primary text-sm shadow-sm"
            placeholder="Search experiences..."
            type="text"
          />
        </div>
        <button
          onClick={() => setShowAddOption(true)}
          className="size-10 bg-primary text-white rounded-lg flex items-center justify-center shadow-lg shadow-primary/20"
        >
          <span className="material-symbols-outlined">add</span>
        </button>
      </div>

      {/* Day Selector */}
      <div className="flex items-center gap-3 mb-8 overflow-x-auto pb-2 scrollbar-hide">
        <button
          onClick={() => setSelectedDate(null)}
          className={cn(
            "px-4 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap",
            selectedDate === null
              ? "bg-primary text-white shadow-lg shadow-primary/20"
              : "bg-primary/5 text-slate-500 hover:bg-primary/10"
          )}
        >
          All Days
        </button>
        {tripDates.map((date, index) => {
          const dateStr = format(date, "yyyy-MM-dd");
          const isSelected = selectedDate === dateStr;
          return (
            <button
              key={dateStr}
              onClick={() => setSelectedDate(dateStr)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap flex flex-col items-center min-w-[80px]",
                isSelected
                  ? "bg-primary text-white shadow-lg shadow-primary/20"
                  : "bg-primary/5 text-slate-500 hover:bg-primary/10"
              )}
            >
              <span className="text-[10px] uppercase tracking-tighter opacity-80">Day {index + 1}</span>
              <span>{format(date, "MMM d")}</span>
            </button>
          );
        })}
      </div>

      {/* Filters/Tabs */}
      <div className="flex items-center gap-6 border-b border-primary/10 mb-8 overflow-x-auto whitespace-nowrap scrollbar-hide">
        <button
          onClick={() => setSortBy("votes")}
          className={cn(
            "pb-4 px-2 border-b-2 font-bold text-sm transition-all whitespace-nowrap",
            sortBy === "votes" ? "border-primary text-primary" : "border-transparent text-slate-400 hover:text-slate-600"
          )}
        >
          Top Voted
        </button>
        <button
          onClick={() => setSortBy("price")}
          className={cn(
            "pb-4 px-2 border-b-2 font-bold text-sm transition-all whitespace-nowrap",
            sortBy === "price" ? "border-primary text-primary" : "border-transparent text-slate-400 hover:text-slate-600"
          )}
        >
          Lowest Price
        </button>
        <button
          onClick={() => setSortBy("created_at")}
          className={cn(
            "pb-4 px-2 border-b-2 font-bold text-sm transition-all whitespace-nowrap",
            sortBy === "created_at" ? "border-primary text-primary" : "border-transparent text-slate-400 hover:text-slate-600"
          )}
        >
          Newest
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="size-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin"></div>
        </div>
      ) : (
        <div className="space-y-12">
          {/* Section rendering logic should now use filtered options */}
          {/* Stays Section */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl lg:text-2xl font-serif font-bold flex items-center gap-3">
                <span className="material-symbols-outlined text-primary">bed</span>
                Curated Stays
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredOptions
                .filter(ro => ro.option.category === "stay")
                .map(renderOptionCard)
              }
              {/* Add Stay placeholder */}
              <div
                onClick={() => setShowAddOption(true)}
                className="border-2 border-dashed border-primary/20 rounded-xl flex flex-col items-center justify-center p-8 bg-primary/5 hover:bg-primary/10 transition-colors cursor-pointer group"
              >
                <div className="size-14 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform mb-4">
                  <span className="material-symbols-outlined text-primary text-3xl font-bold">add</span>
                </div>
                <p className="font-bold text-slate-700 dark:text-slate-300">Add another stay</p>
                <p className="text-xs text-slate-500 mt-1 text-center">Compare more options with your group</p>
              </div>
            </div>
          </section>

          {/* Activities Section */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl lg:text-2xl font-serif font-bold flex items-center gap-3">
                <span className="material-symbols-outlined text-primary">local_activity</span>
                Food & Activities
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredOptions
                .filter(ro => ro.option.category !== "stay")
                .map(renderOptionCard)
              }
              {/* Add Activity placeholder */}
              <div
                onClick={() => setShowAddOption(true)}
                className="bg-gradient-to-br from-primary/10 to-transparent border border-primary/20 rounded-xl flex flex-col p-8 items-center justify-center text-center cursor-pointer hover:bg-primary/5 transition-colors"
              >
                <span className="material-symbols-outlined text-primary text-5xl mb-4">near_me</span>
                <h4 className="font-serif font-bold text-lg mb-2">Plan your next move</h4>
                <div className="flex flex-col w-full gap-2 px-4">
                  <button className="w-full py-2 bg-white dark:bg-slate-800 border border-primary/10 rounded-lg text-sm font-bold text-primary hover:bg-primary/5">
                    Browse More
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* Add Option Dialog */}
      <Dialog open={showAddOption} onOpenChange={setShowAddOption}>
        <DialogContent className="max-w-lg w-[95%] p-0 overflow-hidden border-none shadow-2xl rounded-[2.5rem] sm:rounded-[2.5rem]">
          <div className="max-h-[85vh] overflow-y-auto px-6 py-8 scrollbar-hide">
            <DialogHeader className="flex flex-row items-center justify-between pb-6">
              <div className="flex items-center gap-3">
                <div className="size-8 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                  <Plus className="size-4" />
                </div>
                <DialogTitle className="text-xl font-bold font-serif text-slate-900 dark:text-white">Add New Option</DialogTitle>
              </div>
            </DialogHeader>
            <AddOptionForm
              onSubmit={handleAddOption}
              onImageUpload={handleImageUpload}
              tripStartDate={activeTrip?.start_date}
              tripEndDate={activeTrip?.end_date}
              defaultDate={selectedDate || undefined}
              onCancel={() => setShowAddOption(false)}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
