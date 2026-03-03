"use client";

import Link from "next/link";
import {
  Map,
  Sparkles,
  Play,
  Calendar,
  Receipt,
  MessageCircle,
  Globe,
  Mail,
  Menu,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: Calendar,
    title: "Group Itinerary",
    description:
      "Collaborative planning tools that keep everyone synced. Add stays, activities, and dates in real-time.",
  },
  {
    icon: Receipt,
    title: "Split Expenses",
    description:
      "Automated expense tracking and fair settling. No more spreadsheets or awkward money conversations.",
  },
  {
    icon: MessageCircle,
    title: "Stay & Budget",
    description:
      "Vote on options, finalize stays, and see day-wise budgets so the whole group is on the same page.",
  },
];

const footerProduct = [
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#" },
  { label: "Explore", href: "#" },
  { label: "Split Bills", href: "#" },
];

const footerCompany = [
  { label: "About Us", href: "#" },
  { label: "Careers", href: "#" },
  { label: "Blog", href: "#" },
  { label: "Press", href: "#" },
];

const footerLegal = [
  { label: "Privacy Policy", href: "#" },
  { label: "Terms of Service", href: "#" },
  { label: "Cookie Policy", href: "#" },
];

export function LandingPage() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-background">
      <header className="sticky top-0 z-50 w-full bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-12 lg:py-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-secondary-foreground shadow-sm">
              <Map className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold tracking-tight text-foreground lg:text-2xl">
              AbsoluTrip
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden items-center gap-2 sm:flex">
            <Link
              href="/login"
              className="rounded-full px-6 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="rounded-full bg-secondary px-6 py-3 text-sm font-bold text-secondary-foreground transition-all hover:shadow-lg active:scale-95"
            >
              Sign Up
            </Link>
          </div>

          {/* Mobile Navigation */}
          <div className="flex sm:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-xl">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="flex flex-col gap-8 pt-12">
                <SheetHeader className="text-left">
                  <SheetTitle className="text-2xl font-bold">AbsoluTrip</SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col gap-6">
                  <Link href="#features" className="text-lg font-medium hover:text-primary">Features</Link>
                  <Link href="/login" className="text-lg font-medium hover:text-primary">Login</Link>
                  <Link href="/register" className="text-lg font-medium hover:text-primary">Sign Up</Link>
                </nav>
                <Link
                  href="/register"
                  className="mt-auto rounded-xl bg-secondary py-4 text-center text-lg font-bold text-secondary-foreground"
                >
                  Start Planning Now
                </Link>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main className="flex-grow">
        <section className="relative overflow-hidden px-6 pt-12 pb-16 lg:px-12 lg:pt-24 lg:pb-32">
          <div className="mx-auto max-w-7xl">
            <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
              <div className="flex flex-col gap-8">
                <div className="inline-flex w-fit items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-primary">
                  <Sparkles className="h-4 w-4" />
                  Group Travel Reimagined
                </div>
                <h1 className="text-3xl font-extrabold leading-[1.1] tracking-tight text-foreground sm:text-5xl lg:text-6xl xl:text-7xl">
                  Plan your next group adventure{" "}
                  <span className="text-primary">without the stress.</span>
                </h1>
                <p className="max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg xl:text-xl">
                  AbsoluTrip helps you coordinate itineraries, vote on stays, and settle expenses
                  seamlessly in one place—built for modern explorers.
                </p>
                <div className="flex flex-col gap-4 sm:flex-row">
                  <Link
                    href="/register"
                    className="flex h-14 items-center justify-center rounded-xl bg-secondary px-8 text-lg font-bold text-secondary-foreground shadow-xl transition-all hover:scale-[1.02] hover:opacity-90"
                  >
                    Start Planning Now
                  </Link>
                  <a
                    href="#features"
                    className="flex h-14 items-center justify-center gap-2 rounded-xl border border-border bg-card px-8 text-lg font-semibold text-foreground transition-all hover:bg-accent"
                  >
                    <Play className="h-5 w-5" />
                    See How it Works
                  </a>
                </div>
                <div className="flex items-center gap-4 pt-4">
                  <div className="flex -space-x-3">
                    {['A', 'M', 'K'].map((letter) => (
                      <div
                        key={letter}
                        className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-background bg-muted text-sm font-bold text-muted-foreground"
                      >
                        {letter}
                      </div>
                    ))}
                  </div>
                  <p className="text-sm font-medium text-slate-500">
                    Trusted by groups worldwide
                  </p>
                </div>
              </div>
              <div className="relative">
                <div className="relative z-10 aspect-square overflow-hidden rounded-3xl bg-slate-100 shadow-2xl lg:aspect-[4/5]">
                  <img
                    src="/static/image.png"
                    alt="Group travel planning"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="absolute -bottom-6 -left-6 z-20 hidden rounded-2xl bg-card p-6 shadow-xl md:block">
                  <div className="flex items-center gap-4">
                    <div className="rounded-full bg-green-100 p-2 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                      <Receipt className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase text-muted-foreground">
                        Total Settled
                      </p>
                      <p className="text-xl font-bold text-foreground">
                        $12,450.00
                      </p>
                    </div>
                  </div>
                </div>
                <div className="absolute -top-10 -right-10 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
              </div>
            </div>
          </div>
        </section>

        <section
          id="features"
          className="bg-muted/50 py-20 lg:py-24"
        >
          <div className="mx-auto max-w-7xl px-6 lg:px-12">
            <div className="mb-14 text-center lg:mb-16">
              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Everything you need for the perfect trip
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
                Designed for groups who value organization, transparency, and
                fairness.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
              {features.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={feature.title}
                    className="group relative flex flex-col items-center rounded-2xl border border-border bg-card p-8 text-center transition-all hover:shadow-xl lg:p-10"
                  >
                    <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/5 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                      <Icon className="h-8 w-8 lg:h-10 lg:w-10" />
                    </div>
                    <h3 className="mb-3 text-xl font-bold text-foreground">
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="px-6 py-20 lg:px-12 lg:py-24">
          <div className="mx-auto max-w-7xl overflow-hidden rounded-3xl bg-secondary px-8 py-16 text-center sm:px-16 lg:py-24">
            <h2 className="mx-auto max-w-3xl text-3xl font-bold tracking-tight text-secondary-foreground sm:text-4xl lg:text-5xl">
              Ready to see the world together?
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg text-secondary-foreground/80">
              Join travelers who plan group trips and split costs without the
              spreadsheets.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <Link
                href="/register"
                className="rounded-xl bg-card px-10 py-4 text-lg font-bold text-foreground transition-all hover:bg-accent"
              >
                Get Started Now
              </Link>
              <a
                href="#features"
                className="rounded-xl border border-white/20 bg-white/10 px-10 py-4 text-lg font-bold text-white backdrop-blur-sm transition-all hover:bg-white/20"
              >
                See Features
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-card py-14 lg:py-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-12">
          <div className="grid grid-cols-2 gap-10 md:grid-cols-4 lg:grid-cols-5">
            <div className="col-span-2 lg:col-span-2">
              <Link href="/" className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Map className="h-5 w-5" />
                </div>
                <span className="text-xl font-bold tracking-tight text-foreground">
                  AbsoluTrip
                </span>
              </Link>
              <p className="mt-4 max-w-xs text-sm text-muted-foreground">
                The platform for group travel coordination and automated
                expense management.
              </p>
              <div className="mt-6 flex gap-4">
                <a
                  href="#"
                  className="text-muted-foreground transition-colors hover:text-primary"
                  aria-label="Website"
                >
                  <Globe className="h-5 w-5" />
                </a>
                <a
                  href="#"
                  className="text-muted-foreground transition-colors hover:text-primary"
                  aria-label="Email"
                >
                  <Mail className="h-5 w-5" />
                </a>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-bold uppercase tracking-wider text-foreground">
                Product
              </h4>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                {footerProduct.map((item) => (
                  <li key={item.label}>
                    <a href={item.href} className="hover:text-primary">
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-bold uppercase tracking-wider text-foreground">
                Company
              </h4>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                {footerCompany.map((item) => (
                  <li key={item.label}>
                    <a href={item.href} className="hover:text-primary">
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-bold uppercase tracking-wider text-foreground">
                Legal
              </h4>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                {footerLegal.map((item) => (
                  <li key={item.label}>
                    <a href={item.href} className="hover:text-primary">
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-14 border-t border-border pt-8 text-center text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} AbsoluTrip. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
