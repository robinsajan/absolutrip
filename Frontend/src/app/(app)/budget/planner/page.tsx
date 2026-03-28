"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
    Calculator,
    ChevronRight,
    MapPin,
    Calendar,
    Users,
    Sparkles,
    CheckCircle2,
    Plus,
    Trash2,
    Share2,
    Hotel,
    Bike,
    ArrowRight,
    Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import axios from "@/lib/api/client";
import { FullPageLoader } from "@/components/common/FullPageLoader";
import { SafeImage } from "@/components/common/SafeImage";
import { getAuthenticatedImageUrl, getOptionImages } from "@/lib/image";
import { cn } from "@/lib/utils";

// Helper components
function BudgetHeader({ budget, used, perPerson }: { budget: number, used: number, perPerson: number }) {
    const remaining = budget - used;
    return (
        <div className="bg-white dark:bg-slate-900 border-b border-primary/10 sticky top-20 z-40 p-6 flex flex-wrap gap-8 items-center justify-between shadow-sm">
            <div className="flex gap-12">
                <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Budget</p>
                    <p className="text-2xl font-black text-slate-900 dark:text-white">₹{budget.toLocaleString()}</p>
                </div>
                <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Used Budget</p>
                    <p className="text-2xl font-black text-primary">₹{used.toLocaleString()}</p>
                </div>
                <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Remaining</p>
                    <p className="text-2xl font-black text-emerald-500">₹{remaining.toLocaleString()}</p>
                </div>
            </div>
            <div className="bg-primary/5 px-6 py-3 rounded-2xl border border-primary/10 text-right">
                <p className="text-[10px] font-black uppercase tracking-widest text-primary">Per Person Cost</p>
                <p className="text-xl font-black text-primary">₹{perPerson.toLocaleString()}</p>
            </div>
        </div>
    );
}

function TripTimeline({ selections }: { selections: any[] }) {
    if (selections.length === 0) return null;
    return (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-primary/10 shadow-sm space-y-4">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <Calendar className="size-4" /> Your Trip Timeline
            </h3>
            <div className="space-y-4 relative">
                <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-slate-100 dark:bg-slate-800" />
                {selections.map((item, idx) => (
                    <div key={idx} className="flex gap-4 relative z-10">
                        <div className={item.category === 'stay' ? "size-8 rounded-full bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20" : "size-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20"}>
                            {item.category === 'stay' ? <Hotel className="size-4" /> : <Bike className="size-4" />}
                        </div>
                        <div className="flex-1 pb-4">
                            <p className="text-xs font-bold text-slate-400">Day {item.start_day} {item.end_day && `\u2014 Day ${item.end_day}`}</p>
                            <h4 className="font-bold text-slate-900 dark:text-white">{item.title}</h4>
                            <p className="text-xs text-slate-500">₹{item.price.toLocaleString()}{item.category === 'stay' ? '/night' : ''}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function BudgetInner() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const mode = searchParams.get('mode') as 'manual' | 'ai';
    const destination = searchParams.get('destination');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const budget = parseFloat(searchParams.get('budget') || '0');
    const travelers = parseInt(searchParams.get('travelers') || '1');

    const [currentDay, setCurrentDay] = useState(1);
    const [totalDays, setTotalDays] = useState(1);
    const [selections, setSelections] = useState<any[]>([]);
    const [options, setOptions] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [aiResults, setAiResults] = useState<any>(null);

    useEffect(() => {
        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            setTotalDays(Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 3600 * 24))));
        }
    }, [startDate, endDate]);

    useEffect(() => {
        if (mode === 'manual' && destination) {
            fetchOptions();
        } else if (mode === 'ai' && destination) {
            fetchAiPlans();
        }
    }, [mode, destination, currentDay]);

    const fetchOptions = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`/api/budget/options?destination=${destination}`);
            setOptions(res.data.options);
        } catch (err) {
            toast.error("Failed to fetch options");
        } finally {
            setLoading(false);
        }
    };

    const fetchAiPlans = async () => {
        setLoading(true);
        try {
            const res = await axios.post('/api/budget/planner/ai', {
                destination,
                start_date: startDate,
                end_date: endDate,
                budget,
                travelers
            });
            setAiResults(res.data);
        } catch (err) {
            toast.error("Failed to generate AI plan");
        } finally {
            setLoading(false);
        }
    };

    const addSelection = (option: any) => {
        const newItem = {
            ...option,
            start_day: option.category === 'stay' ? 1 : currentDay,
            end_day: option.category === 'stay' ? (totalDays + 1) : currentDay,
            duration_days: option.category === 'stay' ? totalDays : (option.duration_days || 1)
        };

        if (option.category === 'stay') {
            // Find if ANY stay is already selected
            const existingStayIdx = selections.findIndex(s => s.category === 'stay');
            
            if (existingStayIdx !== -1) {
                const newSelections = [...selections];
                newSelections[existingStayIdx] = newItem;
                setSelections(newSelections);
                toast.success(`Updated stay to ${option.title}`);
            } else {
                setSelections([...selections, newItem]);
                toast.success(`Selected ${option.title} as your trip stay`);
            }
        } else {
            // Activities can be multiple per day
            setSelections([...selections, newItem]);
            toast.success(`Added ${option.title} to Day ${currentDay}`);
        }
    };

    const removeSelection = (idx: number) => {
        const newSelections = [...selections];
        const removed = newSelections.splice(idx, 1)[0];
        setSelections(newSelections);

        // Recalculate current day if we removed a stay
        if (removed.category === 'stay') {
            const lastStay = [...newSelections].reverse().find(s => s.category === 'stay');
            setCurrentDay(lastStay ? lastStay.end_day : 1);
        }
    };

    const promoteTrip = async () => {
        try {
            // First create a trip, then promote it
            const tripRes = await axios.post('/api/trips', {
                name: `${destination} Trip`,
                destination,
                start_date: startDate,
                end_date: endDate,
                budget,
                num_travelers: travelers
            });

            await axios.post(`/api/budget/promote/${tripRes.data.trip.id}`);
            toast.success("Trip promoted to Explore page!");
            router.push('/explore');
        } catch (err) {
            toast.error("Failed to promote trip");
        }
    };

    const usedBudget = selections.reduce((acc, curr) => {
        if (curr.category === 'stay') {
            return acc + (curr.price * (curr.duration_days || 1));
        }
        return acc + curr.price;
    }, 0);

    const planningProgress = Math.min(100, (currentDay / totalDays) * 100);

    if (loading && selections.length === 0 && !aiResults) {
        return <FullPageLoader />;
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
            <BudgetHeader budget={budget} used={usedBudget} perPerson={usedBudget / travelers} />

            <div className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-8 pt-8">

                {/* Left Column: Flow Control */}
                <div className="lg:col-span-2 space-y-8">

                    {mode === 'manual' ? (
                        <>
                            {/* Progress UI */}
                            <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-primary/10 shadow-sm space-y-6">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <h2 className="text-2xl font-black text-slate-900 dark:text-white">Trip Progress</h2>
                                        <p className="text-slate-500 text-sm">Day {Math.min(currentDay, totalDays)} of {totalDays} planned</p>
                                    </div>
                                    <Badge variant="outline" className="text-primary border-primary/20 bg-primary/5 rounded-full px-4 py-1 uppercase text-[10px] font-black tracking-widest">
                                        {currentDay >= totalDays ? "Ready to finalize" : "In Progress"}
                                    </Badge>
                                </div>
                                <Progress value={planningProgress} className="h-4 rounded-full bg-slate-100 dark:bg-slate-800" />
                            </div>

                            {/* Selection Interface */}
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                                        <div className="size-8 rounded-xl bg-primary text-white flex items-center justify-center font-black italic">
                                            <Hotel className="size-4" />
                                        </div>
                                        Select Your Trip Stay
                                    </h3>
                                    <div className="flex gap-2">
                                        <Button variant="ghost" className="rounded-full text-slate-400 hover:text-primary">Stays</Button>
                                        <Button variant="ghost" className="rounded-full text-slate-400 hover:text-primary">Activities</Button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {options.filter(o => o.category === 'stay').slice(0, 4).map((opt) => {
                                        const isSelected = selections.some(s => 
                                            String(s.id) === String(opt.id) && 
                                            s.category === 'stay'
                                        );
                                        const imageUrl = getOptionImages(opt)[0];
                                        return (
                                            <Card 
                                                key={opt.id} 
                                                className={cn(
                                                    "rounded-3xl overflow-hidden transition-all group shadow-sm bg-white dark:bg-slate-900 border-2",
                                                    isSelected 
                                                        ? "border-green-500 ring-4 ring-green-500/10 shadow-lg shadow-green-500/5 scale-[1.02]" 
                                                        : "border-primary/5 hover:border-primary"
                                                )}
                                            >
                                                <div className="h-40 bg-slate-200 relative">
                                                    <SafeImage 
                                                        src={imageUrl} 
                                                        alt={opt.title} 
                                                        fallbackIcon={Hotel} 
                                                    />
                                                    <div className="absolute top-3 right-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-3 py-1 rounded-full text-xs font-black text-primary z-20">
                                                        ₹{opt.price.toLocaleString()}/night
                                                    </div>
                                                    {isSelected && (
                                                        <div className="absolute top-3 left-3 bg-green-500 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest z-20 shadow-lg flex items-center gap-1 animate-in zoom-in duration-300">
                                                            <CheckCircle2 className="size-3" />
                                                            Selected
                                                        </div>
                                                    )}
                                                </div>
                                                <CardHeader className="p-5">
                                                    <CardTitle className="text-lg line-clamp-1">{opt.title}</CardTitle>
                                                    <CardDescription className="line-clamp-1">{opt.destination}</CardDescription>
                                                </CardHeader>
                                                <CardFooter className="p-5 pt-0">
                                                    <Button 
                                                        className={cn(
                                                            "w-full rounded-xl transition-all font-black uppercase tracking-widest text-[10px]",
                                                            isSelected ? "bg-green-500 hover:bg-green-600 text-white" : ""
                                                        )} 
                                                        onClick={() => addSelection(opt)}
                                                    >
                                                        {isSelected ? "Change Stay" : "Select Stay"}
                                                    </Button>
                                                </CardFooter>
                                            </Card>
                                        );
                                    })}
                                    {options.length === 0 && (
                                        <Card className="col-span-full border-dashed border-2 py-12 flex flex-col items-center justify-center text-slate-400 bg-transparent">
                                            <Hotel className="size-12 mb-4 opacity-20" />
                                            <p className="font-bold">No stays found for {destination}</p>
                                            <p className="text-sm">Try searching for another destination</p>
                                        </Card>
                                    )}
                                </div>

                                <Separator className="bg-primary/5" />

                                <div className="space-y-4">
                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                                        <Plus className="size-6 text-primary" />
                                        Add Activities for Day {currentDay}
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {options.filter(o => (o.category || 'activity') !== 'stay').slice(0, 6).map((opt) => {
                                            const isSelected = selections.some(s => 
                                                String(s.id) === String(opt.id) && 
                                                s.start_day === currentDay
                                            );
                                            const imageUrl = getOptionImages(opt)[0];
                                            return (
                                                <Card 
                                                    key={opt.id} 
                                                    className={cn(
                                                        "rounded-3xl transition-all cursor-pointer bg-white dark:bg-slate-900 shadow-sm p-4 flex items-center gap-4 relative overflow-hidden border-2",
                                                        isSelected 
                                                            ? "border-green-500 ring-4 ring-green-500/5 bg-green-50/30 shadow-md" 
                                                            : "border-slate-100 hover:border-primary"
                                                    )} 
                                                    onClick={() => addSelection(opt)}
                                                >
                                                    <div className={cn(
                                                        "p-3 rounded-2xl transition-colors",
                                                        isSelected ? "bg-green-500 text-white" : "bg-primary/5 text-primary"
                                                    )}>
                                                        <Bike className="size-5" />
                                                    </div>
                                                    <div className="grow">
                                                        <p className="font-bold text-sm leading-tight line-clamp-1">{opt.title}</p>
                                                        <p className={cn(
                                                            "text-xs font-bold",
                                                            isSelected ? "text-green-600" : "text-primary/60"
                                                        )}>₹{opt.price.toLocaleString()}</p>
                                                    </div>
                                                    {isSelected ? (
                                                        <CheckCircle2 className="size-4 text-green-500" />
                                                    ) : (
                                                        <Plus className="size-4 text-slate-300 group-hover:text-primary" />
                                                    )}
                                                </Card>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="pt-10 flex justify-center">
                                    {currentDay < totalDays ? (
                                        <Button 
                                            className="rounded-full px-12 py-7 text-lg font-black uppercase tracking-widest gap-3 shadow-xl shadow-primary/20 hover:-translate-y-1 transition-all"
                                            onClick={() => setCurrentDay(prev => prev + 1)}
                                        >
                                            Proceed to Day {currentDay + 1}
                                            <ArrowRight className="size-5" />
                                        </Button>
                                    ) : (
                                        <Button 
                                            className="rounded-full px-12 py-7 text-lg font-black uppercase tracking-widest gap-3 shadow-xl bg-green-500 hover:bg-green-600 shadow-green-500/20 hover:-translate-y-1 transition-all"
                                            onClick={() => {
                                                // Logic for committing the trip
                                                toast.success("Congratulations! Your trip plan is ready. ✨");
                                            }}
                                        >
                                            Complete Trip Plan
                                            <Sparkles className="size-5" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            {/* AI Results */}
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h2 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-3 italic">
                                            AI Crafted Plans <Sparkles className="size-6 text-purple-500" />
                                        </h2>
                                        <p className="text-slate-500">Optimized for your budget of ₹{budget.toLocaleString()}</p>
                                    </div>
                                    <Button variant="outline" className="rounded-full gap-2 border-purple-500 text-purple-600 hover:bg-purple-50" onClick={fetchAiPlans}>
                                        <Loader2 className={loading ? "animate-spin size-4" : "hidden"} />
                                        Regenerate
                                    </Button>
                                </div>

                                <div className="grid grid-cols-1 gap-6">
                                    {aiResults && Object.entries(aiResults).map(([key, plan]: [any, any]) => (
                                        <Card key={key} className={key === 'best_match' ? "rounded-3xl border-purple-500 border-2 overflow-hidden shadow-2xl relative bg-white dark:bg-slate-900" : "rounded-3xl border-slate-200 overflow-hidden shadow-sm bg-white dark:bg-slate-900"}>
                                            {key === 'best_match' && (
                                                <div className="absolute top-4 right-4 bg-purple-600 text-white px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">
                                                    Recommended
                                                </div>
                                            )}
                                            <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8">
                                                <div className="md:col-span-2 space-y-6">
                                                    <div className="space-y-1">
                                                        <Badge variant="outline" className="uppercase text-[10px] font-black border-slate-200 text-slate-400 mb-2">
                                                            {key.replace('_', ' ')}
                                                        </Badge>
                                                        <h3 className="text-2xl font-black text-slate-900 dark:text-white capitalize truncate">{key.replace('_', ' ')} Itinerary</h3>
                                                        <p className="text-slate-500 text-sm">{plan.stays.length} Stays & {plan.activities.length} Activities</p>
                                                    </div>
                                                    <div className="flex flex-wrap gap-2">
                                                        {plan.stays.slice(0, 3).map((s: any, i: number) => (
                                                            <Badge key={i} variant="secondary" className="bg-slate-100 text-slate-600 hover:bg-slate-100 rounded-full">{s.title}</Badge>
                                                        ))}
                                                        {plan.activities.slice(0, 2).map((a: any, i: number) => (
                                                            <Badge key={i} variant="secondary" className="bg-emerald-50 text-emerald-600 hover:bg-emerald-50 rounded-full">{a.title}</Badge>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl flex flex-col justify-between items-end border border-slate-100 dark:border-slate-800">
                                                    <div className="text-right">
                                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Price</p>
                                                        <p className="text-2xl font-black text-slate-900 dark:text-white">₹{plan.total_cost.toLocaleString()}</p>
                                                        <p className="text-xs text-primary font-bold">₹{plan.per_person.toLocaleString()} PP</p>
                                                    </div>
                                                    <Button className={key === 'best_match' ? "bg-purple-600 hover:bg-purple-700 w-full rounded-xl mt-4" : "w-full rounded-xl mt-4"} onClick={() => {
                                                        setSelections([...plan.stays, ...plan.activities]);
                                                        toast.success(`Adopted ${key.replace('_', ' ')} plan`);
                                                    }}>
                                                        Accept Plan
                                                    </Button>
                                                </div>
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}

                </div>

                {/* Right Column: Summary & Finalize */}
                <div className="space-y-6">
                    <TripTimeline selections={selections} />

                    <Card className="rounded-3xl border-primary shadow-xl overflow-hidden">
                        <CardHeader className="bg-primary p-6 text-white">
                            <CardTitle className="flex items-center justify-between">
                                Finalize Trip
                                <CheckCircle2 className="size-6 opacity-50" />
                            </CardTitle>
                            <CardDescription className="text-primary-foreground/70">Review your itinerary and share with friends.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                            <div className="space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500 font-bold">Planned Days</span>
                                    <span className="font-black">{selections.filter(s => s.category === 'stay').reduce((acc, curr) => acc + (curr.duration_days || 1), 0)} / {totalDays}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500 font-bold">Total Cost</span>
                                    <span className="font-black text-primary text-lg">₹{usedBudget.toLocaleString()}</span>
                                </div>
                            </div>
                            <Separator />
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Visibility</p>
                            <p className="text-sm text-slate-500">Promoting your trip makes it visible to others on the <span className="font-bold text-primary italic">Explore Page</span>.</p>
                        </CardContent>
                        <CardFooter className="p-6 pt-0 flex flex-col gap-3">
                            <Button className="w-full rounded-xl py-6 gap-2 font-black uppercase tracking-widest shadow-lg shadow-primary/20" disabled={selections.length === 0} onClick={promoteTrip}>
                                <Share2 className="size-5" /> Promote Trip
                            </Button>
                            <Button variant="ghost" className="w-full rounded-xl text-slate-400" onClick={() => router.push('/budget')}>
                                Start Over
                            </Button>
                        </CardFooter>
                    </Card>
                </div>

            </div>
        </div>
    );
}

export default function BudgetPlannerPage() {
    return (
        <Suspense fallback={<FullPageLoader />}>
            <BudgetInner />
        </Suspense>
    );
}
