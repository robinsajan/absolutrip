"use client";

import { useState, useMemo, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { format, parseISO, differenceInDays, eachDayOfInterval, isSameDay } from "date-fns";
import { useRankedOptions, useTripMembers, useAuth, useTrip } from "@/lib/hooks";
import { useAppStore } from "@/lib/store";
import { options as optionsApi, votes as votesApi } from "@/lib/api/endpoints";
import { cn } from "@/lib/utils";
import { getOptionImages } from "@/lib/image";
import type { RankedOption, TripMember } from "@/types";
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

  const [mounted, setMounted] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewingOption, setViewingOption] = useState<RankedOption | null>(null);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const isOwner = useMemo(() => {
    if (!user || !members) return false;
    const membership = members.find((m: TripMember) => m.user_id === user.id);
    return membership?.role === "owner";
  }, [user, members]);

  const handleVote = async (optionId: number, score: number) => {
    try {
      await votesApi.cast(optionId, score);
      mutate();
      toast.success(score > 0 ? "Voted!" : "Vote removed");
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to vote");
    }
  };

  const handleAddOption = async (data: any) => {
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
    try {
      await optionsApi.unfinalize(optionId);
      toast.success("Selection removed");
      mutate();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to remove selection");
    }
  };

  const handleDelete = async (optionId: number) => {
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
    return (rankedOptions || [])
      .filter(ro => ro.option.category !== 'stay')
      .sort((a, b) => {
        const dateA = a.option.check_in_date ? parseISO(a.option.check_in_date).getTime() : 0;
        const dateB = b.option.check_in_date ? parseISO(b.option.check_in_date).getTime() : 0;
        return dateA - dateB;
      });
  }, [rankedOptions]);

  const allFilteredOptions = useMemo(() => [...stays, ...activities], [stays, activities]);

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
        "group bg-white dark:bg-gray-900 rounded-[1.5rem] md:rounded-[2rem] overflow-hidden border-2 transition-all hover:-translate-y-1 shrink-0",
        "w-[280px] md:w-[240px] lg:w-[260px] xl:w-[280px] 2xl:w-[calc(14.28%-1.5rem)] min-w-[200px] max-w-[360px]",
        hasVoted ? "border-primary shadow-xl shadow-primary/5" : "border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-lg"
      )}>
        <div className="relative h-32 md:h-48 overflow-hidden rounded-t-[1.5rem] md:rounded-t-[2rem]">
          <ImageCarousel imageUrls={imageUrls} alt={ro.option.title} />
          <div className="absolute top-2 left-2 md:top-4 md:left-4 flex flex-col md:flex-row gap-1.5 z-20">
            <div className="bg-black/60 backdrop-blur-md text-white px-2 py-0.5 md:px-3 md:py-1 rounded-full text-[6px] md:text-[8px] font-black uppercase tracking-widest w-fit">
              {ro.option.category || "activity"}
            </div>
            {isFinalized && (
              <div className="bg-green-500 text-white px-2 py-0.5 md:px-3 md:py-1 rounded-full text-[6px] md:text-[8px] font-black uppercase tracking-widest shadow-lg w-fit">
                Selected
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
        <div className="p-3 md:p-4 flex flex-col h-full">
          <div className="flex justify-between items-start mb-1 gap-2">
            <h3 className="text-sm md:text-lg font-black text-gray-900 dark:text-white tracking-tight line-clamp-1">{ro.option.title}</h3>
            <div className="flex items-center gap-1 shrink-0">
              {ro.option.link && (
                <a href={ro.option.link} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-primary transition-colors">
                  <span className="material-symbols-outlined text-sm md:text-lg">north_east</span>
                </a>
              )}
              {(isOwner || ro.option.added_by === user?.id) && (
                <button onClick={() => handleDelete(ro.option.id)} className="text-red-400 hover:text-red-600 transition-colors ml-1">
                  <span className="material-symbols-outlined text-sm md:text-lg">delete</span>
                </button>
              )}
            </div>
          </div>

          <div>
            {isStay && ro.option.check_in_date && (
              <div className="flex items-center gap-1.5 mb-2 md:mb-3 p-2 md:p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg md:rounded-xl border border-slate-100 dark:border-slate-800/50">
                <span className="material-symbols-outlined text-xs md:text-sm text-primary">calendar_today</span>
                <span className="text-[9px] md:text-[11px] font-black uppercase tracking-tight text-slate-600 dark:text-slate-300">
                  {isStay ? (
                    <>
                      {ro.option.check_in_date ? format(parseISO(ro.option.check_in_date), "MMM d") : "?"} — {ro.option.check_out_date ? format(parseISO(ro.option.check_out_date), "MMM d") : "?"}
                    </>
                  ) : (
                    format(parseISO(ro.option.check_in_date), "MMM d, yy")
                  )}
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
                className="text-gray-400 hover:text-black dark:hover:text-white transition-all text-[9px] md:text-[10px] font-black uppercase tracking-widest flex items-center gap-1 group/link"
              >
                details
                <span className="material-symbols-outlined text-xs group-hover/link:translate-x-0.5 transition-transform">arrow_forward</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-background-light dark:bg-background-dark font-sans text-gray-900 dark:text-gray-100 min-h-screen">
      <main className="max-w-[2000px] mx-auto px-6 pt-4 pb-12 md:py-12">
        <div className="hidden md:flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <h1 className="text-4xl md:text-6xl font-extrabold text-black dark:text-white tracking-tighter lowercase serif-title italic animate-in fade-in slide-in-from-left-4 duration-700">comparison hub</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-2 font-bold uppercase tracking-widest text-[10px] animate-in fade-in slide-in-from-left-4 duration-700 delay-100">
              {activeTrip?.name || "Trip"} • {members?.length || 0} members
            </p>
          </div>
          <button
            onClick={() => setShowAddOption(true)}
            className="hidden md:flex bg-black dark:bg-white dark:text-black text-white px-8 py-4 rounded-full font-black text-[10px] uppercase tracking-widest items-center gap-2 hover:opacity-90 transition-all shadow-xl shadow-black/5"
          >
            <span className="material-symbols-outlined text-xl">add</span>
            add option
          </button>
        </div>

        {/* Mobile Fixed Add Button */}
        <button
          onClick={() => setShowAddOption(true)}
          className="md:hidden fixed bottom-24 right-6 z-40 bg-black dark:bg-white dark:text-black text-white w-12 h-12 rounded-full shadow-2xl flex items-center justify-center transition-transform active:scale-90"
        >
          <span className="material-symbols-outlined text-2xl">add</span>
        </button>

        <div>
          <div className="w-full">
            {tripDates.length > 0 && (
              <>
                {/* Mobile Calendar Filter */}
                <div className="flex md:hidden items-center justify-between mb-8 px-2">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Filtering</span>
                    <span className="text-xl font-extrabold text-black dark:text-white serif-title italic">
                      {selectedDate ? format(selectedDate, "MMM d, yyyy") : "all days"}
                    </span>
                  </div>
                  <Popover open={isPopoverOpen} onOpenChange={(open) => setIsPopoverOpen(open)}>
                    <PopoverTrigger asChild>
                      <button className={cn(
                        "size-12 rounded-full flex items-center justify-center transition-all shadow-xl",
                        selectedDate ? "bg-black text-[#ccff00] dark:bg-white dark:text-black scale-105" : "bg-white dark:bg-slate-800 text-slate-400 border border-slate-100 dark:border-slate-800"
                      )}>
                        <span className="material-symbols-outlined text-2xl">calendar_today</span>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0 border-none rounded-[2rem] shadow-2xl overflow-hidden bg-white dark:bg-slate-900 z-[200]" align="end">
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
                      <div className="p-2">
                        <Calendar
                          mode="single"
                          selected={selectedDate || undefined}
                          onSelect={(d) => {
                            setSelectedDate(d || null);
                            setIsPopoverOpen(false);
                          }}
                          disabled={(date) => {
                            if (!activeTrip?.start_date || !activeTrip?.end_date) return false;
                            const start = parseISO(activeTrip.start_date);
                            const end = parseISO(activeTrip.end_date);
                            // Set hours to 0 to compare dates only
                            start.setHours(0, 0, 0, 0);
                            end.setHours(0, 0, 0, 0);
                            const checkDate = new Date(date);
                            checkDate.setHours(0, 0, 0, 0);
                            return checkDate < start || checkDate > end;
                          }}
                          fromDate={activeTrip?.start_date ? parseISO(activeTrip.start_date) : undefined}
                          toDate={activeTrip?.end_date ? parseISO(activeTrip.end_date) : undefined}
                          initialFocus
                          className="font-sans"
                        />
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Desktop Date Bar */}
                <div className="hidden md:flex items-center gap-3 mb-10 overflow-x-auto pb-4 scrollbar-hide">
                  <button onClick={() => setSelectedDate(null)} className={cn("whitespace-nowrap px-6 py-3 rounded-full font-black text-xs uppercase tracking-widest transition-all", !selectedDate ? "bg-black text-[#ccff00] dark:bg-white dark:text-black shadow-xl scale-105" : "bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400")}>All Dates</button>
                  {tripDates.map((date, idx) => {
                    const isSelected = selectedDate && isSameDay(date, selectedDate);
                    return <button key={idx} onClick={() => setSelectedDate(date)} className={cn("whitespace-nowrap px-6 py-3 rounded-full font-black text-xs uppercase tracking-widest transition-all", isSelected ? "bg-black text-[#ccff00] dark:bg-white dark:text-black shadow-xl scale-105" : "bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400")}>{format(date, "MMM d")}</button>;
                  })}
                </div>
              </>
            )}

            {isLoading ? (
              <FullPageLoader />
            ) : rankedOptions?.length === 0 ? (
              <div className="bg-white dark:bg-gray-900 rounded-[3rem] p-20 text-center border border-gray-100 dark:border-gray-800">
                <h3 className="text-3xl font-extrabold mb-4">No options yet</h3>
                <p className="text-gray-500">Help your group decide! Add stays or activities.</p>
              </div>
            ) : (
              <div className="space-y-12">
                {stays.length > 0 && (
                  <div>
                    <h2 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white mb-6 uppercase tracking-widest pl-2">Stays</h2>
                    <div className="flex overflow-x-auto md:flex md:flex-wrap md:justify-center gap-4 md:gap-6 pb-4 scrollbar-hide snap-x">
                      {stays.map(renderOptionCard)}
                    </div>
                  </div>
                )}
                {activities.length > 0 && (
                  <div>
                    <h2 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white mb-6 uppercase tracking-widest pl-2">Activities</h2>
                    <div className="flex overflow-x-auto md:flex md:flex-wrap md:justify-center gap-4 md:gap-6 pb-4 scrollbar-hide snap-x">
                      {activities.map(renderOptionCard)}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="max-w-[2000px] mx-auto px-6 py-20 border-t text-center">
        <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">© {new Date().getFullYear()} absolutrip</p>
      </footer>

      <Dialog open={showAddOption} onOpenChange={setShowAddOption}>
        <DialogContent className="fixed inset-0 z-[100] translate-x-0 translate-y-0 w-full h-full max-w-none p-0 overflow-hidden border-none rounded-none shadow-none bg-white dark:bg-slate-900 sm:left-[50%] sm:top-[50%] sm:translate-x-[-50%] sm:translate-y-[-50%] sm:w-[95%] sm:max-w-lg sm:h-auto sm:rounded-[2.5rem] sm:shadow-2xl">
          <button 
            onClick={() => setShowAddOption(false)}
            className="absolute right-4 top-4 z-[110] size-10 rounded-full bg-white flex items-center justify-center text-black shadow-xl hover:scale-110 active:scale-95 transition-all md:hidden"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
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
      <Dialog open={!!viewingOption} onOpenChange={(open) => !open && setViewingOption(null)}>
        <DialogContent className="fixed inset-0 z-[100] translate-x-0 translate-y-0 w-full h-full max-w-none p-0 overflow-hidden border-none rounded-none shadow-none bg-white dark:bg-slate-900 sm:left-[50%] sm:top-[50%] sm:translate-x-[-50%] sm:translate-y-[-50%] sm:w-[95%] sm:max-w-xl sm:h-auto sm:rounded-[2.5rem] sm:shadow-2xl">
          {viewingOption && (
            <div className="relative h-full overflow-y-auto scrollbar-hide modal-scroll-area">
              <button 
                onClick={() => setViewingOption(null)}
                className="absolute right-4 top-4 z-[60] size-10 rounded-full bg-white flex items-center justify-center text-black shadow-xl hover:scale-110 active:scale-95 transition-all"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
              <div className="relative h-64 md:h-80">
                <ImageCarousel imageUrls={getOptionImages(viewingOption.option)} alt={viewingOption.option.title} />
                <div className="absolute top-4 left-4 flex gap-2">
                  <div className="bg-black/60 backdrop-blur-md text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                    {viewingOption.option.category || "activity"}
                  </div>
                  {viewingOption.option.is_finalized && (
                    <div className="bg-green-500 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">
                      Selected
                    </div>
                  )}
                </div>
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

              <div className="px-8 py-8 space-y-6">
                <div>
                  <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-2 serif-title italic">{viewingOption.option.title}</h3>
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
                          {viewingOption.option.category === 'stay' ? (
                            <>
                              {viewingOption.option.check_in_date ? format(parseISO(viewingOption.option.check_in_date), "MMM d") : "?"} — {viewingOption.option.check_out_date ? format(parseISO(viewingOption.option.check_out_date), "MMM d") : "?"}
                            </>
                          ) : (
                            format(parseISO(viewingOption.option.check_in_date), "MMM d, yyyy")
                          )}
                        </span>
                      </div>
                    </div>
                  )}
                  {viewingOption.option.link && (
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 col-span-2">
                      <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-1 select-none">Web Link</p>
                      <a
                        href={viewingOption.option.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-primary hover:underline font-bold text-xs"
                      >
                        <span className="material-symbols-outlined text-xs">public</span>
                        View Website
                      </a>
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


                <div className="p-5 bg-primary/5 rounded-[1.5rem] border border-primary/10">
                  <div className="flex justify-between items-end mb-4">
                    <div>
                      <p className="text-[9px] uppercase font-black text-slate-400 tracking-widest mb-1">Total Group Price</p>
                      <p className="text-xl font-black text-slate-900 dark:text-white">₹{Math.round(
                        (viewingOption.option.price_per_day_pp ?? (viewingOption.option.price / Math.max(1, members?.length || 0))) *
                        Math.max(1, members?.length || 0) *
                        (viewingOption.option.check_in_date && viewingOption.option.check_out_date ? Math.max(1, differenceInDays(parseISO(viewingOption.option.check_out_date), parseISO(viewingOption.option.check_in_date))) : 1)
                      ).toLocaleString('en-IN')}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] uppercase font-black text-primary/70 tracking-widest mb-1">Per Person</p>
                      <p className="text-2xl font-black text-primary">₹{Math.round(viewingOption.option.price_per_day_pp ?? (viewingOption.option.price / Math.max(1, members?.length || 0))).toLocaleString('en-IN')}</p>
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

                {/* Mobile Pagination Controls */}
                <div className="md:hidden flex items-center justify-between pt-10 border-t border-gray-100 dark:border-gray-800">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      const idx = allFilteredOptions.findIndex(o => o.option.id === viewingOption.option.id);
                      if (idx > 0) setViewingOption(allFilteredOptions[idx - 1]);
                      document.querySelector('.modal-scroll-area')?.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    disabled={allFilteredOptions.findIndex(o => o.option.id === viewingOption.option.id) === 0}
                    className="rounded-2xl h-14 px-6 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                  >
                    <span className="material-symbols-outlined text-sm">arrow_back</span>
                    Prev
                  </Button>
                  
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Explore</span>
                    <span className="text-xs font-black text-primary leading-none">
                      {allFilteredOptions.findIndex(o => o.option.id === viewingOption.option.id) + 1} of {allFilteredOptions.length}
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
                    className="rounded-2xl h-14 px-6 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                  >
                    Next
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
