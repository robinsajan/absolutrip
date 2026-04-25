import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFound() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 font-sans">
            <div className="text-center max-w-md animate-in slide-in-from-bottom-4 duration-700">
                <div className="size-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-8 border border-primary/20 shadow-xl shadow-primary/5 relative">
                    <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping opacity-20"></div>
                    <span className="material-symbols-outlined text-5xl text-primary material-symbols-filled">explore_off</span>
                </div>

                <h1 className="text-6xl font-black text-slate-900 dark:text-white tracking-tighter mb-4 italic uppercase">
                    404
                </h1>
                <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-6 tracking-tight">
                    Oops! Looks like you're lost.
                </h2>
                <p className="text-slate-500 mb-10 text-lg leading-relaxed font-medium">
                    The page you're looking for doesn't exist or might have been moved. Don't worry, let's get you back on track!
                </p>

                <Link
                    href="/trips"
                    className="inline-flex items-center gap-3 px-8 py-4 bg-primary text-white rounded-full font-black text-[13px] uppercase tracking-widest hover:bg-primary/90 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/20"
                >
                    <Compass className="size-5" />
                    Take me Home
                </Link>
            </div>
        </div>
    );
}
