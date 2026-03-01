"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Map } from "lucide-react";
import { useAuth } from "@/lib/hooks";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading } = useAuth();
  const isLogin = pathname === "/login";
  const isRegister = pathname === "/register";

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/trips");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-background font-sans text-foreground antialiased">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 w-full bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-8 py-6 lg:px-12">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
              <Map className="h-6 w-6" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-foreground">
              AbsoluTrip
            </span>
          </Link>
          {!(isLogin || isRegister) && (
            <div className="flex items-center gap-10">
              <nav className="hidden md:flex items-center gap-8">
                <Link
                  href="#"
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  Demo
                </Link>
                <Link
                  href="/login"
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  Login
                </Link>
              </nav>
              <div className="flex items-center">
                <Link
                  href="/register"
                  className="rounded-full bg-secondary px-8 py-3 text-sm font-bold text-secondary-foreground transition-all hover:bg-secondary/90 hover:shadow-lg active:scale-95"
                >
                  Sign Up
                </Link>
              </div>
            </div>
          )}
          {isLogin && (
            <div className="flex items-center">
              <Link
                href="/register"
                className="rounded-full bg-secondary px-8 py-3 text-sm font-bold text-secondary-foreground transition-all hover:bg-secondary/90 hover:shadow-lg active:scale-95"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex items-center justify-center py-12 px-6 lg:px-12">
        <div className="mx-auto w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left - Image with overlay text */}
          <div className="hidden lg:block relative group">
            <div className="relative z-10 aspect-[4/5] overflow-hidden rounded-[2rem] shadow-2xl">
              <Image
                src="/static/image.png"
                alt="Scenic travel destination"
                fill
                className="object-cover"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-secondary/60 via-transparent to-transparent"></div>
              <div className="absolute bottom-10 left-10 right-10 text-white">
                <p className="text-sm font-medium uppercase tracking-[0.2em] opacity-80 mb-2">
                  Next Destination
                </p>
                <h2 className="text-3xl font-bold" style={{ fontFamily: "var(--font-serif)" }}>
                  Your group memories start here.
                </h2>
              </div>
            </div>
            <div className="absolute -top-10 -left-10 h-64 w-64 rounded-full bg-primary/10 blur-3xl -z-10"></div>
            <div className="absolute -bottom-10 -right-10 h-64 w-64 rounded-full bg-secondary/5 blur-3xl -z-10"></div>
          </div>

          {/* Right - Form */}
          <div className="w-full max-w-md mx-auto lg:mx-0">
            {children}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-12">
        <div className="mx-auto max-w-7xl px-8 lg:px-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded bg-primary text-white">
                <Map className="h-5 w-5" />
              </div>
              <span className="text-xl font-bold tracking-tight text-foreground">
                AbsoluTrip
              </span>
            </Link>
            <p className="text-sm text-muted-foreground">
              © 2024 AbsoluTrip. All rights reserved. Designed for elegance.
            </p>
            <div className="flex gap-6">
              <Link
                href="#"
                className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium"
              >
                Privacy
              </Link>
              <Link
                href="#"
                className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium"
              >
                Terms
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
