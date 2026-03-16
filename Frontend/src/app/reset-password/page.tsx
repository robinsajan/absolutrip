"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { auth } from "@/lib/api/endpoints";

function ResetPasswordContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get("token");

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!token) {
            toast.error("Invalid reset link. Redirecting...");
            router.push("/login");
        }
    }, [token, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!password || !confirmPassword) {
            toast.error("Please fill in all fields");
            return;
        }
        if (password !== confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }
        if (password.length < 6) {
            toast.error("Password must be at least 6 characters");
            return;
        }

        setIsLoading(true);
        try {
            const res = await auth.resetPassword({ token: token!, password });
            toast.success(res.message);
            router.push("/login");
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Failed to reset password");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-[#fbfbf9] dark:bg-background-dark text-slate-900 dark:text-slate-100 min-h-screen p-8 md:p-16 flex flex-col items-center justify-center">
            <div className="max-w-md w-full mx-auto flex-1 flex flex-col items-center justify-center">
                <div className="w-full flex justify-start mb-16">
                    <Link className="flex items-center gap-2 text-slate-500 hover:text-primary transition-colors font-semibold text-sm" href="/login">
                        <span className="material-symbols-outlined text-lg outline-icon">arrow_back</span>
                        back to login
                    </Link>
                </div>

                <div className="w-full mb-12">
                    <h2 className="text-5xl font-extrabold tracking-tight mb-4">choose new password</h2>
                    <p className="text-slate-500 font-medium">
                        Enter a secure new password for your account.
                    </p>
                </div>

                <form className="w-full space-y-6" onSubmit={handleSubmit}>
                    <div className="space-y-2 relative">
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 font-inter">new password</label>
                        <div className="relative">
                            <input
                                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none font-inter"
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
                    </div>

                    <div className="space-y-2">
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 font-inter">confirm password</label>
                        <input
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none font-inter"
                            placeholder="••••••••"
                            type={showPassword ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            disabled={isLoading}
                        />
                    </div>

                    <button
                        className="w-full bg-primary text-white py-5 rounded-2xl font-bold text-lg hover:shadow-lg hover:shadow-primary/20 transition-all flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed font-inter"
                        type="submit"
                        disabled={isLoading}
                    >
                        {isLoading ? "Updating password..." : "Update Password"}
                        {!isLoading && (
                            <span className="material-symbols-outlined outline-icon group-hover:translate-x-1 transition-transform">
                                done_all
                            </span>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-white"></div>}>
            <ResetPasswordContent />
        </Suspense>
    );
}
