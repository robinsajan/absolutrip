"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Sparkles, PersonStanding, Compass, Calendar, MapPin, IndianRupee } from "lucide-react";
import { toast } from "sonner";

export default function BudgetPlannerEntrance() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        destination: "",
        startDate: "",
        endDate: "",
        budget: "",
        travelers: "1"
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const startPlanning = (mode: "manual" | "ai") => {
        if (!formData.destination || !formData.startDate || !formData.endDate) {
            toast.error("Please fill in destination and dates");
            return;
        }

        const query = new URLSearchParams({
            ...formData,
            mode
        }).toString();

        router.push(`/budget/planner?${query}`);
    };

    return (
        <div className="min-h-[calc(100vh-5rem)] bg-slate-50 dark:bg-slate-950 p-6 flex items-center justify-center">
            <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div className="space-y-6">
                    <div className="space-y-2">
                        <h1 className="text-4xl font-extrabold tracking-tighter text-slate-900 dark:text-white sm:text-5xl">
                            Plan your next <span className="text-primary italic">adventure.</span>
                        </h1>
                        <p className="text-lg text-slate-500 dark:text-slate-400">
                            Select your destination and dates to get started. Choose between manual planning or let our AI build the perfect trip for you.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="destination">Destination</Label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-3 size-4 text-slate-400" />
                                <Input
                                    id="destination"
                                    name="destination"
                                    placeholder="Where are you going?"
                                    className="pl-10 h-10 rounded-xl"
                                    value={formData.destination}
                                    onChange={handleInputChange}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="startDate">Start Date</Label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-3 size-4 text-slate-400" />
                                    <Input
                                        id="startDate"
                                        name="startDate"
                                        type="date"
                                        className="pl-10 h-10 rounded-xl"
                                        value={formData.startDate}
                                        onChange={handleInputChange}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="endDate">End Date</Label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-3 size-4 text-slate-400" />
                                    <Input
                                        id="endDate"
                                        name="endDate"
                                        type="date"
                                        className="pl-10 h-10 rounded-xl"
                                        value={formData.endDate}
                                        onChange={handleInputChange}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="budget">Total Budget (Optional)</Label>
                                <div className="relative">
                                    <IndianRupee className="absolute left-3 top-3 size-4 text-slate-400" />
                                    <Input
                                        id="budget"
                                        name="budget"
                                        placeholder="e.g. 50000"
                                        className="pl-10 h-10 rounded-xl"
                                        value={formData.budget}
                                        onChange={handleInputChange}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="travelers">Travelers</Label>
                                <div className="relative">
                                    <PersonStanding className="absolute left-3 top-3 size-4 text-slate-400" />
                                    <Input
                                        id="travelers"
                                        name="travelers"
                                        type="number"
                                        min="1"
                                        className="pl-10 h-10 rounded-xl"
                                        value={formData.travelers}
                                        onChange={handleInputChange}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    <Card className="border-2 border-primary/20 hover:border-primary transition-all cursor-pointer group rounded-3xl overflow-hidden shadow-xl" onClick={() => startPlanning('manual')}>
                        <CardHeader className="bg-primary/5 group-hover:bg-primary/10 transition-colors">
                            <div className="bg-primary size-10 rounded-xl flex items-center justify-center text-white mb-2 shadow-lg shadow-primary/20">
                                <Compass className="size-6" />
                            </div>
                            <CardTitle>Plan It Yourself</CardTitle>
                            <CardDescription>Manually build your trip by selecting stays and activities day-by-day.</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-4">
                            <ul className="text-sm text-slate-500 space-y-2">
                                <li className="flex items-center gap-2"><div className="size-1.5 bg-primary rounded-full" /> Full control over every detail</li>
                                <li className="flex items-center gap-2"><div className="size-1.5 bg-primary rounded-full" /> Real-time budget tracking</li>
                                <li className="flex items-center gap-2"><div className="size-1.5 bg-primary rounded-full" /> Customizable itinerary</li>
                            </ul>
                        </CardContent>
                        <CardFooter>
                            <Button variant="default" className="w-full rounded-xl">Get Started</Button>
                        </CardFooter>
                    </Card>

                    <Card className="border-2 border-purple-500/20 hover:border-purple-500 transition-all cursor-pointer group rounded-3xl overflow-hidden shadow-xl" onClick={() => startPlanning('ai')}>
                        <CardHeader className="bg-purple-500/5 group-hover:bg-purple-500/10 transition-colors">
                            <div className="bg-gradient-to-br from-purple-500 to-indigo-600 size-10 rounded-xl flex items-center justify-center text-white mb-2 shadow-lg shadow-purple-500/20">
                                <Sparkles className="size-6" />
                            </div>
                            <CardTitle className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-600">Let AI Plan My Trip</CardTitle>
                            <CardDescription>Get a complete itinerary based on your budget and preferences within seconds.</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-4">
                            <ul className="text-sm text-slate-500 space-y-2">
                                <li className="flex items-center gap-2"><div className="size-1.5 bg-purple-500 rounded-full" /> Budget-optimized selections</li>
                                <li className="flex items-center gap-2"><div className="size-1.5 bg-purple-500 rounded-full" /> Personalized recommendations</li>
                                <li className="flex items-center gap-2"><div className="size-1.5 bg-purple-500 rounded-full" /> Instantly generated itineraries</li>
                            </ul>
                        </CardContent>
                        <CardFooter>
                            <Button variant="outline" className="w-full border-purple-500 text-purple-600 hover:bg-purple-50 rounded-xl">Generate Trip</Button>
                        </CardFooter>
                    </Card>
                </div>
            </div>
        </div>
    );
}
