"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { format, parseISO, differenceInDays, eachDayOfInterval, isSameDay } from "date-fns";
import { useRankedOptions, useTripMembers, useAuth, useTrip } from "@/lib/hooks";
import { useAppStore } from "@/lib/store";
import { options as optionsApi, votes as votesApi } from "@/lib/api/endpoints";
import { cn } from "@/lib/utils";
import { getOptionImages } from "@/lib/image";
import type { RankedOption, TripMember } from "@/types";
import { toast } from "sonner";
import { FullPageLoader } from "@/components/common/FullPageLoader";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { AddOptionForm } from "@/components/explore";

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

export default function CategoryExplorePage() {
  const params = useParams();
  const tripId = params.tripId as string;
  const category = params.category as string;
  const { user } = useAuth();
  const { trip: activeTrip } = useTrip(tripId);
  const { rankedOptions, isLoading, mutate } = useRankedOptions(tripId);
  const { members } = useTripMembers(tripId);
  const { showAddOption, setShowAddOption } = useAppStore();

  const [mounted, setMounted] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewingOption, setViewingOption] = useState<RankedOption | null>(null);
  const [editingOption, setEditingOption] = useState<RankedOption | null>(null);
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

  const handleFinalize = async (optionId: number) => {
    try {
      await optionsApi.finalize(optionId);
      toast.success("Option selected! ✨");
      mutate();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to select option");
    }
  };

  const handleAddOption = async (data: any) => {
    try {
      const result = await optionsApi.create(tripId, data);
      mutate();
      setShowAddOption(false);
      toast.success("Option added!");
      return result;
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to add option");
      return { option: { id: 0 } };
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
    if (confirm("Are you sure you want to delete this option?")) {
      try {
        await optionsApi.delete(optionId);
        toast.success("Option deleted");
        mutate();
      } catch (error: any) {
        toast.error(error.response?.data?.error || "Failed to delete option");
      }
    }
  };

  const handleUpdateOption = async (data: any) => {
    if (!editingOption) return { option: { id: 0 } };
    try {
      const result = await optionsApi.update(editingOption.option.id, data);
      mutate();
      setEditingOption(null);
      toast.success("Option updated!");
      return result || { option: { id: editingOption.option.id } };
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to update option");
      return { option: { id: 0 } };
    }
  };

  const handleImageUpload = async (optionId: number, file: File) => {
    await optionsApi.uploadImage(optionId, file);
    mutate();
  };

  const filteredOptions = useMemo(() => {
    if (!rankedOptions) return [];
    const normalizedCategory = category === "stays" ? "stay" : "activity";
    let list = (rankedOptions || []).filter(ro => 
      category === "stays" ? ro.option.category === 'stay' : ro.option.category !== 'stay'
    );
    
    if (selectedDate) {
      list = list.filter(ro => {
        if (!ro.option.check_in_date) return false;
        const start = parseISO(ro.option.check_in_date);
        if (ro.option.category === 'stay') {
          if (!ro.option.check_out_date) return false;
          const end = parseISO(ro.option.check_out_date);
          return selectedDate >= start && selectedDate < end;
        }
        return isSameDay(selectedDate, start);
      });
    }

    return list.sort((a, b) => {
      const dateA = a.option.check_in_date ? parseISO(a.option.check_in_date).getTime() : 0;
      const dateB = b.option.check_in_date ? parseISO(b.option.check_in_date).getTime() : 0;
      return dateA - dateB;
    });
  }, [rankedOptions, category, selectedDate]);

  const renderOptionCard = (ro: RankedOption) => {
    const userVote = ro.voters.find(v => v.user_id === user?.id);
    const hasVoted = !!userVote && userVote.score > 0;
    const isFinalized = ro.option.is_finalized;
    const imageUrls = getOptionImages(ro.option);
    const memberCount = Math.max(1, members?.length || 0);
    const unitPrice = ro.option.price_per_day_pp ?? (ro.option.price / memberCount);

    return (
      <div 
        key={ro.option.id} 
        onClick={() => setViewingOption(ro)}
        className={cn(
          "group w-full mb-10 cursor-pointer transition-all active:scale-[0.98]"
        )}
      >
        <div className="relative aspect-[4/3] md:aspect-video w-full overflow-hidden rounded-[1.5rem] mb-4 shadow-sm group-hover:shadow-md transition-shadow">
          <ImageCarousel imageUrls={imageUrls} alt={ro.option.title} />
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleVote(ro.option.id, hasVoted ? 0 : 1);
            }}
            className={cn(
              "absolute top-4 right-4 z-20 size-10 rounded-full flex items-center justify-center transition-all",
              hasVoted ? "text-red-500" : "text-white drop-shadow-md"
            )}
          >
            <span className={cn("material-symbols-outlined text-2xl", hasVoted && "material-symbols-filled")}>favorite</span>
          </button>
          {isFinalized && (
            <div className="absolute top-4 left-4 z-20 bg-green-500 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">
              Selected
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1 px-1">
          <div className="flex justify-between items-start">
            <h3 className="text-base font-bold text-gray-900 dark:text-white line-clamp-1">{ro.option.title}</h3>
            <div className="flex items-center gap-1 shrink-0">
              {ro.option.added_by === user?.id && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingOption(ro);
                  }} 
                  className="text-slate-400 hover:text-primary transition-colors ml-1"
                >
                  <span className="material-symbols-outlined text-sm md:text-lg">edit</span>
                </button>
              )}
              {(isOwner || ro.option.added_by === user?.id) && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(ro.option.id);
                  }} 
                  className="text-red-400 hover:text-red-600 transition-colors"
                >
                  <span className="material-symbols-outlined text-sm md:text-lg">delete</span>
                </button>
              )}
            </div>
          </div>
          
          <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">
            {ro.option.notes || "Beautiful stay in " + (activeTrip?.destination || "your destination")}
          </p>
          
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {ro.option.check_in_date ? format(parseISO(ro.option.check_in_date), "MMM d") : "Dates TBD"}
            {ro.option.check_out_date ? ` - ${format(parseISO(ro.option.check_out_date), "MMM d")}` : ""}
          </p>

          <div className="flex items-center justify-between mt-1">
             <div className="flex items-center gap-2">
               <span className="text-base font-bold text-gray-900 dark:text-white">
                 ₹{Math.round(unitPrice).toLocaleString('en-IN')}
               </span>
               <span className="text-sm text-gray-500 dark:text-gray-400 font-normal">
                 per person
               </span>
             </div>
             <div className="size-10 rounded-full border border-slate-100 dark:border-slate-800 flex items-center justify-center text-slate-400 group-hover:text-black dark:group-hover:text-white transition-colors">
               <span className="material-symbols-outlined text-xl">arrow_forward</span>
             </div>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading || !mounted) return <FullPageLoader />;

  return (
    <div className="bg-background font-sans">
      <main className="w-full px-4 py-6 md:px-8 md:py-10">
        <header className="flex flex-col gap-4 mb-6">
          <div className="flex items-center justify-between">
            <Link href={`/trip/${tripId}/explore`} className="group flex items-center gap-3">
              <div className="size-10 rounded-full bg-black text-white flex items-center justify-center group-hover:-translate-x-1 transition-transform shadow-lg shadow-black/10">
                <span className="material-symbols-outlined text-xl">arrow_back</span>
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-black dark:group-hover:text-white transition-colors">back to hub</span>
            </Link>

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
                      fromDate={activeTrip?.start_date ? parseISO(activeTrip.start_date) : undefined}
                      toDate={activeTrip?.end_date ? parseISO(activeTrip.end_date) : undefined}
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
                      initialFocus
                      className="font-sans"
                    />
                  </div>
                </PopoverContent>
              </Popover>
              <div className="flex flex-col text-right">
                <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 leading-none mb-1">Filtering</span>
                <span className="text-sm font-extrabold text-black dark:text-white serif-title italic leading-none">
                  {selectedDate ? format(selectedDate, "MMM d, yyyy") : "all days"}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 mb-1">Browse Category</span>
            <h1 className="text-3xl md:text-5xl font-black text-black dark:text-white tracking-tighter serif-title italic lowercase">
              all {category} <span className="text-primary not-italic font-black ml-2">({filteredOptions.length})</span>
            </h1>
          </div>
        </header>

        <div className="flex flex-col gap-4 max-w-2xl mx-auto py-4 px-2">
          {filteredOptions.length > 0 ? (
            filteredOptions.map(renderOptionCard)
          ) : (
            <div className="w-full py-20 text-center bg-white dark:bg-gray-900 rounded-[3rem] border border-gray-100 dark:border-gray-800">
               <span className="material-symbols-outlined text-4xl text-slate-200 mb-4">search_off</span>
               <p className="text-lg font-bold text-slate-400">no {category} found</p>
            </div>
          )}
        </div>

        {/* Mobile Fixed Add Button */}
        <button
          onClick={() => setShowAddOption(true)}
          style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 4.5rem)" }}
          className="md:hidden fixed right-4 z-40 bg-black dark:bg-white dark:text-black text-white w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-transform active:scale-90 animate-in fade-in zoom-in duration-500"
          aria-label="Add option"
        >
          <span className="material-symbols-outlined text-3xl">add</span>
        </button>
      </main>

      <Dialog open={showAddOption} onOpenChange={setShowAddOption}>
        <DialogContent className="fixed inset-0 translate-x-0 translate-y-0 w-full h-full max-w-none p-0 pt-[70px] overflow-hidden border-none rounded-none shadow-none bg-white dark:bg-slate-900 sm:left-[50%] sm:top-[50%] sm:translate-x-[-50%] sm:translate-y-[-50%] sm:w-[95%] sm:max-w-2xl sm:h-auto sm:rounded-[3rem] sm:shadow-2xl">
          <div className="h-full overflow-y-auto px-8 py-10 scrollbar-hide">
            <DialogHeader className="pb-8">
              <DialogTitle className="text-3xl font-extrabold serif-title italic">add new {category === 'stays' ? 'stay' : 'activity'}</DialogTitle>
            </DialogHeader>
            <AddOptionForm
              onSubmit={handleAddOption}
              onImageUpload={handleImageUpload}
              tripStartDate={activeTrip?.start_date}
              tripEndDate={activeTrip?.end_date}
              initialData={{ category: category === 'stays' ? 'stay' : 'activity' }}
              onCancel={() => { setShowAddOption(false); }}
            />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewingOption} onOpenChange={(open) => !open && setViewingOption(null)}>
        <DialogContent className="fixed inset-0 translate-x-0 translate-y-0 w-full h-full max-w-none p-0 overflow-hidden border-none rounded-none shadow-none bg-white dark:bg-slate-900 sm:left-[50%] sm:top-[50%] sm:translate-x-[-50%] sm:translate-y-[-50%] sm:w-[95%] sm:max-w-3xl sm:h-[90vh] sm:rounded-[3rem] sm:shadow-2xl">
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
                  <div className="bg-slate-100 dark:bg-slate-800 text-primary px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-slate-200 dark:border-slate-700">
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

                {/* Mobile Pagination Controls */}
                <div className="md:hidden flex items-center justify-between pt-10 border-t border-gray-100 dark:border-gray-800">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      const idx = filteredOptions.findIndex(o => o.option.id === viewingOption.option.id);
                      if (idx > 0) setViewingOption(filteredOptions[idx - 1]);
                      document.querySelector('.modal-scroll-area')?.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    disabled={filteredOptions.findIndex(o => o.option.id === viewingOption.option.id) === 0}
                    className="rounded-2xl h-14 px-6 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                  >
                    <span className="material-symbols-outlined text-sm">arrow_back</span>
                    Prev
                  </Button>
                  
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Explore</span>
                    <span className="text-xs font-black text-primary leading-none">
                      {filteredOptions.findIndex(o => o.option.id === viewingOption.option.id) + 1} of {filteredOptions.length}
                    </span>
                  </div>

                  <Button
                    variant="ghost"
                    onClick={() => {
                      const idx = filteredOptions.findIndex(o => o.option.id === viewingOption.option.id);
                      if (idx < filteredOptions.length - 1) setViewingOption(filteredOptions[idx + 1]);
                      document.querySelector('.modal-scroll-area')?.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    disabled={filteredOptions.findIndex(o => o.option.id === viewingOption.option.id) === filteredOptions.length - 1}
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

      <Dialog open={!!editingOption} onOpenChange={(open) => !open && setEditingOption(null)}>
        <DialogContent className="fixed inset-0 translate-x-0 translate-y-0 w-full h-full max-w-none p-0 pt-[70px] overflow-hidden border-none rounded-none shadow-none bg-white dark:bg-slate-900 sm:left-[50%] sm:top-[50%] sm:translate-x-[-50%] sm:translate-y-[-50%] sm:w-[95%] sm:max-w-2xl sm:h-auto sm:rounded-[3rem] sm:shadow-2xl">
          <div className="h-full overflow-y-auto px-8 py-10 scrollbar-hide">
            <DialogHeader className="pb-6">
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
