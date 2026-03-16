"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { auth } from "@/lib/api/endpoints";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isSent, setIsSent] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) {
            toast.error("Please enter your email address");
            return;
        }

        setIsLoading(true);
        try {
            const res = await auth.forgotPassword(email);
            toast.success(res.message);
            setIsSent(true);
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Failed to send reset link");
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
                    <h2 className="text-5xl font-extrabold tracking-tight mb-4">reset password</h2>
                    <p className="text-slate-500 font-medium">
                        Enter your email and we&apos;ll send you a link to choose a new password.
                    </p>
                </div>

                {!isSent ? (
                    <form className="w-full space-y-6" onSubmit={handleSubmit}>
                        <div className="space-y-2">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 font-inter">email address</label>
                            <input
                                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none font-inter"
                                placeholder="you@email.com"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={isLoading}
                            />
                        </div>
                        <button
                            className="w-full bg-primary text-white py-5 rounded-2xl font-bold text-lg hover:shadow-lg hover:shadow-primary/20 transition-all flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed font-inter"
                            type="submit"
                            disabled={isLoading}
                        >
                            {isLoading ? "Sending link..." : "Send Reset Link"}
                            {!isLoading && (
                                <span className="material-symbols-outlined outline-icon group-hover:translate-x-1 transition-transform">
                                    send
                                </span>
                            )}
                        </button>
                    </form>
                ) : (
                    <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-8 text-center space-y-6">
                        <div className="w-16 h-16 bg-accent-lime/20 rounded-full flex items-center justify-center text-accent-lime mx-auto">
                            <span className="material-symbols-outlined text-3xl material-symbols-filled">mark_email_read</span>
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-2xl font-bold">Check your inbox</h3>
                            <p className="text-slate-500 text-sm font-medium">
                                We&apos;ve sent a reset link to <span className="text-primary font-bold">{email}</span>.
                                Please check your email and follow the instructions.
                            </p>
                        </div>
                        <button
                            onClick={() => setIsSent(false)}
                            className="text-primary font-bold text-sm hover:underline"
                        >
                            Didn&apos;t get the email? Try again
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
