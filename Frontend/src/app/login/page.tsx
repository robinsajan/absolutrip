"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { useAuth } from "@/lib/hooks";
import { useTheme } from "next-themes";


export default function LoginPage() {
    const router = useRouter();
    const { login, isAuthenticated, isLoading: authLoading } = useAuth();
    const { theme, setTheme } = useTheme();
    const [isLoading, setIsLoading] = useState(false);
    const [mounted, setMounted] = useState(false);

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!authLoading && isAuthenticated) {
            router.replace("/trips");
        }
    }, [authLoading, isAuthenticated, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) {
            toast.error("Please fill in all fields");
            return;
        }

        setIsLoading(true);
        try {
            await login(email, password);
            toast.success("Welcome back!");
            router.push("/trips");
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Invalid credentials");
        } finally {
            setIsLoading(false);
        }
    };

    const toggleDarkMode = () => {
        setTheme(theme === "dark" ? "light" : "dark");
    };

    return (
        <div className="bg-white dark:bg-background-dark text-slate-900 dark:text-slate-100 min-h-screen">
            <div className="flex flex-col md:flex-row min-h-screen">
                {/* Left Side (Desktop Only) */}
                <div className="hidden md:flex md:w-1/2 bg-primary p-16 flex-col justify-between relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/10 rounded-full blur-[120px] -mr-48 -mt-48"></div>
                    <div className="absolute bottom-0 left-0 w-96 h-96 bg-black/10 rounded-full blur-[100px] -ml-24 -mb-24"></div>

                    <div className="relative z-10">
                        <Link href="/" className="flex items-center gap-2 mb-20">
                            <div className="bg-white/20 p-2 rounded-xl text-white flex items-center justify-center backdrop-blur-md border border-white/20">
                                <span className="material-symbols-outlined outline-icon">flight_takeoff</span>
                            </div>
                            <span className="text-2xl font-extrabold tracking-tight text-white">absolutrip</span>
                        </Link>

                        <div className="max-w-md">
                            <div className="inline-flex items-center gap-2 bg-accent-lime text-black px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider mb-8">
                                welcome back
                                <span className="material-symbols-outlined text-sm">flare</span>
                            </div>
                            <h1 className="text-7xl font-extrabold text-white leading-[1] mb-6 tracking-tight">
                                Your next adventure <span className="text-accent-lime">awaits.</span>
                            </h1>
                            <p className="text-white/80 text-xl font-medium leading-relaxed">
                                Pick up right where you left off with your group.
                            </p>
                        </div>
                    </div>

                    <div className="relative z-10 flex items-center gap-2 bg-white/10 border border-white/20 p-2 rounded-full w-fit backdrop-blur-md">
                        <div className="px-5 py-3 rounded-full bg-white/20 text-white font-bold text-sm">12K+</div>
                        <div className="px-5 py-3 rounded-full bg-white/10 text-white/90 font-bold text-sm">Groups</div>
                        <div className="px-5 py-3 rounded-full bg-white/10 text-white/90 font-bold text-sm">Trips</div>
                        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white">
                            <span className="material-symbols-outlined text-xl outline-icon">explore</span>
                        </div>
                    </div>
                </div>

                {/* Right Side (Form) */}
                <div className="flex-1 bg-[#fbfbf9] dark:bg-background-dark p-8 md:p-16 flex flex-col items-center justify-center">
                    <div className="max-w-md w-full mx-auto flex-1 flex flex-col h-full items-center justify-center">
                        <div className="w-full flex justify-start mb-16">
                            <Link className="flex items-center gap-2 text-slate-500 hover:text-primary transition-colors font-semibold text-sm" href="/">
                                <span className="material-symbols-outlined text-lg outline-icon">arrow_back</span>
                                back home
                            </Link>
                        </div>

                        <div className="w-full mb-12">
                            <h2 className="text-6xl font-extrabold tracking-tight mb-3">log in</h2>
                            <p className="text-slate-500 font-medium">
                                Don't have an account?{" "}
                                <Link className="text-primary font-bold hover:underline" href="/register">sign up</Link>
                            </p>
                        </div>

                        <form className="w-full space-y-6 flex-1 h-full" onSubmit={handleSubmit}>
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">email</label>
                                <input
                                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
                                    placeholder="you@email.com"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled={isLoading}
                                />
                            </div>

                            <div className="space-y-2 relative">
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">password</label>
                                <div className="relative">
                                    <input
                                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
                                        placeholder="••••••••"
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        disabled={isLoading}
                                    />
                                    <button
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        <span className="material-symbols-outlined outline-icon">
                                            {showPassword ? "visibility_off" : "visibility"}
                                        </span>
                                    </button>
                                </div>
                                <div className="flex justify-end">
                                    <Link className="text-primary text-xs font-bold hover:underline" href="#">forgot password?</Link>
                                </div>
                            </div>

                            <button
                                className="w-full bg-primary text-white py-5 rounded-2xl font-bold text-lg hover:shadow-lg hover:shadow-primary/20 transition-all flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed"
                                type="submit"
                                disabled={isLoading}
                            >
                                {isLoading ? "logging in..." : "log in"}
                                {!isLoading && (
                                    <span className="material-symbols-outlined outline-icon group-hover:translate-x-1 transition-transform">
                                        arrow_forward
                                    </span>
                                )}
                            </button>

                        </form>
                    </div>
                </div>
            </div>

            {/* Floating Controls */}
            {mounted && (
                <div className="fixed bottom-6 right-6 flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full p-2 shadow-xl z-50">
                    <button
                        onClick={toggleDarkMode}
                        className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                        aria-label="Toggle Dark Mode"
                    >
                        {theme === "dark" ? (
                            <span className="material-symbols-outlined outline-icon text-accent-lime">light_mode</span>
                        ) : (
                            <span className="material-symbols-outlined outline-icon">dark_mode</span>
                        )}
                    </button>
                    <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-2"></div>
                    <div className="flex items-center gap-3 px-3">
                        <div className="flex items-center gap-1.5">
                            <span className="material-symbols-outlined outline-icon text-sm text-primary">auto_fix_high</span>
                            <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Created with AI</span>
                        </div>
                        <button className="bg-primary text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-tighter">Remix</button>
                    </div>
                </div>
            )
            }
        </div >
    );
}
