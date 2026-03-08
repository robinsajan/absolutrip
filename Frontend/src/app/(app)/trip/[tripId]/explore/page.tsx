"use client";

import { useState, useMemo, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { format, parseISO, differenceInDays, eachDayOfInterval, isSameDay } from "date-fns";
import { useRankedOptions, useTripMembers, useAuth, useTrip } from "@/lib/hooks";
import { useAppStore } from "@/lib/store";
import { options as optionsApi, votes as votesApi } from "@/lib/api/endpoints";
import { cn } from "@/lib/utils";
import type { RankedOption, TripMember, OptionCategory } from "@/types";
import { AddOptionForm } from "@/components/explore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

function ImageCarousel({ imageUrls, alt }: { imageUrls: string[], alt: string }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!imageUrls || imageUrls.length === 0) {
    return <img alt={alt} className="w-full h-full object-cover font-sans cursor-pointer group-hover:scale-105 transition-transform duration-700" src="https://images.unsplash.com/photo-1530789253388-582c481c54b0?q=80&w=2070&auto=format&fit=crop" />;
  }

  const nextImg = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % imageUrls.length);
  };

  const prevImg = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + imageUrls.length) % imageUrls.length);
  };

  return (
    <div className="relative w-full h-full group">
      <img alt={alt} className="w-full h-full object-cover font-sans group-hover:scale-105 transition-transform duration-700" src={imageUrls[currentIndex]} />
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
  const tripId = Number(params.tripId);
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
      const end = optionToFinalize.check_out_date
        ? parseISO(optionToFinalize.check_out_date)
        : start;

      const conflict = currentFinalized.find(ro => {
        if (!ro.option.check_in_date) return false;

        const fStart = parseISO(ro.option.check_in_date);
        const fEnd = ro.option.check_out_date
          ? parseISO(ro.option.check_out_date)
          : fStart;

        // Check for overlaps
        if (optionToFinalize.category === 'stay' && ro.option.category === 'stay') {
          // Standard stay overlap: [start, end) conflicts with [fStart, fEnd)
          return start < fEnd && end > fStart;
        }

        // If it's an activity or other, check same day
        if (optionToFinalize.category !== 'stay' && ro.option.category !== 'stay') {
          return isSameDay(start, fStart);
        }

        return false;
      });

      if (conflict) {
        const conflictDate = format(parseISO(conflict.option.check_in_date!), "MMM d");
        toast.error(`There is a conflict! You have already selected "${conflict.option.title}" for ${conflictDate}. Please resolve the conflict first.`);
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

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  // Calculate estimated per-person cost (liked options)
  const likedOptions = useMemo(() => {
    if (!user || !rankedOptions) return [];
    return rankedOptions.filter(ro =>
      ro.voters.some(v => v.user_id === user.id && v.score > 0)
    );
  }, [user, rankedOptions]);

  const totalLikedCostPerPerson = useMemo(() => {
    if (!members?.length) return 0;
    return likedOptions.reduce((sum, ro) => {
      const { price, is_per_person, is_per_night, check_in_date, check_out_date } = ro.option;

      let basePrice = is_per_person ? price : price / members.length;

      if (check_in_date && check_out_date) {
        try {
          const nights = Math.max(1, differenceInDays(parseISO(check_out_date), parseISO(check_in_date)));
          basePrice *= nights;
        } catch (e) {
          // Fallback to 1 night if dates are invalid
        }
      }

      return sum + basePrice;
    }, 0);
  }, [likedOptions, members]);
  // Compute available dates
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
        // Match if selected date falls between checkin (inclusive) and checkout (exclusive)
        return selectedDate >= start && selectedDate < end;
      });
    }
    return list;
  }, [rankedOptions, selectedDate]);

  const activities = useMemo(() => {
    let list = (rankedOptions || []).filter(ro => ro.option.category !== 'stay');
    if (selectedDate) {
      list = list.filter(ro => {
        if (!ro.option.check_in_date) return false;
        return isSameDay(parseISO(ro.option.check_in_date), selectedDate);
      });
    }
    return list;
  }, [rankedOptions, selectedDate]);

  if (!mounted) return null;

  const renderOptionCard = (ro: RankedOption) => {
    const userVote = ro.voters.find(v => v.user_id === user?.id);
    const hasVoted = !!userVote && userVote.score > 0;
    const isFinalized = ro.option.is_finalized;
    const isStay = ro.option.category === "stay";

    // Image logic
    let imageUrls = ["https://images.unsplash.com/photo-1530789253388-582c481c54b0?q=80&w=2070&auto=format&fit=crop"];
    if (ro.option.image_path) {
      imageUrls = ro.option.image_path.split(',').map((u: string) => `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/uploads/options/${u.trim()}`);
    } else if (ro.option.image_url) {
      imageUrls = ro.option.image_url.split(',').map((u: string) => u.trim());
    }

    const nights = ro.option.check_in_date && ro.option.check_out_date
      ? Math.max(1, differenceInDays(parseISO(ro.option.check_out_date), parseISO(ro.option.check_in_date)))
      : 1;

    const memberCount = Math.max(1, members?.length || 0);
    const unitPrice = ro.option.price_per_day_pp ?? (ro.option.price / memberCount);
    const groupTotal = ro.option.total_price ?? (unitPrice * memberCount * nights);
    const ppPerDay = unitPrice;
    return (
      <div key={ro.option.id} className={cn(
        "group bg-white dark:bg-gray-900 rounded-[2rem] overflow-hidden border-2 transition-all hover:-translate-y-1",
        hasVoted ? "border-primary shadow-xl shadow-primary/5" : "border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-lg"
      )}>
        <div className="relative h-48 overflow-hidden rounded-t-[2rem]">
          <ImageCarousel imageUrls={imageUrls} alt={ro.option.title} />

          {/* Floating Labels */}
          <div className="absolute top-4 left-4 flex gap-1.5 z-20">
            <div className="bg-black/60 backdrop-blur-md text-white px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest">
              {ro.option.category || "activity"}
            </div>
            {isFinalized && (
              <div className="bg-green-500 text-white px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest shadow-lg">
                Selected
              </div>
            )}
          </div>

          {/* Small Heart Vote Button */}
          <button
            onClick={() => handleVote(ro.option.id, hasVoted ? 0 : 1)}
            className={cn(
              "absolute top-4 right-4 w-8 h-8 rounded-full backdrop-blur-md flex items-center justify-center transition-all hover:scale-110 active:scale-95 z-20",
              hasVoted ? "bg-primary text-white" : "bg-black/20 text-white hover:bg-black/40"
            )}
          >
            <span className={cn("material-symbols-outlined text-base", hasVoted && "material-symbols-filled")}>favorite</span>
            {ro.vote_count > 0 && (
              <span className="absolute -bottom-1 -right-1 bg-white text-black text-[7px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center shadow-sm">
                {ro.vote_count}
              </span>
            )}
          </button>
        </div>

        <div className="p-4 flex flex-col min-h-[280px]">
          <div className="flex justify-between items-start mb-1 gap-2">
            <h3 className="text-lg font-black text-gray-900 dark:text-white tracking-tight line-clamp-1">{ro.option.title}</h3>
            <div className="flex items-center gap-1 shrink-0">
              {ro.option.link && (
                <a href={ro.option.link} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-primary transition-colors">
                  <span className="material-symbols-outlined text-lg">north_east</span>
                </a>
              )}
              {(isOwner || ro.option.added_by === user?.id) && (
                <button onClick={() => handleDelete(ro.option.id)} className="text-red-400 hover:text-red-600 transition-colors ml-1">
                  <span className="material-symbols-outlined text-lg">delete</span>
                </button>
              )}
            </div>
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-xs mb-3 font-bold line-clamp-2 leading-relaxed">
            {ro.option.notes || ro.option.link_description || "Explore this amazing possibility."}
          </p>

          <div className="mt-auto">
            {ro.option.check_in_date && (
              <div className="flex items-center gap-2 mb-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800/50">
                <span className="material-symbols-outlined text-sm text-primary">calendar_today</span>
                <span className="text-[11px] font-black uppercase tracking-tight text-slate-600 dark:text-slate-300">
                  {isStay ? (
                    <>
                      {ro.option.check_in_date ? format(parseISO(ro.option.check_in_date), "MMM d") : "?"} — {ro.option.check_out_date ? format(parseISO(ro.option.check_out_date), "MMM d") : "?"}
                      {ro.option.check_in_date && ro.option.check_out_date && (
                        <span className="ml-1.5 text-primary">
                          ({Math.max(1, differenceInDays(parseISO(ro.option.check_out_date), parseISO(ro.option.check_in_date)))}n)
                        </span>
                      )}
                    </>
                  ) : (
                    format(parseISO(ro.option.check_in_date), "MMM d, yyyy")
                  )}
                </span>
              </div>
            )}

            <div className="mb-3 pt-3 border-t border-gray-50 dark:border-gray-800">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[8px] uppercase font-black text-gray-400 tracking-widest mb-0.5">Group Total</p>
                  <p className="text-lg font-bold text-gray-800 dark:text-gray-200 leading-none">
                    ${Math.round(groupTotal).toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[8px] uppercase font-black text-primary/70 tracking-widest mb-0.5">Per Person Per Night</p>
                  <p className="text-xl font-black text-primary leading-none">
                    ${Math.round(ppPerDay).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Select/Finalize Button */}
            <button
              onClick={() => isOwner ? (isFinalized ? handleUnfinalize(ro.option.id) : handleFinalize(ro.option.id)) : null}
              disabled={!isOwner}
              className={cn(
                "w-full py-3.5 rounded-xl font-black flex items-center justify-center gap-2 transition-all shadow-sm text-xs uppercase tracking-tight",
                isFinalized
                  ? "bg-green-500 text-white shadow-green-500/10 hover:opacity-90"
                  : isOwner
                    ? "bg-black dark:bg-white text-white dark:text-black hover:opacity-90 shadow-black/5"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed hidden"
              )}
            >
              <span className="material-symbols-outlined text-base">
                {isFinalized ? "check_circle" : "sell"}
              </span>
              {isFinalized ? "Selected" : "Select for Trip"}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-background-light dark:bg-background-dark font-sans text-gray-900 dark:text-gray-100 min-h-screen">

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <h1 className="text-4xl md:text-6xl font-extrabold text-black dark:text-white tracking-tighter lowercase serif-title italic animate-in fade-in slide-in-from-left-4 duration-700">comparison hub</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-2 font-bold uppercase tracking-widest text-[10px] animate-in fade-in slide-in-from-left-4 duration-700 delay-100">
              {activeTrip?.name || "Trip"} • {members?.length || 0} members
            </p>
          </div>

          <button
            onClick={() => setShowAddOption(true)}
            className="bg-black dark:bg-white dark:text-black text-white px-8 py-4 rounded-full font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:opacity-90 transition-all shadow-xl shadow-black/5 self-start animate-in fade-in slide-in-from-right-4 duration-700"
          >
            <span className="material-symbols-outlined text-xl">add</span>
            add option
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
          {/* AI Magic Link Sidebar Box */}
          <div className="lg:col-span-1">
            <section className="bg-slate-50 dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 sticky top-24 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-brand-purple text-xl material-symbols-filled">magic_button</span>
                <h3 className="font-extrabold text-sm uppercase tracking-widest text-[#1e144a] dark:text-[#d4caff]">Magic Box</h3>
              </div>
              <p className="text-slate-500 dark:text-slate-400 mb-6 text-xs font-bold leading-relaxed">
                Paste any Airbnb, Booking, or activity link to extract details automatically.
              </p>

              <div className="space-y-3">
                <input
                  className="w-full bg-white dark:bg-black/40 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-brand-purple/20 outline-none transition-all font-medium"
                  placeholder="https://airbnb.com/rooms/..."
                  type="text"
                  value={extractUrl}
                  onChange={(e) => setExtractUrl(e.target.value)}
                />
                <button
                  onClick={handleExtract}
                  disabled={isExtracting}
                  className="w-full bg-brand-purple hover:bg-[#a175ff] text-white py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
                >
                  {isExtracting ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    "Extract Link"
                  )}
                </button>
              </div>

              {/* Budget Summary Mini-Box */}
              {/* <div className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-800">
                <p className="text-slate-500 text-[8px] font-black uppercase tracking-widest mb-1">Estimated Cost / Person</p>
                <h2 className="text-4xl font-black text-black dark:text-white tracking-tight">${Math.round(totalLikedCostPerPerson).toLocaleString()}</h2>
                <div className="mt-4 flex items-center gap-2 text-slate-400 font-bold text-[10px] uppercase">
                  <span className="material-symbols-outlined text-sm material-symbols-filled text-primary">favorite</span>
                  {likedOptions.length} liked
                </div>
              </div> */}
            </section>
          </div>

          <div className="lg:col-span-3">
            {/* Date Filter Strip */}
            {tripDates.length > 0 && (
              <div className="flex items-center gap-3 mb-10 overflow-x-auto pb-4 scrollbar-hide px-2">
                <button
                  onClick={() => setSelectedDate(null)}
                  className={cn(
                    "whitespace-nowrap px-6 py-3 md:px-8 md:py-4 rounded-full font-black text-xs uppercase tracking-widest transition-all duration-300",
                    !selectedDate ? "bg-black text-[#ccff00] dark:bg-white dark:text-black shadow-xl scale-105" : "bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400"
                  )}
                >
                  All Dates
                </button>
                {tripDates.map((date, idx) => {
                  const isSelected = selectedDate && isSameDay(date, selectedDate);
                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedDate(date)}
                      className={cn(
                        "whitespace-nowrap px-6 py-3 md:px-8 md:py-4 rounded-full font-black text-xs uppercase tracking-widest transition-all duration-300",
                        isSelected ? "bg-black text-[#ccff00] dark:bg-white dark:text-black shadow-xl scale-105" : "bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400"
                      )}
                    >
                      {format(date, "MMM d")}
                    </button>
                  );
                })}
              </div>
            )}

            {isLoading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-4">
                <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">comparing possibilities...</p>
              </div>
            ) : (rankedOptions?.length || 0) === 0 ? (
              <div className="bg-white dark:bg-gray-900 rounded-[3rem] p-20 text-center border border-gray-100 dark:border-gray-800 shadow-sm">
                <div className="w-24 h-24 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-8 text-gray-300">
                  <span className="material-symbols-outlined text-5xl outline-icon">search_off</span>
                </div>
                <h3 className="text-3xl font-extrabold mb-4">No options yet</h3>
                <p className="text-gray-500 font-medium max-w-sm mx-auto mb-10 text-lg">Help your group decide! Add stays, restaurants, or things to do using the Magic Link above.</p>
              </div>
            ) : (stays.length === 0 && activities.length === 0) && (rankedOptions?.length || 0) > 0 ? (
              <div className="bg-white dark:bg-gray-900 rounded-[3rem] p-20 text-center border border-gray-100 dark:border-gray-800 shadow-sm">
                <div className="w-24 h-24 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-8 text-gray-300">
                  <span className="material-symbols-outlined text-5xl outline-icon">calendar_month</span>
                </div>
                <h3 className="text-3xl font-extrabold mb-4">No options for this date</h3>
                <p className="text-gray-500 font-medium max-w-sm mx-auto mb-10 text-lg">Try selecting a different date or adding options for {selectedDate && format(selectedDate, "MMM d")}.</p>
                <button
                  onClick={() => setSelectedDate(null)}
                  className="bg-brand-purple text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:opacity-90 transition-all font-sans"
                >
                  Clear filter
                </button>
              </div>
            ) : (
              <div className="space-y-12">
                {stays.length > 0 && (
                  <div>
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-6 uppercase tracking-widest pl-2">Stays</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                      {stays.map(renderOptionCard)}
                    </div>
                  </div>
                )}

                {activities.length > 0 && (
                  <div>
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-6 uppercase tracking-widest pl-2">Activities, Food  & More</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                      {activities.map(renderOptionCard)}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer Controls */}
      <footer className="max-w-7xl mx-auto px-6 py-20 border-t border-gray-100 dark:border-gray-800 text-center">
        <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">
          © {new Date().getFullYear()} absolutrip — design system alpha
        </p>
      </footer>

      {/* Add Option Dialog */}
      <Dialog open={showAddOption} onOpenChange={setShowAddOption}>
        <DialogContent className="max-w-lg w-[95%] p-0 overflow-hidden border-none shadow-2xl rounded-[2.5rem] bg-white dark:bg-slate-900">
          <div className="max-h-[85vh] overflow-y-auto px-8 py-10 scrollbar-hide">
            <DialogHeader className="flex flex-row items-center justify-between pb-8">
              <div className="flex items-center gap-3">
                <div className="size-10 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined material-symbols-filled">add</span>
                </div>
                <DialogTitle className="text-3xl font-extrabold tracking-tight serif-title italic">add new option</DialogTitle>
              </div>
            </DialogHeader>
            <AddOptionForm
              onSubmit={handleAddOption}
              onImageUpload={handleImageUpload}
              tripStartDate={activeTrip?.start_date}
              tripEndDate={activeTrip?.end_date}
              initialData={extractedData}
              onCancel={() => {
                setShowAddOption(false);
                setExtractedData(null);
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
