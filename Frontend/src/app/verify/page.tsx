"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/api/endpoints";

function VerifyContent() {
    const searchParams = useSearchParams();
    const token = searchParams.get("token");
    const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
    const [message, setMessage] = useState("");

    useEffect(() => {
        if (!token) {
            setStatus("error");
            setMessage("No verification token found.");
            return;
        }

        auth.verify(token)
            .then((res) => {
                setStatus("success");
                setMessage(res.message);
            })
            .catch((err) => {
                setStatus("error");
                setMessage(err.response?.data?.error || "Verification failed. The link may have expired.");
            });
    }, [token]);

    return (
        <div className="flex-1 bg-[#fbfbf9] dark:bg-background-dark p-8 md:p-16 flex flex-col items-center justify-center min-h-screen">
            <div className="max-w-md w-full mx-auto flex-1 flex flex-col items-center justify-center text-center">
                <Link href="/" className="flex items-center gap-2 mb-12">
                    <div className="bg-primary p-2 rounded-xl text-white flex items-center justify-center">
                        <span className="material-symbols-outlined outline-icon">flight_takeoff</span>
                    </div>
                    <span className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">absoluTrip</span>
                </Link>

                {status === "loading" && (
                    <div className="space-y-6">
                        <div className="w-16 h-16 border-4 border-slate-200 border-t-primary rounded-full animate-spin mx-auto"></div>
                        <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Verifying your email...</h2>
                        <p className="text-slate-500 font-medium font-inter">Please hold on a moment.</p>
                    </div>
                )}

                {status === "success" && (
                    <div className="space-y-6">
                        <div className="w-16 h-16 bg-accent-lime rounded-full flex items-center justify-center text-black mx-auto">
                            <span className="material-symbols-outlined text-3xl material-symbols-filled">check_circle</span>
                        </div>
                        <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Email Verified!</h2>
                        <p className="text-slate-500 font-medium font-inter">{message}</p>
                        <div className="mt-8">
                            <Link href="/login" className="inline-block bg-primary text-white py-4 px-8 rounded-2xl font-bold text-lg hover:shadow-lg hover:shadow-primary/20 transition-all flex items-center justify-center gap-2 group w-full">
                                Go to Login
                                <span className="material-symbols-outlined outline-icon group-hover:translate-x-1 transition-transform">
                                    arrow_forward
                                </span>
                            </Link>
                        </div>
                    </div>
                )}

                {status === "error" && (
                    <div className="space-y-6">
                        <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto">
                            <span className="material-symbols-outlined text-3xl material-symbols-filled">error</span>
                        </div>
                        <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Verification Failed</h2>
                        <p className="text-slate-500 font-medium font-inter">{message}</p>
                        <div className="mt-8">
                            <Link href="/login" className="inline-block bg-primary text-white py-4 px-8 rounded-2xl font-bold text-lg hover:shadow-lg hover:shadow-primary/20 transition-all">
                                Back to Login
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function VerifyPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-white"></div>}>
            <VerifyContent />
        </Suspense>
    );
}
