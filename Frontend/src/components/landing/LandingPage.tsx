"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import {
  Menu,
  X,
  ChevronRight,
  ArrowUpRight,
  Sparkles,
  MapPin,
  Calendar,
  Users,
  Wallet,
  Globe,
  Share2,
  Mail,
  Send,
  Moon,
  Sun,
  ArrowRight,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

export function LandingPage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleDarkMode = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <div className="bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 transition-colors duration-300 min-h-screen">
      {/* Navigation */}
      <nav className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between relative z-50">
        <div className="flex items-center gap-2">
          <div className="bg-primary p-2 rounded-xl text-white flex items-center justify-center">
            <span className="material-symbols-outlined">flight_takeoff</span>
          </div>
          <span className="text-2xl font-extrabold tracking-tight">absolutrip</span>
        </div>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600 dark:text-slate-400">
          <Link className="hover:text-primary transition-colors" href="/">home</Link>
          <Link className="hover:text-primary transition-colors" href="#features">features</Link>
          <Link className="hover:text-primary transition-colors" href="#how-it-works">how it works</Link>
          <Link className="hover:text-primary transition-colors" href="#testimonials">testimonials</Link>
        </div>

        <div className="flex items-center gap-4">
          <Link className="hidden sm:block text-sm font-semibold hover:text-primary transition-colors" href="/login">
            log in
          </Link>
          <Link href="/register">
            <button className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-6 py-3 rounded-full font-bold text-sm flex items-center gap-2 hover:scale-105 transition-transform">
              get started
              <span className="material-symbols-outlined text-sm">north_east</span>
            </button>
          </Link>

          {/* Mobile Menu Trigger */}
          <div className="md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <button className="p-2 text-slate-900 dark:text-slate-100">
                  <Menu className="h-6 w-6" />
                </button>
              </SheetTrigger>
              <SheetContent side="right" className="bg-background-light dark:bg-background-dark border-slate-200 dark:border-slate-800">
                <SheetHeader className="text-left mb-8">
                  <SheetTitle className="text-2xl font-bold">absolutrip</SheetTitle>
                </SheetHeader>
                <div className="flex flex-col gap-6">
                  <Link href="/" className="text-xl font-bold hover:text-primary">home</Link>
                  <Link href="#features" className="text-xl font-bold hover:text-primary">features</Link>
                  <Link href="#how-it-works" className="text-xl font-bold hover:text-primary">how it works</Link>
                  <Link href="#testimonials" className="text-xl font-bold hover:text-primary">testimonials</Link>
                  <div className="h-px bg-slate-200 dark:bg-slate-800 my-4" />
                  <Link href="/login" className="text-xl font-bold hover:text-primary">log in</Link>
                  <Link href="/register">
                    <button className="w-full bg-primary text-white py-4 rounded-2xl font-bold text-lg">
                      get started
                    </button>
                  </Link>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 pt-12 pb-24">
        {/* Hero Section */}
        <div className="flex items-center gap-3 mb-8 md:mb-12">
          <span className="material-symbols-outlined text-primary text-3xl">flare</span>
          <span className="bg-accent-lime text-slate-900 px-4 py-1.5 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-wider whitespace-nowrap">
            travel smarter, together
          </span>
        </div>

        <div className="relative max-w-5xl">
          <h1 className="hero-title text-5xl md:text-9xl font-extrabold mb-8 md:mb-12">
            Level up your next trip{" "}
            <span className="inline-flex items-center justify-center bg-primary text-white w-[80px] h-[50px] md:w-[180px] md:h-[100px] rounded-2xl md:rounded-3xl mx-1 md:mx-2 align-middle transition-transform hover:rotate-12 cursor-default">
              <span className="material-symbols-outlined text-2xl md:text-6xl">arrow_forward</span>
            </span>
            with <span className="text-primary block md:inline">absolutrip</span>
          </h1>
        </div>

        <div className="flex flex-col md:flex-row items-start md:items-center gap-8 mt-8">
          <div className="space-y-1">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">With more than</p>
            <div className="flex flex-col">
              <span className="text-base md:text-lg font-extrabold uppercase line-height-tight">12K+ trips planned</span>
              <span className="text-base md:text-lg font-extrabold uppercase line-height-tight">500+ happy groups</span>
            </div>
          </div>
          <Link href="/register">
            <button className="border-2 border-slate-900 dark:border-slate-100 px-8 py-5 rounded-full font-bold text-lg flex items-center gap-3 hover:bg-slate-900 hover:text-white dark:hover:bg-white dark:hover:text-slate-900 transition-all group w-full md:w-auto justify-center">
              Plan now
              <span className="material-symbols-outlined group-hover:rotate-45 transition-transform">north_east</span>
            </button>
          </Link>
        </div>

        {/* Featured Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mt-20 md:mt-24">
          <div className="md:col-span-6 relative group overflow-hidden rounded-3xl h-[300px] md:h-[400px]">
            <img
              alt="Adventurer on a snowy mountain peak"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCggmPHPX6oJVf30mADS6lo4aTSa9qHqwyWoVd6l7glHpyNv7Gfd0ZFvLtt_qZl-XcDOMtFOTia50encugz0AlDDh3_dptsDZRPEN9CSw0EBSVIchWKMiIPU-bbNOkyiXFk4PcT9EAxD3rEFkvjN6zr6jTIy3pTr-fl-FnKHTn8pWaMfRqgq57jdrDSnIyEZKJ7N585oOUWLndigy3UuqmxmglgFBaqYMZzPO1qaxsD5jGdMtVStbz2xZcwkw2vbTb-gDFrgbMbhgYk"
            />
            <div className="absolute top-6 right-6">
              <span className="bg-accent-lime text-slate-900 px-4 py-1.5 rounded-full text-xs font-bold shadow-lg">#1 voted</span>
            </div>
            <div className="absolute bottom-6 left-6 text-white drop-shadow-md">
              <h3 className="text-2xl font-bold">Mount Everest Base</h3>
              <p className="text-sm opacity-90">Adventure of a lifetime</p>
            </div>
          </div>
          <div className="md:col-span-3 relative group overflow-hidden rounded-3xl h-[300px] md:h-[400px]">
            <img
              alt="Beautiful tropical beach with palm trees in Bali"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCP2__vlM6QavIW9CYSsjDoJP9PANXAU_h4TV5xwNOcQVrmL-NuFeMOzajEA6L6qXnXfTa5ui5yobgdvUq2Ex51q2D01Xx5SIx8fAwCDCPHuH7-krbm6LR-BUtsZt9N6jA2Pt1hKmKyGNUjsCGH6NsnGdI1hTMOdOC43zehcbVjYm5rP4dYtOrGVwNYF_awIAY0ercPHqAveSLTU5Cq8vdWeUVMtwbT8DIQ2qbJZ-gq6MmH77Ha5rEB3IyDJIFK6Po-WvenJ7aB0W-I"
            />
            <div className="absolute bottom-6 left-6 text-white drop-shadow-md">
              <h3 className="text-xl font-bold">Bali Beach</h3>
              <p className="text-xs opacity-90">Paradise found</p>
            </div>
          </div>
          <div className="md:col-span-3 bg-primary rounded-3xl p-8 flex flex-col justify-between h-[300px] md:h-[400px] text-white">
            <div>
              <span className="material-symbols-outlined text-accent-lime text-5xl">auto_awesome</span>
            </div>
            <div>
              <p className="text-xs font-semibold opacity-70 mb-2 uppercase tracking-widest">AI-powered</p>
              <h3 className="text-2xl font-bold leading-tight">Smart trip suggestions</h3>
              <p className="text-sm opacity-80 mt-2">Tailored to your vibe</p>
            </div>
          </div>
        </div>
      </main>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-6 py-24 border-t border-slate-200 dark:border-slate-800" id="features">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-8">
          <div className="max-w-2xl">
            <span className="text-primary font-bold uppercase tracking-widest text-xs">Features</span>
            <h2 className="text-4xl md:text-6xl font-extrabold mt-4 hero-title">Everything you need for the perfect trip.</h2>
          </div>
          <div className="hidden md:block pb-2">
            <span className="material-symbols-outlined text-5xl text-slate-200 dark:text-slate-800">explore</span>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              icon: "route",
              title: "Smart Itineraries",
              desc: "Let our AI build the perfect day-by-day schedule based on your interests and travel pace.",
            },
            {
              icon: "account_balance_wallet",
              title: "Group Budgeting",
              desc: "Split costs effortlessly. Track expenses in real-time and settle up with one click at the end.",
            },
            {
              icon: "groups",
              title: "Real-time Collaboration",
              desc: "Invite friends to edit plans live. Chat, vote on locations, and share documents in one place.",
            },
          ].map((feature, i) => (
            <div
              key={i}
              className="p-10 bg-white dark:bg-slate-900 rounded-4xl hover:shadow-2xl hover:-translate-y-2 transition-all border border-slate-100 dark:border-slate-800 group"
            >
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-8 group-hover:bg-primary group-hover:text-white transition-all duration-300">
                <span className="material-symbols-outlined text-3xl">{feature.icon}</span>
              </div>
              <h3 className="text-2xl font-bold mb-4">{feature.title}</h3>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-slate-900 text-white py-24 overflow-hidden" id="how-it-works">
        <div className="max-w-7xl mx-auto px-6 relative">
          <div className="text-center mb-20">
            <h2 className="text-5xl md:text-7xl font-extrabold hero-title mb-6">How it works</h2>
            <p className="text-slate-400 text-lg max-w-xl mx-auto">Three simple steps from your couch to your dream destination.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-16 relative">
            <div className="hidden md:block absolute top-10 left-[20%] right-[20%] h-px border-t border-dashed border-slate-700 z-0"></div>
            {[
              { num: "1", title: "Pick your vibe", desc: "Tell us where you want to go or what you love doing. We'll handle the inspiration." },
              { num: "2", title: "Invite the crew", desc: "Share your draft itinerary with your travel buddies and start building it together." },
              { num: "3", title: "Go explore", desc: "Access your plans offline, track spending, and make memories that last forever." },
            ].map((step, i) => (
              <div key={i} className="relative z-10 flex flex-col items-center text-center group">
                <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center text-3xl font-black mb-8 border-8 border-slate-800 group-hover:scale-110 transition-transform">
                  {step.num}
                </div>
                <h3 className="text-2xl font-bold mb-4">{step.title}</h3>
                <p className="text-slate-400">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="max-w-7xl mx-auto px-6 py-24" id="testimonials">
        <div className="mb-16">
          <h2 className="text-4xl md:text-5xl font-extrabold hero-title">Loved by 12,000+ travelers</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <TestimonialCard
            text="Absolutrip made our group trip to Japan actually happen. The budget tool saved us from so many awkward conversations!"
            author="Sarah Jenkins"
            role="Digital Nomad"
            img="https://lh3.googleusercontent.com/aida-public/AB6AXuDC4CdGar84kPbT-0QTlonLYHPYGfNZl5ExiRrTzDqDIu8LfxK8kXHiUHlSDN7cDmUE6UhqUJdYyu-dFCHnCQaJUbH4WIGO0KZw_pUXio15QeOcr1KpzoyQd4s3wX6IdeWwwlDQQLaUDC6mjMENvyXhLi_rik992lk8rZ5YcQJEKw9cjmCI63DYsAh5G88HGArCFsk4ScmTLZpMb5Zyo_xv9T8rb_DQlSpAccN55sxLJBODcEPMUliamongspcLQUO1TC9em-VaXh-D"
          />
          <TestimonialCard
            highlight
            text="The AI suggestions were surprisingly spot on. It found these tiny hidden cafes in Rome we never would have found ourselves."
            author="Marc Kubert"
            role="Leisure Traveler"
            img="https://lh3.googleusercontent.com/aida-public/AB6AXuC_3mW65w_rdo25vuT3xWdin2eQ8iSwumoTlZ84BVqsGPcFW7utjeKxIjKeOqiwLHtRstrlAALqdsMQFLWylXbKG86SB2LlvPHfboO0Fi-_Gfz1oCvgr3natzTXbT5CDGi3CNzOSGACjxi_3s0JSdtLISiBfpphJov1axDEPswtUSwuErfct1W9P6zV-a228Sy_k9ZBYaXWgNkUbFoeP6U7ZV73dKsXIKe-GOst63w_IjZwKB4QMbG-yupnRLWh-L66-H2SonE3Cotm"
          />
          <TestimonialCard
            text="Finally, a travel app that doesn't feel like a spreadsheet. Beautiful UI and incredibly intuitive to use."
            author="Elena Rodriguez"
            role="Backpacker"
            img="https://lh3.googleusercontent.com/aida-public/AB6AXuBQbKzM04jk6cksv9PCpNaEBHBYWC_s4FuWbrhfWtLOTYG-fkzbu5lss8RH2_moFqdk2blDHlQLfS14W8tNSxHyXoTxyj0h7p4WBCJP5935iCwbiVYsmegoUm4Y1KB2FCTTyIk-y6-icStsyfye-jijXu4Y9wRR1skcECLAtqNJhry7KenNxxDkEpKAFPW0iaquwBEgn1u5iBkOU2NL9JxOnSQcCSGPJgS718banBihoCgM7oj8P-LrJc4vNUvLbM4V2CfTyn_QLSM5"
          />
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-6 py-12">
        <div className="bg-primary rounded-4xl p-12 md:p-24 text-center text-white relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
            <div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent-lime rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
          </div>
          <div className="relative z-10">
            <h2 className="text-5xl md:text-8xl font-extrabold hero-title mb-8">Ready to travel?</h2>
            <p className="text-xl md:text-2xl opacity-80 mb-12 max-w-2xl mx-auto">Join thousands of travelers leveling up their trips with absolutrip.</p>
            <Link href="/register">
              <button className="bg-accent-lime text-slate-900 px-10 py-6 rounded-full font-bold text-xl hover:scale-105 transition-transform flex items-center gap-3 mx-auto shadow-xl">
                Start Planning Free
                <span className="material-symbols-outlined font-black">arrow_forward</span>
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-background-light dark:bg-background-dark border-t border-slate-200 dark:border-slate-800 pt-24 pb-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-12 mb-24">
            <div className="md:col-span-4">
              <div className="flex items-center gap-2 mb-6">
                <div className="bg-primary p-2 rounded-xl text-white flex items-center justify-center">
                  <span className="material-symbols-outlined">flight_takeoff</span>
                </div>
                <span className="text-2xl font-extrabold tracking-tight">absolutrip</span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-sm">
                The modern travel planning platform for groups and solo adventurers. Plan, budget, and explore with confidence.
              </p>
              <div className="flex gap-4">
                <SocialLink icon="public" />
                <SocialLink icon="share" />
                <SocialLink icon="mail" />
              </div>
            </div>

            <div className="col-span-1 md:col-span-2">
              <FooterHeader>Platform</FooterHeader>
              <FooterList items={["How it works", "Features", "Templates", "Pricing"]} />
            </div>
            <div className="col-span-1 md:col-span-2">
              <FooterHeader>Company</FooterHeader>
              <FooterList items={["About Us", "Careers", "Blog", "Contact"]} />
            </div>

            <div className="md:col-span-4">
              <FooterHeader>Subscribe</FooterHeader>
              <p className="text-sm text-slate-500 mb-6 font-medium">Get travel tips and product updates directly in your inbox.</p>
              <div className="flex gap-2">
                <input
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full px-6 py-3 flex-grow focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                  placeholder="Email address"
                  type="email"
                />
                <button className="bg-primary text-white p-3 rounded-full hover:scale-110 active:scale-95 transition-transform flex items-center justify-center">
                  <span className="material-symbols-outlined text-xl">send</span>
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center gap-6 pt-12 border-t border-slate-200 dark:border-slate-800">
            <p className="text-sm text-slate-500 font-medium">© {new Date().getFullYear()} absolutrip. All rights reserved.</p>
            <div className="flex flex-wrap justify-center gap-x-8 gap-y-4 text-sm text-slate-500 font-medium">
              <Link className="hover:text-primary transition-colors" href="#">Privacy Policy</Link>
              <Link className="hover:text-primary transition-colors" href="#">Terms of Service</Link>
              <Link className="hover:text-primary transition-colors" href="#">Cookie Policy</Link>
            </div>
          </div>
        </div>
      </footer>

      {/* Floating Controls */}
      {mounted && (
        <div className="fixed bottom-6 right-6 flex items-center bg-white/90 dark:bg-slate-800/90 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-full p-2 shadow-2xl z-50">
          <button
            onClick={toggleDarkMode}
            className="p-2.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-all active:scale-90"
            aria-label="Toggle Dark Mode"
          >
            {theme === "dark" ? (
              <span className="material-symbols-outlined text-accent-lime">light_mode</span>
            ) : (
              <span className="material-symbols-outlined text-slate-500">dark_mode</span>
            )}
          </button>
          <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-2"></div>
          <div className="flex items-center gap-3 px-3">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-lg text-primary">auto_fix_high</span>
              <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-tight">AI Created</span>
            </div>
            <button className="bg-primary text-white text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-tighter hover:opacity-90 transition-opacity">
              Remix
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function TestimonialCard({ text, author, role, img, highlight = false }: { text: string; author: string; role: string; img: string; highlight?: boolean }) {
  return (
    <div className={`${highlight ? 'bg-primary text-white' : 'bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800'} p-8 rounded-3xl transition-transform hover:-translate-y-1`}>
      <div className={`flex gap-1 ${highlight ? 'text-accent-lime' : 'text-accent-lime'} mb-6`}>
        {[1, 2, 3, 4, 5].map(i => (
          <span key={i} className="material-symbols-outlined fill-[1] text-lg">star</span>
        ))}
      </div>
      <p className="text-xl font-medium mb-8 italic leading-relaxed">"{text}"</p>
      <div className="flex items-center gap-4">
        <img alt={author} className="w-12 h-12 rounded-full object-cover border-2 border-white/20" src={img} />
        <div>
          <p className="font-bold">{author}</p>
          <p className={`text-sm ${highlight ? 'opacity-70' : 'text-slate-500'}`}>{role}</p>
        </div>
      </div>
    </div>
  );
}

function FooterHeader({ children }: { children: React.ReactNode }) {
  return <h4 className="font-bold mb-6 uppercase text-xs tracking-widest text-slate-400">{children}</h4>;
}

function FooterList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-4">
      {items.map(item => (
        <li key={item}>
          <Link className="text-slate-600 dark:text-slate-300 hover:text-primary transition-colors font-medium text-sm" href="#">
            {item}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function SocialLink({ icon }: { icon: string }) {
  return (
    <Link
      className="w-10 h-10 bg-slate-200 dark:bg-slate-800 rounded-full flex items-center justify-center hover:bg-primary hover:text-white transition-all transform hover:scale-110 active:scale-95"
      href="#"
    >
      <span className="material-symbols-outlined text-xl">{icon}</span>
    </Link>
  );
}
