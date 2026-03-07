"use client";

import { useState, useMemo, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { format, parseISO, differenceInDays } from "date-fns";
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

      if (is_per_night && check_in_date && check_out_date) {
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

  if (!mounted) return null;

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
              <div className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-800">
                <p className="text-slate-500 text-[8px] font-black uppercase tracking-widest mb-1">Estimated Cost / Person</p>
                <h2 className="text-4xl font-black text-black dark:text-white tracking-tight">${Math.round(totalLikedCostPerPerson).toLocaleString()}</h2>
                <div className="mt-4 flex items-center gap-2 text-slate-400 font-bold text-[10px] uppercase">
                  <span className="material-symbols-outlined text-sm material-symbols-filled text-primary">favorite</span>
                  {likedOptions.length} liked
                </div>
              </div>
            </section>
          </div>

          <div className="lg:col-span-3">
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
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {rankedOptions.map((ro) => {
                  const userVote = ro.voters.find(v => v.user_id === user?.id);
                  const hasVoted = !!userVote && userVote.score > 0;
                  const isFinalized = ro.option.is_finalized;
                  const isStay = ro.option.category === "stay";

                  // Image logic
                  let imageUrl = "https://images.unsplash.com/photo-1530789253388-582c481c54b0?q=80&w=2070&auto=format&fit=crop";
                  if (ro.option.image_path) {
                    imageUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/uploads/options/${ro.option.image_path}`;
                  } else if (ro.option.image_url) {
                    imageUrl = ro.option.image_url;
                  }

                  const costPerPerson = ro.option.is_per_person
                    ? ro.option.price
                    : (members?.length ? ro.option.price / members.length : ro.option.price);

                  return (
                    <div key={ro.option.id} className={cn(
                      "group bg-white dark:bg-gray-900 rounded-[2rem] overflow-hidden border-2 transition-all hover:-translate-y-1",
                      hasVoted ? "border-primary shadow-xl shadow-primary/5" : "border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-lg"
                    )}>
                      <div className="relative h-48 overflow-hidden">
                        <img alt={ro.option.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 font-sans" src={imageUrl} />

                        {/* Floating Labels */}
                        <div className="absolute top-4 left-4 flex gap-1.5">
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

                      <div className="p-5 flex flex-col min-h-[400px]">
                        <div className="flex justify-between items-start mb-1">
                          <h3 className="text-lg font-black text-gray-900 dark:text-white tracking-tight line-clamp-1">{ro.option.title}</h3>
                          {ro.option.link && (
                            <a href={ro.option.link} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-primary transition-colors">
                              <span className="material-symbols-outlined text-lg">north_east</span>
                            </a>
                          )}
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 text-xs mb-4 font-bold line-clamp-2">
                          {ro.option.notes || ro.option.link_description || "Explore this amazing possibility."}
                        </p>

                        <div className="mt-auto">
                          {isStay && (ro.option.check_in_date || ro.option.check_out_date) && (
                            <div className="flex items-center gap-1.5 mb-4 p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800/50">
                              <span className="material-symbols-outlined text-xs text-slate-400">calendar_today</span>
                              <span className="text-[9px] font-black uppercase tracking-tight text-slate-500">
                                {ro.option.check_in_date ? format(parseISO(ro.option.check_in_date), "MMM d") : "?"} — {ro.option.check_out_date ? format(parseISO(ro.option.check_out_date), "MMM d") : "?"}
                                {ro.option.check_in_date && ro.option.check_out_date && (
                                  <span className="ml-1.5 text-primary">
                                    ({Math.max(1, differenceInDays(parseISO(ro.option.check_out_date), parseISO(ro.option.check_in_date)))}n)
                                  </span>
                                )}
                              </span>
                            </div>
                          )}

                          <div className="mb-4 pt-4 border-t border-gray-50 dark:border-gray-800">
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <p className="text-[7px] uppercase font-black text-gray-400 tracking-widest">Rate</p>
                                <p className="text-[10px] font-bold text-gray-700 dark:text-gray-300">
                                  ${Math.round(ro.option.price).toLocaleString()}
                                  <span className="text-[8px] font-normal lowercase ml-1 opacity-50">
                                    {ro.option.is_per_person ? 'pp' : 'total'} {ro.option.is_per_night ? '/n' : ''}
                                  </span>
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-[7px] uppercase font-black text-gray-400 tracking-widest">PP Total</p>
                                <p className="text-lg font-black text-primary">
                                  ${Math.round(costPerPerson).toLocaleString()}
                                </p>
                              </div>
                            </div>

                            {isStay && (
                              <div className="bg-primary/5 dark:bg-primary/10 p-3 rounded-xl border border-primary/10">
                                <div className="flex justify-between items-center text-[10px] font-black text-primary">
                                  <span className="uppercase tracking-tighter opacity-70 italic text-[7px]">Group Stay</span>
                                  <span>
                                    ${Math.round(
                                      (ro.option.is_per_person ? ro.option.price * (members?.length || 1) : ro.option.price) *
                                      (ro.option.is_per_night && ro.option.check_in_date && ro.option.check_out_date
                                        ? Math.max(1, differenceInDays(parseISO(ro.option.check_out_date), parseISO(ro.option.check_in_date)))
                                        : 1)
                                    ).toLocaleString()}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Select/Finalize Button */}
                          <button
                            onClick={() => isFinalized ? handleUnfinalize(ro.option.id) : (isOwner ? handleFinalize(ro.option.id) : null)}
                            disabled={!isOwner && !isFinalized}
                            className={cn(
                              "w-full py-3.5 rounded-xl font-black flex items-center justify-center gap-2 transition-all shadow-md text-xs uppercase tracking-tight",
                              isFinalized
                                ? "bg-green-500 text-white shadow-green-500/10 hover:opacity-90"
                                : isOwner
                                  ? "bg-black dark:bg-white text-white dark:text-black hover:opacity-90 shadow-black/5"
                                  : "bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed"
                            )}
                          >
                            <span className="material-symbols-outlined text-base">
                              {isFinalized ? "check_circle" : "sell"}
                            </span>
                            {isFinalized ? "Selected" : isOwner ? "Select for Trip" : "Wait..."}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
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
