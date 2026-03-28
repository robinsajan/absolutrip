"use client";

import Link from "next/link";
import { useAuth } from "@/lib/hooks";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
    Popover,
    PopoverContent,
    PopoverTrigger
} from "@/components/ui/popover";

export function Header() {
    const { user, logout } = useAuth();
    const router = useRouter();
    const params = useParams();
    const tripId = params.tripId as string;

    const handleLogout = async () => {
        try {
            await logout();
            toast.success("Successfully logged out");
            router.push("/login");
        } catch (err) {
            toast.error("Logout failed");
        }
    };

    return (
        <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-primary/10 h-20">
            <div className="max-w-7xl mx-auto h-full px-6 flex items-center justify-between">
                <div className="flex items-center gap-8">
                    <Link href="/trips" className="flex items-center gap-2 group transition-all hover:scale-105 active:scale-95">
                        <div className="bg-primary p-2.5 rounded-xl text-white flex items-center justify-center shadow-lg shadow-primary/20 transition-transform group-hover:scale-110">
                            <span className="material-symbols-outlined outline-icon text-xl">flight_takeoff</span>
                        </div>
                        <span className="text-xl font-black tracking-tight text-black dark:text-white lowercase">absolutrip</span>
                    </Link>

                </div>

                {/* Right Section: Actions */}
                <div className="flex items-center gap-3 md:gap-5">
                    <button className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                        <span className="material-symbols-outlined outline-icon text-xl">notifications</span>
                    </button>

                    <Popover>
                        <PopoverTrigger asChild>
                            <button className="w-10 h-10 rounded-full bg-accent-lime flex items-center justify-center font-black text-black border-2 border-white dark:border-slate-800 shadow-sm hover:scale-110 active:scale-95 transition-all">
                                {user?.name?.charAt(0).toUpperCase() || "A"}
                            </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-56 p-2 rounded-2xl border-none shadow-2xl bg-white dark:bg-slate-900 overflow-hidden" align="end">
                            <div className="p-3 border-b border-slate-50 dark:border-slate-800 mb-2">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Account</p>
                                <p className="text-sm font-black truncate text-slate-900 dark:text-white">{user?.name || "Member"}</p>
                            </div>

                            <div className="flex flex-col gap-1">
                                {tripId && (
                                    <>
                                        <Link
                                            href={`/trip/${tripId}/members`}
                                            className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-bold text-slate-600 dark:text-slate-300 transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-xl outline-icon">group</span>
                                            Members
                                        </Link>
                                        <Link
                                            href={`/trip/${tripId}/settings`}
                                            className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-bold text-slate-600 dark:text-slate-300 transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-xl outline-icon">settings</span>
                                            Settings
                                        </Link>
                                        <div className="h-px bg-slate-50 dark:bg-slate-800 my-1 mx-2" />
                                    </>
                                )}

                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/20 text-sm font-bold text-red-600 transition-colors"
                                >
                                    <span className="material-symbols-outlined text-xl">logout</span>
                                    Logout
                                </button>
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>
            </div>
        </header>
    );
}
