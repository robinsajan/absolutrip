"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { useAuth } from "@/lib/hooks";
import { useTheme } from "next-themes";
import { useEffect } from "react";

export default function RegisterPage() {
  const router = useRouter();
  const { register, isAuthenticated, isLoading: authLoading } = useAuth();
  const { theme, setTheme } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  const [name, setName] = useState("");
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
    if (!name || !email || !password) {
      toast.error("Please fill in all fields");
      return;
    }
    if (password.length < 6) {
      toast.error("Password is too small. Please use at least 6 characters.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await register(email, password, name);
      toast.success(res.message || "Account created! Please verify your email.");
      router.push("/login");
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to create account");
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
        <div className="hidden md:flex md:w-1/2 bg-background-dark p-16 flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 rounded-full blur-[120px] -mr-48 -mt-48"></div>
          <div className="relative z-10">
            <Link href="/" className="flex items-center gap-2 mb-20">
              <div className="bg-primary p-2 rounded-xl text-white flex items-center justify-center">
                <span className="material-symbols-outlined outline-icon">flight_takeoff</span>
              </div>
              <span className="text-2xl font-extrabold tracking-tight text-white">absoluTrip</span>
            </Link>
            <div className="max-w-md">
              <div className="inline-flex items-center gap-2 bg-accent-lime text-black px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider mb-8">
                join the community
                <span className="material-symbols-outlined text-sm">flare</span>
              </div>
              <h1 className="text-6xl font-extrabold text-white leading-[1.1] mb-12">
                Plan trips that <span className="text-accent-lime italic">everyone</span> will love.
              </h1>
              <ul className="space-y-6">
                {[
                  "Save unlimited trips",
                  "Invite your whole group",
                  "AI-powered suggestions",
                  "Settle expenses instantly",
                ].map((text, i) => (
                  <li key={i} className="flex items-center gap-4 text-white/90 font-medium">
                    <span className="w-6 h-6 bg-accent-lime rounded-full flex items-center justify-center text-black">
                      <span className="material-symbols-outlined text-base material-symbols-filled">check</span>
                    </span>
                    {text}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          {/* <div className="relative z-10 bg-white/5 border border-white/10 p-6 rounded-3xl backdrop-blur-sm">
            <div className="flex items-center gap-2 text-white/60 text-sm font-semibold mb-1">
              <span className="material-symbols-outlined text-accent-lime text-lg material-symbols-filled">star</span>
              Trusted by
            </div>
            <p className="text-white text-xl font-bold">travel groups worldwide</p>
          </div> */}
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
              <h2 className="text-5xl font-extrabold tracking-tight mb-2">create account</h2>
              <p className="text-slate-500 font-medium">
                Already have an account?{" "}
                <Link className="text-primary hover:underline" href="/login">log in</Link>
              </p>
            </div>
            <form className="w-full space-y-6 flex-1 h-full" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">full name</label>
                <input
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
                  placeholder="Alex Wanderer"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isLoading}
                />
              </div>
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
              </div>
              <button
                className="w-full bg-primary text-white py-5 rounded-2xl font-bold text-lg hover:shadow-lg hover:shadow-primary/20 transition-all flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed"
                type="submit"
                disabled={isLoading}
              >
                {isLoading ? "creating account..." : "create account"}
                {!isLoading && (
                  <span className="material-symbols-outlined outline-icon group-hover:translate-x-1 transition-transform">
                    arrow_forward
                  </span>
                )}
              </button>
            </form>
            <div className="mt-12 text-center">
              <p className="text-[11px] text-slate-400 font-medium">
                By signing up you agree to our{" "}
                <Link className="underline hover:text-primary" href="#">Terms</Link> &{" "}
                <Link className="underline hover:text-primary" href="#">Privacy Policy</Link>.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Controls */}
      {mounted && (
        <div className="fixed bottom-6 right-6 flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full p-2 shadow-xl z-50">
          <div className="flex items-center gap-3 px-3">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-tight">Created with</span>
              <span className="material-symbols-outlined text-sm text-primary">favorite</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
