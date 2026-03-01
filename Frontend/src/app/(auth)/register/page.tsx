"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/hooks";

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password || !confirmPassword) {
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
      await register(email, password, name);
      toast.success("Account created successfully!");
      router.push("/trips");
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || "Failed to create account");
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
          Create your account
        </h1>
        <p className="text-muted-foreground">
          Join AbsoluTrip to start planning your next group adventure.
        </p>
      </div>

      <form className="space-y-6" onSubmit={handleSubmit}>
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-semibold text-foreground mb-2"
          >
            Full Name
          </label>
          <Input
            id="name"
            type="text"
            placeholder="John Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            disabled={isLoading}
            className="w-full rounded-xl border-border bg-card px-4 py-3 text-foreground focus:border-primary focus:ring-primary"
          />
        </div>

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
            placeholder="john@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            disabled={isLoading}
            className="w-full rounded-xl border-border bg-card px-4 py-3 text-foreground focus:border-primary focus:ring-primary"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-sm font-semibold text-foreground mb-2"
          >
            Password
          </label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            disabled={isLoading}
            className="w-full rounded-xl border-border bg-card px-4 py-3 text-foreground focus:border-primary focus:ring-primary"
          />
        </div>

        <div>
          <label
            htmlFor="confirmPassword"
            className="block text-sm font-semibold text-foreground mb-2"
          >
            Confirm Password
          </label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            disabled={isLoading}
            className="w-full rounded-xl border-border bg-card px-4 py-3 text-foreground focus:border-primary focus:ring-primary"
          />
        </div>

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-xl bg-secondary py-4 text-center text-lg font-bold text-secondary-foreground shadow-xl shadow-secondary/20 transition-all hover:scale-[1.01] hover:bg-secondary/90 active:scale-[0.98]"
        >
          {isLoading ? "Creating account..." : "Create Account"}
        </Button>
      </form>

      <div className="mt-8 text-center">
        <p className="text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-bold text-foreground hover:text-primary"
          >
            Sign in
          </Link>
        </p>
      </div>
    </>
  );
}
