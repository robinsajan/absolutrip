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
          <button onClick={prevImg} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60 z-10 flex items-center justify-center">
            <span className="material-symbols-outlined text-sm">chevron_left</span>
          </button>
          <button onClick={nextImg} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60 z-10 flex items-center justify-center">
            <span className="material-symbols-outlined text-sm">chevron_right</span>
          </button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10">
            {imageUrls.map((_, i) => (
              <div key={i} className={cn("w-1.5 h-1.5 rounded-full transition-all", i === currentIndex ? "bg-white scale-110" : "bg-white/50")} />
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

  const [extractUrl, setExtractUrl] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
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
    setExtractedData(null);
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

  const handleExtract = async () => {
    if (!extractUrl.trim()) {
      toast.error("Please paste a link first");
      return;
    }
    setIsExtracting(true);
    try {
      const metadata = await optionsApi.extract(extractUrl.trim());
      setExtractedData({
        title: metadata.link_title,
        link: extractUrl.trim(),
        image_url: metadata.image_url,
        notes: metadata.link_description
      });
      setShowAddOption(true);
      toast.success("Magic! Link details extracted ✨");
      setExtractUrl("");
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Could not extract details from this link");
    } finally {
      setIsExtracting(false);
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
    return list;
  }, [rankedOptions, selectedDate]);

  const activities = useMemo(() => {
    return (rankedOptions || []).filter(ro => ro.option.category !== 'stay');
  }, [rankedOptions]);

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
        "group bg-white dark:bg-gray-900 rounded-[1.5rem] md:rounded-[2rem] overflow-hidden border-2 transition-all hover:-translate-y-1 shrink-0 w-[280px] md:w-auto",
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
              "absolute top-2 right-2 md:top-4 md:right-4 w-6 h-6 md:w-8 md:h-8 rounded-full backdrop-blur-md flex items-center justify-center transition-all hover:scale-110 active:scale-95 z-20",
              hasVoted ? "bg-primary text-white" : "bg-black/20 text-white hover:bg-black/40"
            )}
          >
            <span className={cn("material-symbols-outlined text-xs md:text-base", hasVoted && "material-symbols-filled")}>favorite</span>
            {ro.vote_count > 0 && (
              <span className="absolute -bottom-1 -right-1 bg-white text-black text-[6px] md:text-[7px] font-black w-3 md:w-3.5 h-3 md:h-3.5 rounded-full flex items-center justify-center shadow-sm">
                {ro.vote_count}
              </span>
            )}
          </button>
        </div>
        <div className="p-3 md:p-4 flex flex-col min-h-[220px] md:min-h-[280px]">
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
          <p className="text-gray-500 dark:text-gray-400 text-[10px] md:text-xs mb-2 md:mb-3 font-bold line-clamp-2 leading-relaxed">
            {ro.option.notes || ro.option.link_description || "Explore this amazing possibility."}
          </p>
          <div className="mt-auto">
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
            <div className="mb-2 md:mb-3 pt-2 md:pt-3 border-t border-gray-50 dark:border-gray-800">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[7px] md:text-[8px] uppercase font-black text-gray-400 tracking-widest mb-0.5">Total</p>
                  <p className="text-sm md:text-lg font-bold text-gray-800 dark:text-gray-200 leading-none">₹{Math.round(groupTotal).toLocaleString('en-IN')}</p>
                </div>
                <div className="text-right">
                  <p className="text-[7px] md:text-[8px] uppercase font-black text-primary/70 tracking-widest mb-0.5">Per Person Per Night</p>
                  <p className="text-base md:text-xl font-black text-primary leading-none">₹{Math.round(ppPerDay).toLocaleString('en-IN')}</p>
                </div>
              </div>
            </div>
            <button
              onClick={() => isOwner ? (isFinalized ? handleUnfinalize(ro.option.id) : handleFinalize(ro.option.id)) : null}
              disabled={!isOwner}
              className={cn(
                "w-full py-2.5 md:py-3.5 rounded-lg md:rounded-xl font-black flex items-center justify-center gap-2 transition-all shadow-sm text-[10px] md:text-xs uppercase tracking-tight",
                isFinalized ? "bg-green-500 text-white shadow-green-500/10 hover:opacity-90" : isOwner ? "bg-black dark:bg-white text-white dark:text-black hover:opacity-90 shadow-black/5" : "bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed hidden"
              )}
            >
              <span className="material-symbols-outlined text-sm md:text-base">{isFinalized ? "check_circle" : "sell"}</span>
              <span className="truncate">{isFinalized ? "Selected" : "Select"}</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-background-light dark:bg-background-dark font-sans text-gray-900 dark:text-gray-100 min-h-screen">
      <main className="max-w-7xl mx-auto px-6 pt-4 pb-12 md:py-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
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

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
          <div className="hidden lg:block lg:col-span-1">
            <section className="bg-slate-50 dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 sticky top-24 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-brand-purple text-xl material-symbols-filled">magic_button</span>
                <h3 className="font-extrabold text-sm uppercase tracking-widest text-[#1e144a] dark:text-[#d4caff]">Magic Box</h3>
              </div>
              <p className="text-slate-500 dark:text-slate-400 mb-6 text-xs font-bold leading-relaxed whitespace-pre-wrap">Paste link to extract details automatically.</p>
              <div className="space-y-3">
                <input className="w-full bg-white dark:bg-black/40 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-brand-purple/20 outline-none" placeholder="Link here..." type="text" value={extractUrl} onChange={(e) => setExtractUrl(e.target.value)} />
                <button onClick={handleExtract} disabled={isExtracting} className="w-full bg-brand-purple text-white py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all">
                  {isExtracting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : "Extract Link"}
                </button>
              </div>
            </section>
          </div>

          <div className="lg:col-span-3">
            {tripDates.length > 0 && (
              <div className="flex items-center gap-3 mb-10 overflow-x-auto pb-4 scrollbar-hide">
                <button onClick={() => setSelectedDate(null)} className={cn("whitespace-nowrap px-6 py-3 rounded-full font-black text-xs uppercase tracking-widest transition-all", !selectedDate ? "bg-black text-[#ccff00] dark:bg-white dark:text-black shadow-xl scale-105" : "bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400")}>All Dates</button>
                {tripDates.map((date, idx) => {
                  const isSelected = selectedDate && isSameDay(date, selectedDate);
                  return <button key={idx} onClick={() => setSelectedDate(date)} className={cn("whitespace-nowrap px-6 py-3 rounded-full font-black text-xs uppercase tracking-widest transition-all", isSelected ? "bg-black text-[#ccff00] dark:bg-white dark:text-black shadow-xl scale-105" : "bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400")}>{format(date, "MMM d")}</button>;
                })}
              </div>
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
                    <div className="flex overflow-x-auto md:grid md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 pb-4 scrollbar-hide snap-x">
                      {stays.map(renderOptionCard)}
                    </div>
                  </div>
                )}
                {activities.length > 0 && (
                  <div>
                    <h2 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white mb-6 uppercase tracking-widest pl-2">Activities</h2>
                    <div className="flex overflow-x-auto md:grid md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 pb-4 scrollbar-hide snap-x">
                      {activities.map(renderOptionCard)}
                    </div>
                  </div>
                )}
                {/* Mobile Magic Box */}
                <div className="lg:hidden mt-20">
                  <section className="bg-slate-50 dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800">
                    <h3 className="font-extrabold text-xs uppercase tracking-widest mb-4">Magic Box</h3>
                    <div className="flex flex-col gap-3">
                      <input className="w-full bg-white dark:bg-black/40 border rounded-xl px-4 py-3 text-sm" placeholder="Paste link..." value={extractUrl} onChange={(e) => setExtractUrl(e.target.value)} />
                      <button onClick={handleExtract} disabled={isExtracting} className="w-full bg-brand-purple text-white py-3.5 rounded-xl font-black text-[10px] uppercase shadow-lg">
                        {isExtracting ? "Extracting..." : "Extract Link ✨"}
                      </button>
                    </div>
                  </section>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="max-w-7xl mx-auto px-6 py-20 border-t text-center">
        <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">© {new Date().getFullYear()} absolutrip</p>
      </footer>

      <Dialog open={showAddOption} onOpenChange={setShowAddOption}>
        <DialogContent className="max-w-lg w-[95%] p-0 overflow-hidden border-none shadow-2xl rounded-[2.5rem] bg-white dark:bg-slate-900">
          <div className="max-h-[85vh] overflow-y-auto px-8 py-10 scrollbar-hide">
            <DialogHeader className="pb-8">
              <DialogTitle className="text-3xl font-extrabold serif-title italic">add new option</DialogTitle>
            </DialogHeader>
            <AddOptionForm
              onSubmit={handleAddOption}
              onImageUpload={handleImageUpload}
              tripStartDate={activeTrip?.start_date}
              tripEndDate={activeTrip?.end_date}
              initialData={extractedData}
              onCancel={() => { setShowAddOption(false); setExtractedData(null); }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
