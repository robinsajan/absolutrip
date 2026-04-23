"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth, useTrip, useTripMembers } from "@/lib/hooks";
import { polls as pollsApi } from "@/lib/api/endpoints";
import { cn } from "@/lib/utils";
import { Poll } from "@/types";
import { toast } from "sonner";
import { FullPageLoader } from "@/components/common/FullPageLoader";

export default function AllPollsPage() {
    const params = useParams();
    const tripId = params.tripId as string;
    const { user } = useAuth();
    const { trip: activeTrip } = useTrip(tripId);
    const { members } = useTripMembers(tripId);
    const [polls, setPolls] = useState<Poll[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const isOwner = members?.find(m => m.user_id === user?.id)?.role === 'owner';

    const fetchPolls = async () => {
        try {
            const data = await pollsApi.list(tripId);
            setPolls(data.polls);
        } catch (err) {
            console.error("Failed to fetch polls", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchPolls();
    }, [tripId]);

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

            const originalPolls = [...polls];
            const nextPolls = polls.map(p => {
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

            setPolls(nextPolls);

            const updatedPoll = nextPolls.find(p => p.id === poll.id)!;
            const nextOptionIds = updatedPoll.options.filter(o => o.has_voted).map(o => o.id);

            try {
                await pollsApi.vote(poll.id, nextOptionIds);
                fetchPolls();
            } catch (err) {
                setPolls(originalPolls);
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
            <div key={poll.id} className="group rounded-[1.5rem] md:rounded-[2rem] overflow-hidden border-2 border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 transition-all hover:shadow-lg">
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
                                    "w-full relative h-12 rounded-xl border transition-all text-left overflow-hidden flex items-center px-4 group/opt",
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
                                    <span className="text-sm font-bold truncate pr-2">{opt.text}</span>
                                    <span className="text-xs font-black opacity-60 shrink-0">{percentage}%</span>
                                </div>
                            </button>
                        );
                    })}
                </div>
                <div className="mt-4 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <div className="flex items-center gap-2">
                        <div className="size-5 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-primary font-black text-[8px]">
                            {poll.creator_name.charAt(0).toUpperCase()}
                        </div>
                        <span>by {poll.creator_name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <span>{totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}</span>
                        {poll.allow_multiple && <span className="opacity-60 italic">multiple choices</span>}
                    </div>
                </div>
            </div>
        );
    };

    if (isLoading) return <FullPageLoader />;

    return (
        <div className="bg-background font-sans min-h-screen">
            <main className="w-full px-4 py-6 md:px-8 md:py-10">
                <header className="flex flex-col gap-6 mb-8">
                    <Link href={`/trip/${tripId}/explore`} className="group flex items-center gap-3">
                        <div className="size-10 rounded-full bg-black text-white flex items-center justify-center group-hover:-translate-x-1 transition-transform shadow-lg shadow-black/10">
                            <span className="material-symbols-outlined text-xl">arrow_back</span>
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-black dark:group-hover:text-white transition-colors">back to hub</span>
                    </Link>

                    <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 mb-1">Decisions</span>
                        <h1 className="text-4xl md:text-6xl font-black text-black dark:text-white tracking-tighter serif-title italic lowercase">
                            all polls <span className="text-primary not-italic font-black ml-2">({polls.length})</span>
                        </h1>
                        <p className="mt-2 text-sm text-slate-500 max-w-lg">Help your group decide on stays, activities, and logistics by voting on shared polls.</p>
                    </div>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
                    {polls.length > 0 ? (
                        polls.map(renderPollCard)
                    ) : (
                        <div className="col-span-full py-20 text-center bg-white dark:bg-gray-900 rounded-[3rem] border border-gray-100 dark:border-gray-800">
                            <span className="material-symbols-outlined text-5xl text-slate-200 mb-4">ballot</span>
                            <p className="text-xl font-bold text-slate-400">no polls created yet</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
