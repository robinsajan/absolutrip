"use client";

import { useState, useMemo, useEffect } from "react";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams, usePathname } from "next/navigation";
import { toast } from "sonner";
import { format, parseISO, differenceInDays, eachDayOfInterval, isSameDay } from "date-fns";
import { useRankedOptions, useTripMembers, useAuth, useTrip } from "@/lib/hooks";
import { useAppStore } from "@/lib/store";
import { options as optionsApi, votes as votesApi, polls as pollsApi } from "@/lib/api/endpoints";
import { cn } from "@/lib/utils";
import { getOptionImages } from "@/lib/image";
import type { RankedOption, TripMember, Poll } from "@/types";
import { AddOptionForm } from "@/components/explore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { FullPageLoader } from "@/components/common/FullPageLoader";

function ImageCarousel({ imageUrls, alt }: { imageUrls: string[], alt: string }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isImageLoading, setIsImageLoading] = useState(true);

  if (!imageUrls || imageUrls.length === 0) {
    return <img alt={alt} className="w-full h-full object-cover font-sans cursor-pointer group-hover:scale-105 transition-transform duration-700" src="https://images.unsplash.com/photo-1530789253388-582c481c54b0?q=80&w=2070&auto=format&fit=crop" />;
  }

  const nextImg = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsImageLoading(true);
    setCurrentIndex((prev) => (prev + 1) % imageUrls.length);
  };

  const prevImg = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsImageLoading(true);
    setCurrentIndex((prev) => (prev - 1 + imageUrls.length) % imageUrls.length);
  };

  return (
    <div className="relative w-full h-full group">
      {isImageLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 z-10 transition-opacity">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      )}
      <img
        alt={alt}
        className={cn(
          "w-full h-full object-cover font-sans transition-all duration-700",
          isImageLoading ? "opacity-0 scale-100" : "opacity-100 scale-100 group-hover:scale-105"
        )}
        src={imageUrls[currentIndex]}
        onLoad={() => setIsImageLoading(false)}
        onError={() => setIsImageLoading(false)}
      />
      {imageUrls.length > 1 && (
        <>

          <button
            onClick={prevImg}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 text-white p-2 rounded-full opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all hover:bg-black/60 z-20 flex items-center justify-center backdrop-blur-sm"
          >
            <span className="material-symbols-outlined text-sm">chevron_left</span>
          </button>
          <button
            onClick={nextImg}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 text-white p-2 rounded-full opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all hover:bg-black/60 z-20 flex items-center justify-center backdrop-blur-sm"
          >
            <span className="material-symbols-outlined text-sm">chevron_right</span>
          </button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
            {imageUrls.map((_, i) => (
              <div key={i} className={cn("w-1.5 h-1.5 rounded-full transition-all duration-300", i === currentIndex ? "bg-white ring-2 ring-white/50 scale-110" : "bg-white/40")} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function ExplorePage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params.tripId as string;
  const { user, logout } = useAuth();
  const { trip: activeTrip } = useTrip(tripId);
  const { rankedOptions, isLoading, mutate } = useRankedOptions(tripId);
  const { members } = useTripMembers(tripId);
  const { showAddOption, setShowAddOption } = useAppStore();

  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewingOption, setViewingOption] = useState<RankedOption | null>(null);
  const [editingOption, setEditingOption] = useState<RankedOption | null>(null);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [tripPolls, setTripPolls] = useState<Poll[]>([]);

  const fetchPolls = async () => {
    try {
      const data = await pollsApi.list(tripId);
      setTripPolls(data.polls);
    } catch (err) {
      console.error("Failed to fetch polls", err);
    }
  };

  useEffect(() => {
    fetchPolls();
  }, [tripId]);

  const stays = useMemo(() => {
    let list = (rankedOptions || []).filter(ro => ro.option.category === 'stay');
    if (selectedDate) {
      list = list.filter(ro => {
        if (!ro.option.check_in_date || !ro.option.check_out_date) return false;
        const start = parseISO(ro.option.check_in_date);
        const end = parseISO(ro.option.check_out_date);
        return selectedDate >= start && selectedDate < end;
      });
    }
    return list.sort((a, b) => {
      const dateA = a.option.check_in_date ? parseISO(a.option.check_in_date).getTime() : 0;
      const dateB = b.option.check_in_date ? parseISO(b.option.check_in_date).getTime() : 0;
      return dateA - dateB;
    });
  }, [rankedOptions, selectedDate]);

  const activities = useMemo(() => {
    let list = (rankedOptions || []).filter(ro => ro.option.category !== 'stay');
    if (selectedDate) {
      list = list.filter(ro => {
        if (!ro.option.check_in_date) return false;
        const start = parseISO(ro.option.check_in_date);
        return isSameDay(selectedDate, start);
      });
    }
    return list.sort((a, b) => {
      const dateA = a.option.check_in_date ? parseISO(a.option.check_in_date).getTime() : 0;
      const dateB = b.option.check_in_date ? parseISO(b.option.check_in_date).getTime() : 0;
      return dateA - dateB;
    });
  }, [rankedOptions, selectedDate]);

  const allFilteredOptions = useMemo(() => [...stays, ...activities], [stays, activities]);

  const tripDates = useMemo(() => {
    if (!activeTrip?.start_date || !activeTrip?.end_date) return [];
    try {
      return eachDayOfInterval({
        start: parseISO(activeTrip.start_date),
        end: parseISO(activeTrip.end_date)
      });
    } catch {
      return [];
    }
  }, [activeTrip]);

  // Sync state with URL on mount or when rankedOptions changes
  useEffect(() => {
    if (!rankedOptions || rankedOptions.length === 0) return;

    const modal = searchParams.get("modal");
    if (modal === "add-option") {
      setShowAddOption(true);
    }

    const viewingId = searchParams.get("viewing");
    if (viewingId) {
      const option = rankedOptions.find(ro => ro.option.id.toString() === viewingId);
      if (option) setViewingOption(option);
    }

    const editingId = searchParams.get("editing");
    if (editingId) {
      const option = rankedOptions.find(ro => ro.option.id.toString() === editingId);
      if (option) setEditingOption(option);
    }
  }, [rankedOptions, searchParams, setShowAddOption]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Keyboard navigation for viewing modal
  useEffect(() => {
    if (!viewingOption || !allFilteredOptions.length) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        const idx = allFilteredOptions.findIndex(o => o.option.id === viewingOption.option.id);
        if (idx > 0) setViewingOption(allFilteredOptions[idx - 1]);
      } else if (e.key === "ArrowRight") {
        const idx = allFilteredOptions.findIndex(o => o.option.id === viewingOption.option.id);
        if (idx < allFilteredOptions.length - 1) setViewingOption(allFilteredOptions[idx + 1]);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [viewingOption, allFilteredOptions]);

  const isOwner = useMemo(() => {
    if (!user || !members) return false;
    const membership = members.find((m: TripMember) => m.user_id === user.id);
    return membership?.role === "owner";
  }, [user, members]);

  const handleVote = async (optionId: number, score: number) => {
    if (activeTrip?.is_past) {
      toast.error("VOTING BLOCKED: This trip has ended.");
      return;
    }

    // Optimistic update
    const currentOptions = rankedOptions || [];
    const optimisticOptions = currentOptions.map(ro => {
      if (ro.option.id === optionId) {
        const userVote = ro.voters.find(v => v.user_id === user?.id);
        const oldScore = userVote ? userVote.score : 0;
        const newVoters = userVote
          ? ro.voters.map(v => v.user_id === user?.id ? { ...v, score } : v)
          : [...ro.voters, { user_id: user!.id, score, user_name: user!.name }];

        return {
          ...ro,
          vote_count: ro.vote_count + (score > 0 ? (oldScore > 0 ? 0 : 1) : (oldScore > 0 ? -1 : 0)),
          total_score: ro.total_score - oldScore + score,
          voters: newVoters
        };
      }
      return ro;
    });

    try {
      // Update SWR cache immediately
      mutate({ ...rankedOptions, ranked_options: optimisticOptions }, false);

      await votesApi.cast(optionId, score);
      mutate(); // Revalidate from server
      toast.success(score > 0 ? "Voted!" : "Vote removed");
    } catch (error: any) {
      mutate(); // Rollback on error
      toast.error(error.response?.data?.error || "Failed to vote");
    }
  };


  const handleAddOption = async (data: any) => {
    if (activeTrip?.is_past) {
      toast.error("EDITING BLOCKED: This trip has ended.");
      return { option: { id: 0 } };
    }

    if (data.category === 'poll') {
      const result = await pollsApi.create(tripId, data);
      fetchPolls();
      setShowAddOption(false);
      return { option: { id: result.poll.id } }; // Mocking option id for compatibility
    }

    const result = await optionsApi.create(tripId, data);
    mutate();
    setShowAddOption(false);
    return result;
  };

  const handleUpdateOption = async (data: any) => {
    if (activeTrip?.is_past) {
      toast.error("EDITING BLOCKED: This trip has ended.");
      return { option: { id: 0 } };
    }
    if (!editingOption) return { option: { id: 0 } };
    const result = await optionsApi.update(editingOption.option.id, data);
    mutate();
    setEditingOption(null);
    toast.success("Option updated!");
    return result;
  };

  const handleImageUpload = async (optionId: number, file: File) => {
    await optionsApi.uploadImage(optionId, file);
    mutate();
  };

  const handleFinalize = async (optionId: number) => {
    if (activeTrip?.is_past) {
      toast.error("SELECTION BLOCKED: This trip has ended.");
      return;
    }
    const optionToFinalize = (rankedOptions || []).find(ro => ro.option.id === optionId)?.option;
    if (!optionToFinalize) return;

    if (optionToFinalize.check_in_date) {
      const currentFinalized = rankedOptions.filter(ro => ro.option.is_finalized);
      const start = parseISO(optionToFinalize.check_in_date);
      const end = optionToFinalize.check_out_date ? parseISO(optionToFinalize.check_out_date) : start;

      const conflict = currentFinalized.find(ro => {
        if (!ro.option.check_in_date) return false;
        const fStart = parseISO(ro.option.check_in_date);
        const fEnd = ro.option.check_out_date ? parseISO(ro.option.check_out_date) : fStart;
        if (optionToFinalize.category === 'stay' && ro.option.category === 'stay') {
          return start < fEnd && end > fStart;
        }
        if (optionToFinalize.category !== 'stay' && ro.option.category !== 'stay') {
          return isSameDay(start, fStart);
        }
        return false;
      });

      if (conflict) {
        const conflictDate = format(parseISO(conflict.option.check_in_date!), "MMM d");
        toast.error(`There is a conflict! You have already selected "${conflict.option.title}" for ${conflictDate}.`);
        return;
      }
    }

    try {
      await optionsApi.finalize(optionId);
      toast.success("Option selected! ✨");
      mutate();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to select option");
    }
  };

  const handleUnfinalize = async (optionId: number) => {
    if (activeTrip?.is_past) {
      toast.error("SELECTION BLOCKED: This trip has ended.");
      return;
    }
    try {
      await optionsApi.unfinalize(optionId);
      toast.success("Selection removed");
      mutate();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to remove selection");
    }
  };

  const handleDelete = async (optionId: number) => {
    if (activeTrip?.is_past) {
      toast.error("DELETION BLOCKED: This trip has ended.");
      return;
    }
    try {
      if (confirm("Are you sure you want to delete this option?")) {
        await optionsApi.delete(optionId);
        toast.success("Option deleted");
        mutate();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to delete option");
    }
  };



  if (!mounted) return null;

  const renderOptionCard = (ro: RankedOption) => {
    const userVote = ro.voters.find(v => v.user_id === user?.id);
    const hasVoted = !!userVote && userVote.score > 0;
    const isFinalized = ro.option.is_finalized;
    const isStay = ro.option.category === "stay";

    const imageUrls = getOptionImages(ro.option);

    const nights = ro.option.check_in_date && ro.option.check_out_date
      ? Math.max(1, differenceInDays(parseISO(ro.option.check_out_date), parseISO(ro.option.check_in_date)))
      : 1;

    const memberCount = Math.max(1, members?.length || 0);
    const unitPrice = ro.option.price_per_day_pp ?? (ro.option.price / memberCount);
    const groupTotal = ro.option.total_price ?? (unitPrice * memberCount * nights);
    const ppPerDay = unitPrice;

    return (
      <div key={ro.option.id} className={cn(
        "group rounded-[1.5rem] md:rounded-[2rem] overflow-hidden border-2 transition-all hover:-translate-y-1 shrink-0",
        "w-[60%] sm:w-[calc(50%-1rem)] md:w-[calc(33.33%-1.5rem)] lg:w-[calc(25%-1.5rem)] xl:w-[calc(20%-1.5rem)] 2xl:w-[calc(14.28%-1.5rem)]",
        isFinalized
          ? "border-green-500 shadow-2xl scale-[1.02] bg-white dark:bg-gray-900 z-10"
          : hasVoted
            ? "border-primary shadow-xl shadow-primary/5 bg-white dark:bg-gray-900"
            : "border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-lg bg-white dark:bg-gray-900"
      )}>
        <div className="relative h-32 md:h-48 overflow-hidden rounded-t-[1.5rem] md:rounded-t-[2rem]">
          <ImageCarousel imageUrls={imageUrls} alt={ro.option.title} />
          <div className="absolute top-2 left-2 md:top-4 md:left-4 flex flex-col md:flex-row gap-2 z-20">
            <div className="bg-black/60 backdrop-blur-md text-white h-5 md:h-7 px-2.5 md:px-4 rounded-full text-[8px] md:text-[10px] font-black uppercase tracking-[0.1em] flex items-center justify-center border border-white/10 shadow-lg whitespace-nowrap shrink-0">
              {ro.option.category || "activity"}
            </div>
            {isFinalized && (
              <div className="bg-green-500 text-white size-5 md:size-7 rounded-full flex items-center justify-center shadow-lg animate-in zoom-in duration-300">
                <span className="material-symbols-outlined text-[10px] md:text-[14px] font-black material-symbols-filled">check</span>
              </div>
            )}
          </div>
          <button
            onClick={() => handleVote(ro.option.id, hasVoted ? 0 : 1)}
            className={cn(
              "absolute top-2 right-2 md:top-3 md:right-3 flex items-center justify-center transition-all hover:scale-125 active:scale-90 z-20",
              hasVoted ? "text-red-500 drop-shadow-sm" : "text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]"
            )}
          >
            <span className={cn("material-symbols-outlined text-xl md:text-2xl", hasVoted && "material-symbols-filled")}>favorite</span>
            {ro.vote_count > 0 && (
              <span className="absolute -bottom-1 -right-1 bg-white text-black text-[6px] md:text-[7px] font-black w-3 md:w-3.5 h-3 md:h-3.5 rounded-full flex items-center justify-center shadow-sm">
                {ro.vote_count}
              </span>
            )}
          </button>
        </div>
        <div className="p-2.5 md:p-4 flex flex-col h-full">
          <div className="flex justify-between items-start mb-1 gap-2">
            <h3 className="text-sm md:text-lg font-black text-gray-900 dark:text-white tracking-tight line-clamp-1">{ro.option.title}</h3>
            <div className="flex items-center gap-1 shrink-0">
              {ro.option.link && (
                <a href={ro.option.link} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-primary transition-colors">
                  <span className="material-symbols-outlined text-sm md:text-lg">north_east</span>
                </a>
              )}
              <div className="flex items-center gap-1">
                {ro.option.added_by === user?.id && (
                  <button onClick={() => setEditingOption(ro)} className="text-slate-400 hover:text-primary transition-colors ml-1">
                    <span className="material-symbols-outlined text-sm md:text-lg">edit</span>
                  </button>
                )}
                {(isOwner || ro.option.added_by === user?.id) && (
                  <button onClick={() => handleDelete(ro.option.id)} className="text-red-400 hover:text-red-600 transition-colors">
                    <span className="material-symbols-outlined text-sm md:text-lg">delete</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          <div>
            {ro.option.check_in_date && (
              <div className="flex items-center gap-1.5 mb-2 md:mb-3 p-2 md:p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg md:rounded-xl border border-slate-100 dark:border-slate-800/50">
                <span className="material-symbols-outlined text-xs md:text-sm text-primary">calendar_today</span>
                <span className="text-[9px] md:text-[11px] font-black uppercase tracking-tight text-slate-600 dark:text-slate-300">
                  {format(parseISO(ro.option.check_in_date), "MMM d")}
                  {ro.option.check_out_date && ` — ${format(parseISO(ro.option.check_out_date), "MMM d")}`}
                </span>
              </div>
            )}
            <div className="mt-2 pt-3 border-t border-gray-50 dark:border-gray-800 flex justify-between items-center">
              <div>
                <p className="text-[7px] md:text-[8px] uppercase font-black text-primary/70 tracking-widest mb-0.5"> per person per night</p>
                <p className="text-base md:text-lg font-black text-primary leading-none">₹{Math.round(ppPerDay).toLocaleString('en-IN')}</p>
              </div>
              <button
                onClick={() => setViewingOption(ro)}
                className="size-8 rounded-full border border-slate-100 dark:border-slate-800 flex items-center justify-center text-slate-400 hover:text-black dark:hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined text-base">arrow_forward</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderPollCard = (poll: Poll) => {
    const totalVotes = poll.total_votes;
    const userVotedOptionIds = poll.options
      .filter(opt => opt.has_voted)
      .map(opt => opt.id);

    const handlePollVote = async (optionId: number) => {
      if (activeTrip?.is_past) {
        toast.error("VOTING BLOCKED: This trip has ended.");
        return;
      }

      const originalPolls = [...tripPolls];
      const nextPolls = tripPolls.map(p => {
        if (p.id === poll.id) {
          const isRemoving = p.options.find(o => o.id === optionId)?.has_voted;
          const nextOptions = p.options.map(opt => {
            if (opt.id === optionId) {
              return {
                ...opt,
                has_voted: !opt.has_voted,
                vote_count: opt.vote_count + (!opt.has_voted ? 1 : -1)
              };
            }
            if (!p.allow_multiple && !isRemoving) {
              return {
                ...opt,
                has_voted: false,
                vote_count: opt.has_voted ? opt.vote_count - 1 : opt.vote_count
              };
            }
            return opt;
          });

          const nextTotalVotes = nextOptions.reduce((acc, curr) => acc + curr.vote_count, 0);
          return { ...p, options: nextOptions, total_votes: nextTotalVotes };
        }
        return p;
      });

      setTripPolls(nextPolls);

      let nextOptionIds: number[] = [];
      const updatedPoll = nextPolls.find(p => p.id === poll.id)!;
      nextOptionIds = updatedPoll.options.filter(o => o.has_voted).map(o => o.id);

      try {
        await pollsApi.vote(poll.id, nextOptionIds);
        fetchPolls();
      } catch (err) {
        setTripPolls(originalPolls);
        toast.error("Failed to vote on poll");
      }
    };

    const handleDeletePoll = async () => {
      if (confirm("Delete this poll?")) {
        try {
          await pollsApi.delete(poll.id);
          fetchPolls();
          toast.success("Poll deleted");
        } catch (err) {
          toast.error("Failed to delete poll");
        }
      }
    };

    return (
      <div key={poll.id} className="group rounded-[1.5rem] md:rounded-[2rem] overflow-hidden border-2 border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 w-[85%] sm:w-[calc(50%-1rem)] md:w-[calc(33.33%-1.5rem)] lg:w-[calc(25%-1.5rem)] shrink-0 transition-all hover:shadow-lg">
        <div className="flex justify-between items-start mb-4">
          <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border border-primary/5">
            Poll
          </div>
          {(isOwner || poll.created_by === user?.id) && (
            <button onClick={handleDeletePoll} className="text-gray-400 hover:text-red-500 transition-colors">
              <span className="material-symbols-outlined text-sm">delete</span>
            </button>
          )}
        </div>
        <h3 className="text-base md:text-lg font-black text-gray-900 dark:text-white tracking-tight leading-tight mb-4">{poll.question}</h3>
        <div className="space-y-3">
          {poll.options.map(opt => {
            const isSelected = userVotedOptionIds.includes(opt.id);
            const percentage = totalVotes > 0 ? Math.round((opt.vote_count / totalVotes) * 100) : 0;
            return (
              <button
                key={opt.id}
                onClick={() => handlePollVote(opt.id)}
                className={cn(
                  "w-full relative h-10 rounded-xl border transition-all text-left overflow-hidden flex items-center px-4 group/opt",
                  isSelected
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-gray-100 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700"
                )}
              >
                <div
                  className={cn(
                    "absolute left-0 top-0 h-full transition-all duration-500",
                    isSelected ? "bg-primary/10" : "bg-gray-50 dark:bg-gray-800"
                  )}
                  style={{ width: `${percentage}%` }}
                />
                <div className="relative flex justify-between w-full items-center z-10">
                  <span className="text-xs font-bold truncate pr-2">{opt.text}</span>
                  <span className="text-[10px] font-black opacity-60 shrink-0">{percentage}%</span>
                </div>
              </button>
            );
          })}
        </div>
        <div className="mt-4 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
          <span>{totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}</span>
          {poll.allow_multiple && <span className="opacity-60 italic">multiple choices</span>}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-background font-sans text-gray-900 dark:text-gray-100">
      <div className="w-full px-4 pt-10 pb-12 md:px-6 md:pt-16 md:pb-24">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <Popover open={isPopoverOpen} onOpenChange={(open) => setIsPopoverOpen(open)}>
                <PopoverTrigger asChild>
                  <button className={cn(
                    "size-10 md:size-12 rounded-full flex items-center justify-center transition-all shadow-xl",
                    selectedDate ? "bg-black text-[#ccff00] dark:bg-white dark:text-black scale-105" : "bg-white dark:bg-slate-800 text-slate-400 border border-slate-100 dark:border-slate-800"
                  )}>
                    <span className="material-symbols-outlined text-xl md:text-2xl">calendar_today</span>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="p-0 border-none rounded-[2rem] shadow-2xl overflow-hidden bg-white dark:bg-slate-900 z-[200]" align="start">
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setSelectedDate(null);
                        setIsPopoverOpen(false);
                      }}
                      className="w-full text-[10px] font-black uppercase tracking-[0.2em] h-12 rounded-xl text-slate-500 hover:bg-white dark:hover:bg-slate-800 hover:text-black dark:hover:text-white"
                    >
                      Show All Days
                    </Button>
                  </div>
                  <div className="px-4 pb-4 pt-2">
                    <Calendar
                      className="p-0 sm:p-0 font-sans"
                      mode="single"
                      selected={selectedDate || undefined}
                      onSelect={(d) => {
                        setSelectedDate(d || null);
                        setIsPopoverOpen(false);
                      }}
                      defaultMonth={activeTrip?.start_date ? parseISO(activeTrip.start_date) : undefined}
                      disabled={(date) => {
                        if (!activeTrip?.start_date || !activeTrip?.end_date) return false;
                        const start = parseISO(activeTrip.start_date);
                        const end = activeTrip.end_date ? parseISO(activeTrip.end_date) : start;
                        start.setHours(0, 0, 0, 0);
                        end.setHours(0, 0, 0, 0);
                        const checkDate = new Date(date);
                        checkDate.setHours(0, 0, 0, 0);
                        return checkDate < start || checkDate > end;
                      }}
                      fromDate={activeTrip?.start_date ? parseISO(activeTrip.start_date) : undefined}
                      toDate={activeTrip?.end_date ? parseISO(activeTrip.end_date) : undefined}
                      initialFocus

                    />
                  </div>
                </PopoverContent>
              </Popover>
              <div className="flex flex-col">
                <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none mb-1">Filtering</span>
                <span className="text-sm md:text-lg font-extrabold text-black dark:text-white serif-title italic leading-none">
                  {selectedDate ? format(selectedDate as Date, "MMM d, yyyy") : "all days"}
                </span>
              </div>
            </div>

          </div>

          <button
            onClick={() => setShowAddOption(true)}
            className="hidden md:flex bg-black dark:bg-white dark:text-black text-white px-8 py-4 rounded-full font-black text-[10px] uppercase tracking-widest items-center gap-2 hover:opacity-90 transition-all shadow-xl shadow-black/5"
          >
            <span className="material-symbols-outlined text-xl">add</span>
            add option
          </button>
        </div>

        {/* Mobile Fixed Add Button (Keep for accessibility) */}
        <button
          onClick={() => setShowAddOption(true)}
          style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 4.5rem)" }}
          className="md:hidden fixed right-4 z-40 bg-black dark:bg-white dark:text-black text-white w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-transform active:scale-90 animate-in fade-in zoom-in duration-500"
          aria-label="Add option"
        >
          <span className="material-symbols-outlined text-3xl">add</span>
        </button>

        {isLoading ? (
          <FullPageLoader />
        ) : (rankedOptions?.length === 0 && tripPolls.length === 0) ? (
          <div className="bg-white dark:bg-gray-900 rounded-[3rem] p-20 text-center border border-gray-100 dark:border-gray-800">
            <h3 className="text-3xl font-extrabold mb-4">No options yet</h3>
            <p className="text-gray-500">Help your group decide! Add stays or activities.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {stays.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex flex-col">
                    <span className="text-[14px] font-black uppercase tracking-widest text-black dark:text-white hover:text-primary transition-colors">Stays ({stays.length})</span>
                    {/* <h2 className="text-2xl md:text-4xl font-black text-gray-900 dark:text-white tracking-tighter italic serif-title lowercase">Stays ({stays.length})</h2> */}
                  </div>
                  {(stays.length > 6 || (stays.length > 2)) && (
                    <Link
                      href={`/trip/${tripId}/explore/stays`}
                      className={cn("group flex items-center gap-1.5 transition-all", stays.length <= 6 && "md:hidden")}
                    >
                      <span className="text-[10px] font-black uppercase tracking-widest text-black dark:text-white hover:text-primary transition-colors">View all stays</span>
                      <span className="material-symbols-outlined text-sm text-black dark:text-white group-hover:translate-x-1 transition-transform">arrow_forward</span>
                    </Link>
                  )}
                </div>
                <div className="flex overflow-x-auto md:flex md:flex-wrap gap-4 md:gap-6 pt-1 pb-8 scrollbar-hide snap-x">
                  {stays.slice(0, 6).map(renderOptionCard)}
                  {stays.length > 6 && (
                    <Link
                      href={`/trip/${tripId}/explore/stays`}
                      className="group shrink-0 flex flex-col items-center justify-center w-[60%] sm:w-[calc(50%-1rem)] md:w-[calc(33.33%-1.5rem)] lg:w-[calc(25%-1.5rem)] xl:w-[calc(20%-1.5rem)] 2xl:w-[calc(14.28%-1.5rem)] min-h-[12rem]"
                    >
                      <div className="size-20 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-all shadow-md active:scale-95 group-hover:scale-110">
                        <span className="material-symbols-outlined text-3xl">arrow_forward</span>
                      </div>
                      <span className="mt-4 text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover:text-primary transition-colors text-center leading-tight">
                        view all<br />stays
                      </span>
                    </Link>
                  )}
                </div>
              </div>
            )}
            {activities.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-8">
                  <div className="flex flex-col">
                    <span className="text-[14px] font-black uppercase tracking-widest text-black dark:text-white hover:text-primary transition-colors">Activities ({activities.length})</span>
                    {/* <h2 className="text-2xl md:text-4xl font-black text-gray-900 dark:text-white tracking-tighter italic serif-title lowercase">Activities ({activities.length})</h2> */}
                  </div>
                  {(activities.length > 6 || (activities.length > 2)) && (
                    <Link
                      href={`/trip/${tripId}/explore/activities`}
                      className={cn("group flex items-center gap-1.5 transition-all", activities.length <= 6 && "md:hidden")}
                    >
                      <span className="text-[10px] font-black uppercase tracking-widest text-black dark:text-white hover:text-primary transition-colors">View all activities</span>
                      <span className="material-symbols-outlined text-sm text-black dark:text-white group-hover:translate-x-1 transition-transform">arrow_forward</span>
                    </Link>
                  )}
                </div>
                <div className="flex overflow-x-auto md:flex md:flex-wrap gap-4 md:gap-6 pt-1 pb-8 scrollbar-hide snap-x">
                  {activities.slice(0, 6).map(renderOptionCard)}
                  {activities.length > 6 && (
                    <Link
                      href={`/trip/${tripId}/explore/activities`}
                      className="group shrink-0 flex flex-col items-center justify-center w-[60%] sm:w-[calc(50%-1rem)] md:w-[calc(33.33%-1.5rem)] lg:w-[calc(25%-1.5rem)] xl:w-[calc(20%-1.5rem)] 2xl:w-[calc(14.28%-1.5rem)] min-h-[12rem]"
                    >
                      <div className="size-20 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-all shadow-md active:scale-95 group-hover:scale-110">
                        <span className="material-symbols-outlined text-3xl">arrow_forward</span>
                      </div>
                      <span className="mt-4 text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover:text-primary transition-colors text-center leading-tight">
                        view all<br />activities
                      </span>
                    </Link>
                  )}
                </div>
              </div>
            )}

            {tripPolls.length > 0 && (
              <div className="pt-8">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex flex-col">
                    <span className="text-[14px] font-black uppercase tracking-widest text-black dark:text-white hover:text-primary transition-colors">Polls ({tripPolls.length})</span>
                    {/* <h2 className="text-2xl md:text-4xl font-black text-gray-900 dark:text-white tracking-tighter italic serif-title lowercase">active polls ({tripPolls.length})</h2> */}
                  </div>
                  {tripPolls.length > 4 && (
                    <Link
                      href={`/trip/${tripId}/explore/polls`}
                      className="group flex items-center gap-1.5 transition-all"
                    >
                      <span className="text-[10px] font-black uppercase tracking-widest text-black dark:text-white hover:text-primary transition-colors">View all polls</span>
                      <span className="material-symbols-outlined text-sm text-black dark:text-white group-hover:translate-x-1 transition-transform">arrow_forward</span>
                    </Link>
                  )}
                </div>
                <div className="flex overflow-x-auto gap-4 md:gap-6 pt-1 pb-8 scrollbar-hide snap-x">
                  {tripPolls.slice(0, 4).map(renderPollCard)}
                  {tripPolls.length > 4 && (
                    <Link
                      href={`/trip/${tripId}/explore/polls`}
                      className="min-w-[200px] md:min-w-[240px] flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900/50 rounded-[1.5rem] md:rounded-[2rem] border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-primary transition-all group snap-start"
                    >
                      <div className="size-12 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                        <span className="material-symbols-outlined text-2xl text-primary">ballot</span>
                      </div>
                      <span className="mt-4 text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover:text-primary transition-colors text-center leading-tight">
                        view all<br />polls ({tripPolls.length})
                      </span>
                    </Link>
                  )}
                </div>
              </div>
            )}

            {stays.length === 0 && activities.length === 0 && (
              <div className="py-20 text-center bg-white dark:bg-gray-900 rounded-[3rem] border border-gray-100 dark:border-gray-800">
                <p className="text-slate-400 font-bold italic lowercase tracking-widest">no options matched for this day</p>
              </div>
            )}
          </div>
        )}
      </div>



      <Dialog open={showAddOption} onOpenChange={setShowAddOption} urlKey="modal" urlValue="add-option">
        <DialogContent className="p-0 pt-[70px] overflow-hidden border-none bg-white dark:bg-slate-900">

          <div className="h-full overflow-y-auto px-8 py-10 scrollbar-hide">
            <DialogHeader className="pb-8">
              <DialogTitle className="text-3xl font-extrabold serif-title italic">add new option</DialogTitle>
            </DialogHeader>
            <AddOptionForm
              onSubmit={handleAddOption}
              onImageUpload={handleImageUpload}
              tripStartDate={activeTrip?.start_date}
              tripEndDate={activeTrip?.end_date}
              initialData={undefined}
              onCancel={() => { setShowAddOption(false); }}
            />
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!viewingOption}
        onOpenChange={(open) => !open && setViewingOption(null)}
        urlKey="viewing"
        urlValue={viewingOption?.option.id.toString()}
      >
        <DialogContent className="p-0 overflow-hidden border-none bg-white dark:bg-slate-900">
          <DialogTitle className="sr-only">Option Details</DialogTitle>
          {viewingOption && (
            <div className="relative h-full overflow-y-auto scrollbar-hide modal-scroll-area">

              <div className="relative h-80 md:h-[510px]">
                <ImageCarousel imageUrls={getOptionImages(viewingOption.option)} alt={viewingOption.option.title} />
                {/* Like Button in Modal */}
                <button
                  onClick={() => {
                    const userVote = viewingOption.voters.find(v => v.user_id === user?.id);
                    const hasVoted = !!userVote && userVote.score > 0;
                    handleVote(viewingOption.option.id, hasVoted ? 0 : 1);
                  }}
                  className={cn(
                    "absolute bottom-4 right-4 flex items-center justify-center transition-all hover:scale-125 active:scale-90 z-20",
                    viewingOption.voters.some(v => v.user_id === user?.id && v.score > 0) ? "text-red-500 drop-shadow-sm" : "text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]"
                  )}
                >
                  <span className={cn("material-symbols-outlined text-2xl md:text-3xl", viewingOption.voters.some(v => v.user_id === user?.id && v.score > 0) && "material-symbols-filled")}>favorite</span>
                  {viewingOption.vote_count > 0 && (
                    <span className="absolute -bottom-1 -right-1 bg-white text-black text-[8px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-sm">
                      {viewingOption.vote_count}
                    </span>
                  )}
                </button>
              </div>

              <div className="px-8 py-6 space-y-4">
                <div className="flex flex-wrap gap-2 mt-[-0.5rem] mb-1">
                  <div className="bg-slate-100 dark:bg-slate-800 text-primary px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-slate-200 dark:border-slate-700 whitespace-nowrap shrink-0">
                    {viewingOption.option.category || "activity"}
                  </div>
                  {viewingOption.option.is_finalized && (
                    <div className="bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-green-200 dark:border-green-500/20">
                      Selected
                    </div>
                  )}
                </div>
                <div>
                  <div className="flex items-start gap-3">
                    <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-2 serif-title italic flex-1 min-w-0">
                      {viewingOption.option.title}
                    </h3>
                    {viewingOption.option.link && (
                      <a
                        href={viewingOption.option.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-flex items-center gap-1.5 text-primary hover:text-primary/80 transition-colors shrink-0"
                        aria-label="Visit website"
                        title="Visit website"
                      >
                        <span className="material-symbols-outlined text-[14px] leading-none">arrow_outward</span>
                      </a>
                    )}
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 text-xs font-medium leading-relaxed">
                    {viewingOption.option.notes || viewingOption.option.link_description || "No additional description provided."}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {viewingOption.option.check_in_date && (
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                      <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-1 select-none">Dates</p>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                          {format(parseISO(viewingOption.option.check_in_date), "MMM d")}
                          {viewingOption.option.check_out_date ? ` - ${format(parseISO(viewingOption.option.check_out_date), "MMM d")}` : ""}
                        </span>
                      </div>
                    </div>
                  )}
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-1 select-none">Proposed by</p>
                    <div className="flex items-center gap-2">
                      <div className="size-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black text-[10px]">
                        {(members?.find(m => m.user_id === viewingOption.option.added_by)?.user_name || "U").charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">
                        {members?.find(m => m.user_id === viewingOption.option.added_by)?.user_name || "Trip Member"}
                      </span>
                    </div>
                  </div>
                </div>


                <div className="p-4 bg-primary/5 rounded-[1.5rem] border border-primary/10">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-[9px] uppercase font-black text-slate-400 tracking-widest mb-1 leading-none">Total Group Price</p>
                      <p className="text-xl font-black text-slate-900 dark:text-white leading-none mt-1">₹{Math.round(
                        (viewingOption.option.price_per_day_pp ?? (viewingOption.option.price / Math.max(1, members?.length || 0))) *
                        Math.max(1, members?.length || 0) *
                        (viewingOption.option.check_in_date && viewingOption.option.check_out_date ? Math.max(1, differenceInDays(parseISO(viewingOption.option.check_out_date), parseISO(viewingOption.option.check_in_date))) : 1)
                      ).toLocaleString('en-IN')}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] uppercase font-black text-primary/70 tracking-widest mb-1 leading-none">Per Person</p>
                      <p className="text-2xl font-black text-primary leading-none mt-1">₹{Math.round(viewingOption.option.price_per_day_pp ?? (viewingOption.option.price / Math.max(1, members?.length || 0))).toLocaleString('en-IN')}</p>
                    </div>
                  </div>
                </div>

                {isOwner && (
                  <button
                    onClick={() => {
                      viewingOption.option.is_finalized ? handleUnfinalize(viewingOption.option.id) : handleFinalize(viewingOption.option.id);
                      setViewingOption(null);
                    }}
                    className={cn(
                      "w-full py-5 rounded-2xl font-black flex items-center justify-center gap-3 transition-all shadow-xl uppercase tracking-widest text-xs",
                      viewingOption.option.is_finalized
                        ? "bg-green-500 text-white shadow-green-500/20 hover:scale-[1.02] active:scale-95"
                        : "bg-black dark:bg-white text-white dark:text-black shadow-black/20 hover:scale-[1.02] active:scale-95"
                    )}
                  >
                    <span className="material-symbols-outlined text-xl">
                      {viewingOption.option.is_finalized ? "check_circle" : "sell"}
                    </span>
                    {viewingOption.option.is_finalized ? "Selected" : "Select this option"}
                  </button>
                )}

                {/* Pagination Controls */}
                <div className="flex items-center justify-between pt-10 border-t border-gray-100 dark:border-gray-800 max-w-xl mx-auto w-full">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      const idx = allFilteredOptions.findIndex(o => o.option.id === viewingOption.option.id);
                      if (idx > 0) setViewingOption(allFilteredOptions[idx - 1]);
                      document.querySelector('.modal-scroll-area')?.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    disabled={allFilteredOptions.findIndex(o => o.option.id === viewingOption.option.id) === 0}
                    className="rounded-2xl h-12 md:h-14 px-4 md:px-8 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                  >
                    <span className="material-symbols-outlined text-sm md:text-base">arrow_back</span>
                    <span className="hidden sm:inline">Prev</span>
                  </Button>

                  <div className="flex flex-col items-center">
                    <span className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Explore</span>
                    <span className="text-xs md:text-sm font-black text-primary leading-none">
                      {allFilteredOptions.findIndex(o => o.option.id === viewingOption.option.id) + 1} <span className="text-slate-300 mx-1">/</span> {allFilteredOptions.length}
                    </span>
                  </div>

                  <Button
                    variant="ghost"
                    onClick={() => {
                      const idx = allFilteredOptions.findIndex(o => o.option.id === viewingOption.option.id);
                      if (idx < allFilteredOptions.length - 1) setViewingOption(allFilteredOptions[idx + 1]);
                      document.querySelector('.modal-scroll-area')?.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    disabled={allFilteredOptions.findIndex(o => o.option.id === viewingOption.option.id) === allFilteredOptions.length - 1}
                    className="rounded-2xl h-12 md:h-14 px-4 md:px-8 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                  >
                    <span className="hidden sm:inline">Next</span>
                    <span className="material-symbols-outlined text-sm md:text-base">arrow_forward</span>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!editingOption}
        onOpenChange={(open) => !open && setEditingOption(null)}
        urlKey="editing"
        urlValue={editingOption?.option.id.toString()}
      >
        <DialogContent className="p-0 pt-[70px] overflow-hidden border-none bg-white dark:bg-slate-900">

          <div className="h-full overflow-y-auto px-8 py-10 scrollbar-hide">
            <DialogHeader className="pb-8">
              <DialogTitle className="text-3xl font-extrabold serif-title italic">edit option</DialogTitle>
            </DialogHeader>
            {editingOption && (
              <AddOptionForm
                onSubmit={handleUpdateOption}
                onImageUpload={handleImageUpload}
                tripStartDate={activeTrip?.start_date}
                tripEndDate={activeTrip?.end_date}
                initialData={{
                  id: editingOption.option.id,
                  title: editingOption.option.title,
                  link: editingOption.option.link,
                  price: editingOption.option.price,
                  notes: editingOption.option.notes,
                  check_in_date: editingOption.option.check_in_date,
                  check_out_date: editingOption.option.check_out_date,
                  category: editingOption.option.category as any,
                  is_per_person: editingOption.option.is_per_person,
                  is_per_night: editingOption.option.is_per_night,
                  image_url: getOptionImages(editingOption.option)[0]
                }}
                onCancel={() => { setEditingOption(null); }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
