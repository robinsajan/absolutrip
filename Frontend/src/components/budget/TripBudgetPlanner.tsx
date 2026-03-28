"use client";

import { useState, useEffect } from "react";
import {
    MapPin,
    Calendar,
    Sparkles,
    CheckCircle2,
    Save,
    Plus,
    Trash2,
    Hotel,
    Bike,
    ArrowRight,
    Loader2,
    RefreshCcw,
    ChevronsRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { toast } from "sonner";
import { format, addDays, parseISO, differenceInDays } from "date-fns";
import axios from "@/lib/api/client";
import { trips as tripsApi, options as optionsApi } from "@/lib/api/endpoints";
import type { Trip } from "@/types";

// ── Utility ──────────────────────────────────────────────────────────────────
const getOptionImageUrl = (opt: any) => {
    if (!opt) return null;
    const urlStr = opt.image_url || '';
    const pathStr = opt.image_path || '';
    
    // Split and get the first image
    const singleUrl = urlStr ? urlStr.split(',')[0].trim() : null;
    const singlePath = pathStr ? pathStr.split(',')[0].trim() : null;
    
    if (singleUrl) {
        return singleUrl.startsWith('http') ? singleUrl : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${singleUrl}`;
    }
    
    if (singlePath) {
        return `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/uploads/options/${singlePath}`;
    }
    
    return null;
};

const getUnitPrice = (opt: any, trip: Trip | null) => {
    if (opt.price_per_day_pp) return parseFloat(opt.price_per_day_pp);
    const base = parseFloat(opt.price) || 0;
    const travelers = trip?.num_travelers || 1;
    return opt.category === 'stay' ? base / (opt.duration_days || 1) / travelers : (opt.is_per_person ? (base / travelers) : base);
};

// ── Sub-components for Stability ───────────────────────────────────────────

function OptionInfoSheet({ opt, open, onClose, onSelect, tripDestination }: any) {
    if (!opt) return null;
    return (
        <Sheet open={open} onOpenChange={onClose}>
            <SheetContent side="right" className="w-full max-w-md p-0 overflow-hidden flex flex-col">
                <SheetHeader className="sr-only">
                    <SheetTitle>{opt.title}</SheetTitle>
                    <SheetDescription>Details about {opt.title}</SheetDescription>
                </SheetHeader>
                <div className="relative h-52 shrink-0 bg-slate-100">
                    {getOptionImageUrl(opt) && <img src={getOptionImageUrl(opt)!} alt={opt.title} className="w-full h-full object-cover" />}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-4 left-5 right-5">
                        <Badge className="mb-1 bg-white/20 backdrop-blur-sm text-white">{opt.category === 'stay' ? 'Stay' : 'Activity'}</Badge>
                        <h2 className="text-xl font-black text-white leading-tight">{opt.title}</h2>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Location</p>
                        <p className="text-sm font-semibold">{opt.destination || tripDestination}</p>
                    </div>
                    {opt.category === 'stay' && opt.check_in_date && (
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Dates</p>
                            <p className="text-sm font-semibold">
                                {format(parseISO(opt.check_in_date), 'MMM d, yyyy')} - {format(parseISO(opt.check_out_date), 'MMM d, yyyy')}
                            </p>
                        </div>
                    )}
                    <div className="bg-slate-50 p-4 rounded-2xl flex justify-between items-center">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Price</p>
                            <p className="text-2xl font-black">₹{parseFloat(opt.price_per_day_pp || opt.price || 0).toLocaleString()}</p>
                        </div>
                    </div>
                    {opt.notes && (
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">About</p>
                        <p className="text-sm text-slate-600 leading-relaxed">{opt.notes}</p>
                      </div>
                    )}
                </div>
                <div className="p-5 border-t">
                    <Button className="w-full rounded-2xl py-6 font-black uppercase text-xs tracking-widest" onClick={() => { onSelect(opt); onClose(); }}>Add to Plan</Button>
                </div>
            </SheetContent>
        </Sheet>
    );
}

function BudgetHeader({ adminEstimate, perPerson, onReset, onSave }: any) {
    const diff = perPerson - adminEstimate;
    return (
        <div className="bg-white dark:bg-slate-900 border-b border-primary/10 p-8 flex flex-wrap gap-8 items-center justify-between shadow-sm rounded-[32px] mb-8">
            <div className="flex gap-16">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Target Price (Admin)</p>
                    <p className="text-3xl font-black text-slate-900 dark:text-white">₹{adminEstimate.toLocaleString('en-IN')}</p>
                </div>
                <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Your Plan Total</p>
                    <p className="text-3xl font-black text-primary">₹{perPerson.toLocaleString()}</p>
                </div>
                {adminEstimate > 0 && perPerson > 0 && (
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Difference</p>
                        <p className={`text-3xl font-black ${diff > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                            {diff > 0 ? '+' : ''}₹{diff.toLocaleString()}
                        </p>
                    </div>
                )}
            </div>
            <div className="flex gap-3">
                <Button variant="default" className="rounded-full bg-emerald-500 hover:bg-emerald-600 px-6 font-black uppercase text-[10px]" onClick={onSave}>Save Plan</Button>
                <Button variant="ghost" className="rounded-full bg-red-50 text-red-500 hover:bg-red-100 px-6 font-black uppercase text-[10px]" onClick={onReset}>Reset</Button>
            </div>
        </div>
    );
}

function TripTimeline({ selections, onRemove, totalDays, startDate, travelers, onSave, loading }: any) {
    const stays = selections.filter((s: any) => s.category === 'stay').sort((a: any, b: any) => a.planned_day - b.planned_day);
    const activities = selections.filter((s: any) => s.category !== 'stay').sort((a: any, b: any) => a.planned_day - b.planned_day);

    return (
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border border-primary/10 shadow-sm space-y-10">
            {/* Stays Section */}
            <div className="space-y-6">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                    <Hotel className="size-4" /> Accommodations
                </h3>
                {stays.length === 0 ? (
                    <p className="text-slate-300 text-xs italic ml-2">No stays selected</p>
                ) : (
                    <div className="space-y-4">
                        {stays.map((stay: any) => {
                            const getStayDates = () => {
                                if (!startDate) return null;
                                const start = addDays(parseISO(startDate), stay.planned_day - 1);
                                const end = addDays(parseISO(startDate), (stay.end_day || stay.planned_day) - 1);
                                return `${format(start, 'MMM d')} - ${format(end, 'MMM d')}`;
                            };

                            return (
                                <div key={stay.id} className="flex gap-5 items-center bg-slate-50 p-4 rounded-[28px] group relative border border-transparent hover:border-primary/20 transition-all">
                                    <div className="size-14 rounded-2xl overflow-hidden shrink-0 shadow-sm">
                                        {getOptionImageUrl(stay) ? <img src={getOptionImageUrl(stay)!} className="w-full h-full object-cover" /> : <Hotel className="size-6 opacity-20 p-3" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className="flex flex-col">
                                                <Badge className="bg-primary/10 text-primary border-none text-[8px] font-black uppercase px-2 w-fit mb-0.5">Day {stay.planned_day} &mdash; {stay.end_day || stay.planned_day}</Badge>
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{getStayDates()}</span>
                                            </div>
                                            <span className="text-[10px] font-black text-primary ml-auto">₹{((stay.total_price || 0) / (travelers || 1)).toLocaleString()}</span>
                                        </div>
                                        <h4 className="font-bold text-slate-900 text-sm truncate">{stay.title}</h4>
                                    </div>
                                    <button className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity p-2" onClick={() => onRemove(selections.indexOf(stay))}>
                                        <Trash2 className="size-4" />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="h-px bg-slate-100 mx-2" />

            <div className="h-px bg-slate-100 mx-2" />

            {/* Activities Section */}
            <div className="space-y-6">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                    <Bike className="size-4" /> Activities & More
                </h3>
                {activities.length === 0 ? (
                    <p className="text-slate-300 text-xs italic ml-2">No activities selected</p>
                ) : (
                    <div className="space-y-3">
                        {activities.map((item: any) => (
                            <div key={`${item.planned_day}-${item.id}`} className="flex gap-4 items-center group relative p-3 bg-slate-50/50 rounded-2xl hover:bg-slate-50 transition-colors border border-transparent hover:border-primary/10">
                                <div className="size-10 rounded-xl overflow-hidden shrink-0 bg-white border border-slate-100 shadow-sm">
                                    {getOptionImageUrl(item) ? <img src={getOptionImageUrl(item)!} className="w-full h-full object-cover" /> : <MapPin className="size-4 opacity-20" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex flex-col">
                                            <h4 className="font-bold text-slate-900 text-[11px] truncate">{item.title}</h4>
                                            <span className="text-[8px] font-black text-slate-400 uppercase">Selected for Day {item.planned_day}</span>
                                        </div>
                                        <span className="text-[10px] font-black text-primary">₹{((item.total_price || 0) / (travelers || 1)).toLocaleString()}</span>
                                    </div>
                                </div>
                                <button className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity p-1" onClick={() => onRemove(selections.indexOf(item))}>
                                    <Trash2 className="size-3.5" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {selections.length > 0 && (
                <div className="pt-6 border-t border-slate-50 flex justify-between items-center">
                    <p className="text-[9px] font-bold text-slate-400 max-w-[180px]">Saving will update your trip's primary itinerary.</p>
                    <Button 
                        size="sm"
                        className="rounded-2xl px-6 py-5 font-black uppercase text-[10px] tracking-widest bg-slate-900 text-white hover:bg-slate-800 transition-all shadow-lg gap-2 h-auto" 
                        onClick={onSave}
                        disabled={loading}
                    >
                        {loading ? <Loader2 className="animate-spin size-3" /> : <Save className="size-3" />}
                        Commit
                    </Button>
                </div>
            )}
        </div>
    );
}

// ── MAIN COMPONENT ──────────────────────────────────────────────────────────
export function TripBudgetPlanner({ tripId }: { tripId: number }) {
    const [trip, setTrip] = useState<Trip | null>(null);
    const [selections, setSelections] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [planningMode, setPlanningMode] = useState<'manual' | 'ai'>('manual');
    const [aiStep, setAiStep] = useState<'budget' | 'results'>('budget');
    const [aiResults, setAiResults] = useState<any | null>(null);
    const [aiBudget, setAiBudget] = useState<string>('');
    const [currentDay, setCurrentDay] = useState(1);
    const [activeStayEndDay, setActiveStayEndDay] = useState<number | null>(null);
    const [manualStep, setManualStep] = useState<'stay' | 'activity'>('stay');
    const [reservedOptions, setReservedOptions] = useState<any[]>([]);
    const [infoOpt, setInfoOpt] = useState<any | null>(null);
    const [allOptions, setAllOptions] = useState<any[]>([]);

    useEffect(() => { fetchTripData(); }, [tripId]);

    const fetchTripData = async () => {
        setLoading(true);
        try {
            const [tRes, oRes] = await Promise.all([tripsApi.get(tripId), optionsApi.list(tripId)]);
            setTrip(tRes.trip);
            const hubOptions = oRes.options || [];
            setReservedOptions(hubOptions);
            
            // Fetch plans and global fallback in parallel to main load, without blocking 'loading' state if possible
            axios.get(`/budget/plans/${tripId}`).then(sRes => {
                if (sRes.data.plans?.[0]?.selections) {
                    setSelections(sRes.data.plans[0].selections);
                    const ls = [...sRes.data.plans[0].selections].filter(s => s.category === 'stay').sort((a, b) => b.end_day - a.end_day)[0];
                    setCurrentDay(ls ? ls.end_day + 1 : 1);
                }
            }).catch(() => {});

            if (hubOptions.length < 5) {
                const dest = tRes.trip?.destination || tRes.trip?.name;
                if (dest) {
                    axios.get(`/budget/options?destination=${dest}`).then(globalRes => {
                        setAllOptions(globalRes.data.options || []);
                    }).catch(() => {});
                }
            }
        } catch (err) { 
            toast.error("Failed to load planner data"); 
        } finally { 
            setLoading(false); 
        }
    };

    const fetchAiPlans = async () => {
        setLoading(true);
        try {
            const res = await axios.post('/budget/planner/ai', {
                trip_id: tripId, start_date: trip?.start_date, end_date: trip?.end_date, budget: trip?.budget || 0,
                travelers: trip?.num_travelers || 1, ai_budget: parseFloat(aiBudget) || 0
            });
            setAiResults(res.data);
            setAiStep('results');
        } catch (_) { toast.error("AI failed"); } finally { setLoading(false); }
    };

    const addSelection = (opt: any) => {
        let dur = opt.duration_days || 1;
        if (opt.category === 'stay' && opt.check_in_date && opt.check_out_date) {
            dur = Math.max(1, differenceInDays(parseISO(opt.check_out_date), parseISO(opt.check_in_date)));
        }
        const s = currentDay;
        const e = opt.category === 'stay' ? (s + dur - 1) : s;
        const up = getUnitPrice(opt, trip);
        const tp = opt.total_price || (up * dur * (trip?.num_travelers || 1));
        setSelections(p => [...p, { ...opt, planned_day: s, end_day: e, total_price: tp, unit_price: up, duration_days: dur }]);
        if (opt.category === 'stay') { setActiveStayEndDay(e); }
        toast.success("Added to plan!");
    };

    const saveScenario = async () => {
        setLoading(true);
        try {
            await axios.post(`/budget/plans/${tripId}`, {
                name: "Primary Budget Plan",
                selections: selections
            });
            toast.success("Budget scenario saved successfully!");
        } catch (err) {
            toast.error("Failed to save budget plan");
        } finally {
            setLoading(false);
            fetchTripData();
        }
    };

    const matchesDay = (o: any) => {
        if (o.category === 'stay') return !o.check_in_date || o.check_in_date === format(addDays(parseISO(trip!.start_date!), currentDay - 1), 'yyyy-MM-dd');
        return true;
    };

    if (loading && !trip) return <div className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-primary size-10" /></div>;
    if (!trip) return null;

    const totalDays = trip.start_date && trip.end_date ? Math.max(1, Math.round((new Date(trip.end_date).getTime() - new Date(trip.start_date).getTime()) / 86400000) + 1) : 1;
    const perPerson = (selections.reduce((a, c) => a + (parseFloat(c.total_price) || 0), 0)) / Math.max(trip.num_travelers || 1, 1);
    
    // Admin Estimate Calculation
    const adminPicks = (reservedOptions || []).filter(o => o.is_finalized);
    const adminEst = adminPicks.length > 0 
        ? adminPicks.reduce((acc, o) => acc + (getUnitPrice(o, trip) * (o.duration_days || 1)), 0)
        : allOptions.reduce((acc, o) => acc + getUnitPrice(o, trip), 0);

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <BudgetHeader 
                adminEstimate={adminEst} 
                perPerson={perPerson} 
                onReset={() => { if(confirm("Are you sure? This will clear your current timeline selections.")) { setSelections([]); setCurrentDay(1); setActiveStayEndDay(null); setManualStep('stay'); }}} 
                onSave={saveScenario} 
            />

            <div className="flex justify-center -mt-4">
                <Button variant="outline" className="rounded-full px-8 py-2 border-primary/20 bg-primary/5 text-primary hover:bg-primary hover:text-white transition-all text-[10px] font-black uppercase tracking-[0.2em] gap-2 group shadow-sm" onClick={() => { setPlanningMode('ai'); setAiStep('budget'); setAiResults(null); }}>
                    <Sparkles className="size-3 group-hover:rotate-12 transition-transform" /> Let AI plan your trip
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-2 space-y-8">
                    <div className="bg-white dark:bg-slate-900 rounded-[48px] border border-primary/10 p-10 shadow-sm relative overflow-hidden space-y-10">
                        <div className="flex justify-between items-center relative z-10">
                            {planningMode === 'ai' && <Button variant="ghost" className="rounded-full gap-2 text-slate-400 font-bold" onClick={() => setPlanningMode('manual')}><ArrowRight className="size-4 rotate-180" /> Back to Manual</Button>}
                            <Button variant="ghost" className="rounded-full gap-2 text-slate-400 font-bold ml-auto" onClick={fetchTripData}><RefreshCcw className="size-4" /> Reload Catalog</Button>
                        </div>

                        {planningMode === 'manual' ? (
                            <div className="space-y-10 animate-in slide-in-from-bottom-4 duration-500">
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-2">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-primary">{currentDay <= totalDays ? "Stay Selection" : "Activities Catalog"}</p>
                                            <h2 className="text-4xl font-black italic text-slate-900">
                                                {currentDay <= totalDays 
                                                    ? (activeStayEndDay ? `Days ${currentDay}\u2014${activeStayEndDay}` : `Day ${currentDay}`)
                                                    : "Enhance Your Trip"
                                                }
                                            </h2>
                                            {currentDay <= totalDays && (
                                                <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">{format(addDays(parseISO(trip.start_date!), currentDay - 1), 'MMMM do, yyyy')}</p>
                                            )}
                                        </div>
                                    </div>
                                    <Progress value={Math.min(100, (currentDay / totalDays) * 100)} className="h-2.5 rounded-full" />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {reservedOptions.filter(o => (currentDay > totalDays ? o.category !== 'stay' : o.category === manualStep) && matchesDay(o)).map((opt: any) => (
                                        <Card key={opt.id} className="rounded-[40px] border-2 border-primary/5 hover:border-primary transition-all p-3 flex gap-4 cursor-pointer group shadow-sm bg-white hover:shadow-2xl hover:-translate-y-1 relative" onClick={() => addSelection(opt)}>
                                            <button className="absolute top-4 right-4 z-20 size-8 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center text-slate-400 hover:text-primary shadow-sm" onClick={e => { e.stopPropagation(); setInfoOpt(opt); }}><ChevronsRight className="size-4" /></button>
                                            <div className="size-36 rounded-[32px] overflow-hidden shrink-0 bg-slate-50 relative">
                                                {getOptionImageUrl(opt) ? <img src={getOptionImageUrl(opt)!} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" /> : <div className="w-full h-full flex items-center justify-center"><Hotel className="opacity-20 size-10" /></div>}
                                            </div>
                                            <div className="flex flex-col justify-between py-2 grow pr-2">
                                                <div>
                                                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1">{opt.destination || trip.destination}</p>
                                                    <h4 className="font-bold text-slate-900 line-clamp-2 text-sm leading-tight">{opt.title}</h4>
                                                    {opt.category === 'stay' && opt.check_in_date && (
                                                        <p className="text-[9px] font-bold text-primary mt-1 flex items-center gap-1">
                                                            <Calendar className="size-2.5" />
                                                            {format(parseISO(opt.check_in_date), 'MMM d')} - {format(parseISO(opt.check_out_date), 'MMM d')}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="space-y-0.5">
                                                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Rate</p>
                                                    <p className="text-xl font-black text-primary">₹{getUnitPrice(opt, trip).toLocaleString()}<span className="text-[9px] text-slate-400 ml-1">/pp</span></p>
                                                </div>
                                            </div>
                                        </Card>
                                    ))}
                                    {reservedOptions.filter(o => o.category === manualStep && matchesDay(o)).length === 0 && (
                                        <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-100 rounded-[40px]">
                                            <MapPin className="size-10 text-slate-200 mx-auto mb-3" />
                                            <p className="text-slate-400 font-bold italic">No options matched for this day in Comparison Hub.</p>
                                        </div>
                                    )}
                                </div>

                                <div className="bg-slate-900 p-10 rounded-[48px] flex items-center justify-between text-white shadow-2xl relative overflow-hidden group">
                                    <div className="absolute right-0 top-0 opacity-10 -mr-10 -mt-10 animate-pulse transition-transform group-hover:scale-110 pointer-events-none transition-opacity duration-300"><Calendar className="size-48" /></div>
                                    <div className="flex items-center gap-5 relative z-10">
                                        <div className="size-14 rounded-3xl bg-primary flex items-center justify-center text-white shadow-lg"><CheckCircle2 className="size-8" /></div>
                                        <div>
                                            <p className="text-xs font-black uppercase tracking-[0.2em] text-primary mb-1">Status</p>
                                            <p className="text-slate-300 text-sm font-bold">{currentDay <= totalDays ? `Day ${currentDay} in progress` : "All Stays Selected!"}</p>
                                        </div>
                                    </div>
                                    {currentDay <= totalDays ? (
                                        <Button className="rounded-[24px] px-12 py-7 font-black uppercase text-[10px] tracking-widest bg-white text-slate-900 hover:bg-primary hover:text-white transition-all shadow-xl gap-2 h-auto relative z-10" onClick={() => {
                                            const n = activeStayEndDay ? activeStayEndDay + 1 : currentDay + 1;
                                            if (n <= totalDays) { setCurrentDay(n); setActiveStayEndDay(null); setManualStep('stay'); }
                                            else { setCurrentDay(totalDays + 1); setManualStep('activity'); }
                                        }}>Next Destination <ArrowRight className="size-4" /></Button>
                                    ) : <Badge className="bg-primary/20 text-primary rounded-full px-6 py-2 border-none font-black text-[10px]">PLANNING ACTIVITIES & MORE</Badge>}
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-10 animate-in fade-in duration-500">
                                {aiStep === 'budget' ? (
                                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-[48px] p-16 flex flex-col items-center gap-10 text-center border-2 border-dashed border-slate-100 relative">
                                        <div className="bg-gradient-to-br from-purple-500 to-indigo-600 size-24 rounded-3xl flex items-center justify-center text-white shadow-2xl animate-bounce"><Sparkles className="size-12" /></div>
                                        <div className="space-y-3">
                                            <h3 className="text-4xl font-black text-slate-900 italic">Smart AI Planner</h3>
                                            <p className="text-slate-500 text-sm max-w-sm mx-auto font-medium">Define your target budget and we'll build the best possible itinerary using only your comparison hub options.</p>
                                        </div>
                                        <div className="w-full max-w-xs space-y-6">
                                            <div className="relative group">
                                                <span className="absolute left-8 top-1/2 -translate-y-1/2 text-slate-300 font-extrabold text-3xl transition-colors group-focus-within:text-purple-500">₹</span>
                                                <input type="number" value={aiBudget} onChange={e => setAiBudget(e.target.value)} className="w-full pl-16 pr-8 py-8 rounded-[36px] border-2 border-transparent bg-white text-slate-900 font-black text-3xl focus:outline-none focus:border-purple-500 transition-all shadow-2xl text-center" placeholder="15000" />
                                            </div>
                                            <Button className="w-full rounded-[28px] py-10 font-black uppercase tracking-[0.2em] text-xs gap-4 bg-black text-white hover:bg-slate-800 transition-all shadow-2xl h-auto" disabled={loading} onClick={fetchAiPlans}>
                                                {loading ? <Loader2 className="animate-spin size-6" /> : <Sparkles className="size-6" />} Start Planning
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-8">
                                        <div className="flex items-center justify-between px-2">
                                            <button onClick={() => setAiStep('budget')} className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-3 hover:text-primary transition-colors"><ArrowRight className="size-3 rotate-180" /> Change Budget</button>
                                            <p className="text-[10px] font-black uppercase text-slate-300 tracking-[0.2em]">{Object.keys(aiResults || {}).length} Possible Itineraries</p>
                                        </div>
                                        <div className="space-y-6">
                                            {Object.values(aiResults || {}).map((plan: any, idx: number) => (
                                                <Card key={idx} className={`rounded-[48px] p-10 flex flex-col md:flex-row gap-10 items-center justify-between transition-all hover:scale-[1.01] ${idx === 0 ? "border-2 border-purple-500 shadow-2xl ring-4 ring-purple-50" : "border border-slate-100 shadow-sm"}`}>
                                                    <div className="flex-1 text-left space-y-6">
                                                        <Badge className={`rounded-full px-5 py-1.5 text-[9px] font-black uppercase tracking-widest ${idx === 0 ? "bg-purple-100 text-purple-700" : "bg-slate-100 text-slate-500"}`}>{idx === 0 ? '🏆 Best Value' : `Suggested Plan ${idx + 1}`}</Badge>
                                                        <div className="flex flex-wrap gap-3">
                                                            {(plan.stays || []).map((s: any, i: number) => <div key={i} className="px-4 py-2 bg-slate-50 rounded-2xl text-xs font-bold border border-slate-100 flex items-center gap-2 text-slate-700"><Hotel className="size-3.5 text-primary" /> {s.title}</div>)}
                                                            {(plan.activities || []).map((a: any, i: number) => <div key={i} className="px-4 py-2 bg-emerald-50 rounded-2xl text-xs font-bold border border-emerald-100 flex items-center gap-2 text-emerald-700"><Bike className="size-3.5 text-emerald-500" /> {a.title}</div>)}
                                                        </div>
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">TOTAL ESTIMATE</p>
                                                        <p className="text-5xl font-black text-slate-900 mb-6">₹{(plan.total_cost || 0).toLocaleString()}</p>
                                                        <Button className={`rounded-[24px] px-12 py-6 font-black uppercase text-[10px] tracking-widest h-auto transition-all ${idx === 0 ? "bg-purple-600 hover:bg-purple-700 text-white shadow-xl" : "bg-black text-white"}`} onClick={() => {
                                                            setSelections([]);
                                                            (plan.stays || []).forEach((s: any) => setSelections(p => [...p, { ...s, end_day: s.planned_day + (s.duration_days || 1) - 1 }]));
                                                            (plan.activities || []).forEach((a: any) => setSelections(p => [...p, a]));
                                                            setPlanningMode('manual');
                                                        }}>Apply Plan</Button>
                                                    </div>
                                                </Card>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-8">
                    <TripTimeline 
                        selections={selections} 
                        onRemove={(i: number) => setSelections(p => p.filter((_, idx) => idx !== i))} 
                        totalDays={totalDays}
                        startDate={trip.start_date}
                        travelers={trip.num_travelers}
                        onSave={saveScenario}
                        loading={loading}
                    />
                </div>
            </div>
            <OptionInfoSheet opt={infoOpt} open={!!infoOpt} onClose={() => setInfoOpt(null)} onSelect={addSelection} tripDestination={trip.destination} />
        </div>
    );
}
