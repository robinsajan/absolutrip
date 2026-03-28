"use client";

import { useState, useEffect } from "react";
import {
    Heart,
    Share2,
    MapPin,
    Calendar,
    Users,
    ArrowRight,
    TrendingUp,
    Filter,
    Search,
    ChevronRight,
    Compass,
    ArrowBigUp,
    Map,
    Hotel,
    Bike,
    User,
    ExternalLink,
    ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import axios from "@/lib/api/client";

export default function ExplorePromotedTrips() {
    const [trips, setTrips] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPromotedTrips();
    }, []);

    const fetchPromotedTrips = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/budget/explore');
            setTrips(res.data.trips);
        } catch (err) {
            toast.error("Failed to fetch promoted trips");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 md:p-12 space-y-12">
            {/* Search & Hero */}
            <div className="max-w-7xl mx-auto space-y-8">
                <div className="space-y-4">
                    <Badge className="bg-primary/10 text-primary border-primary/20 rounded-full px-6 py-1.5 uppercase text-[10px] font-black tracking-widest animate-pulse border">
                        Community Discovery
                    </Badge>
                    <h1 className="text-5xl md:text-7xl font-black text-slate-900 dark:text-white tracking-tighter italic leading-none">
                        Find your next <span className="text-primary italic">AbsoluTrip.</span>
                    </h1>
                    <p className="text-lg text-slate-500 max-w-2xl font-medium">
                        Explore trips planned and shared by the community. Copy their itineraries, join their adventures, or just get inspired.
                    </p>
                </div>

                <div className="flex flex-col md:flex-row gap-4 items-center bg-white dark:bg-slate-900 p-3 rounded-[40px] shadow-2xl border border-primary/5">
                    <div className="w-full relative px-6 flex items-center gap-3">
                        <Search className="size-5 text-slate-400" />
                        <Input placeholder="Search destination, creator, or vibe..." className="border-none shadow-none focus-visible:ring-0 bg-transparent text-lg font-bold p-0 placeholder:text-slate-300" />
                    </div>
                    <div className="flex gap-2 w-full md:w-auto px-6 py-2 border-l border-primary/10">
                        <Button variant="ghost" className="rounded-full gap-2 text-slate-500 font-bold">
                            <Filter className="size-4" /> Filters <ChevronDown className="size-4" />
                        </Button>
                        <Button className="rounded-full px-8 py-6 font-black uppercase tracking-widest shadow-lg shadow-primary/20">
                            Explore All
                        </Button>
                    </div>
                </div>
            </div>

            {/* Main Grid */}
            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {loading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="h-96 w-full rounded-[40px] bg-white dark:bg-slate-900 border border-primary/10 animate-pulse" />
                    ))
                ) : trips.length > 0 ? (
                    trips.map((trip) => (
                        <Card key={trip.id} className="group rounded-[40px] overflow-hidden border-primary/5 hover:border-primary/20 hover:shadow-2xl transition-all bg-white dark:bg-slate-900">
                            <div className="h-64 relative bg-slate-200">
                                <div className="absolute top-6 left-6 flex gap-2">
                                    <Badge className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md text-slate-900 dark:text-white rounded-full px-4 py-1.5 font-black uppercase text-[10px] tracking-widest shadow-sm">
                                        5 Days
                                    </Badge>
                                </div>
                                <div className="absolute top-6 right-6">
                                    <button className="size-10 rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-md flex items-center justify-center shadow-lg transition-transform hover:scale-110 active:scale-95 group-hover:bg-primary group-hover:text-white">
                                        <Heart className="size-5" />
                                    </button>
                                </div>
                                <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between">
                                    <div className="space-y-1">
                                        <p className="text-white drop-shadow-lg text-sm font-black uppercase tracking-widest flex items-center gap-2">
                                            <MapPin className="size-4" /> {trip.destination}
                                        </p>
                                        <h3 className="text-2xl font-black text-white drop-shadow-xl truncate">{trip.name}</h3>
                                    </div>
                                </div>
                            </div>
                            <CardContent className="p-8 space-y-6">
                                <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Budget</p>
                                        <p className="text-2xl font-black text-primary">₹{(trip.budget || 50000).toLocaleString()}</p>
                                    </div>
                                    <div className="text-right space-y-1">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Per Person</p>
                                        <p className="text-lg font-black text-slate-900 dark:text-white">₹{((trip.budget || 50000) / (trip.num_travelers || 1)).toLocaleString()}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className="size-10 rounded-full bg-accent-lime flex items-center justify-center font-black">
                                        {trip.members?.[0]?.user_name?.charAt(0).toUpperCase() || "A"}
                                    </div>
                                    <div className="space-y-0.5">
                                        <p className="text-sm font-black text-slate-900 dark:text-white leading-none">Created by {trip.members?.[0]?.user_name || "Member"}</p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">AbsoluTrip Explorer</p>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="p-8 pt-0 flex gap-3">
                                <Button className="flex-1 rounded-2xl py-6 gap-2 font-black uppercase tracking-widest shadow-lg shadow-primary/20 transition-all hover:scale-[1.02]">
                                    View Trip
                                </Button>
                                <Button variant="outline" className="size-12 rounded-2xl p-0 border-primary/10 hover:border-primary/50 text-slate-400 hover:text-primary transition-all">
                                    <Copy className="size-5" />
                                </Button>
                            </CardFooter>
                        </Card>
                    ))
                ) : (
                    <div className="col-span-full py-40 flex flex-col items-center justify-center text-center space-y-6 opacity-40">
                        <Compass className="size-24 text-primary animate-[spin_10s_linear_infinite]" />
                        <div className="space-y-2">
                            <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">No promoted trips found...</h3>
                            <p className="text-slate-500 font-medium">Be the first to promote a trip and share your adventure!</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function Copy({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
    )
}
