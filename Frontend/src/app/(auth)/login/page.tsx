"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/lib/hooks";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

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
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || "Invalid credentials");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="mb-10 text-center lg:text-left">
        <h1
          className="text-4xl font-extrabold tracking-tight text-foreground mb-3"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          Welcome Back
        </h1>
        <p className="text-muted-foreground">
          Continue planning your group adventures with ease.
        </p>
      </div>

      <form className="space-y-6" onSubmit={handleSubmit}>
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-semibold text-foreground mb-2"
          >
            Email Address
          </label>
          <Input
            id="email"
            type="email"
            placeholder="alex@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            disabled={isLoading}
            className="w-full rounded-xl border-border bg-card px-4 py-3 text-foreground focus:border-primary focus:ring-primary"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label
              htmlFor="password"
              className="block text-sm font-semibold text-foreground"
            >
              Password
            </label>
            <Link
              href="#"
              className="text-xs font-bold text-primary hover:underline"
            >
              Forgot Password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            disabled={isLoading}
            className="w-full rounded-xl border-border bg-card px-4 py-3 text-foreground focus:border-primary focus:ring-primary"
          />
        </div>

        <div className="flex items-center">
          <Checkbox
            id="remember"
            checked={rememberMe}
            onCheckedChange={(v) => setRememberMe(v === true)}
            className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
          />
          <label
            htmlFor="remember"
            className="ml-2 block text-sm text-muted-foreground"
          >
            Remember Me
          </label>
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-xl bg-secondary py-4 text-center text-lg font-bold text-secondary-foreground shadow-xl shadow-secondary/20 transition-all hover:scale-[1.01] hover:bg-secondary/90 active:scale-[0.98]"
        >
          {isLoading ? "Signing in..." : "Login"}
        </Button>
      </form>

      <div className="mt-8 text-center">
        <p className="text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="font-bold text-foreground hover:text-primary"
          >
            Sign Up
          </Link>
        </p>
      </div>
    </>
  );
}
