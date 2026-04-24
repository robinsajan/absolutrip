"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

// --- CUSTOM CURSOR COMPONENT ---
function CustomCursor() {
  const [position, setPosition] = useState({ x: -100, y: -100 });
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
    };

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'A' || target.tagName === 'BUTTON' || target.closest('a') || target.closest('button')) {
        setIsHovering(true);
      } else {
        setIsHovering(false);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseover', handleMouseOver);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseover', handleMouseOver);
    };
  }, []);

  return (
    <>
      <div
        className="fixed w-3 h-3 bg-primary rounded-full pointer-events-none z-[9999] transition-transform duration-150 ease-out hidden md:block"
        style={{
          left: position.x,
          top: position.y,
          transform: `translate(-50%, -50%) ${isHovering ? 'scale(3.5)' : 'scale(1)'}`,
          mixBlendMode: isHovering ? 'difference' : 'normal',
          backgroundColor: isHovering ? '#C8FF00' : '#FF5533'
        }}
      />
      <div
        className="fixed w-9 h-9 border border-primary/40 rounded-full pointer-events-none z-[9998] transition-all duration-300 ease-out hidden md:block"
        style={{
          left: position.x,
          top: position.y,
          transform: 'translate(-50%, -50%)',
          opacity: isHovering ? 0 : 1
        }}
      />
    </>
  );
}

// --- SWIPE CARD SYSTEM ---
const swipeCards = [
  {
    num: "01",
    icon: "account_balance_wallet",
    title: "Expense Splitting",
    desc: "Log costs in any currency. absoluTrip calculates who owes what and generates a fair settlement — zero awkward conversations.",
    tag: "currency_exchange",
    tagText: "Any currency",
    color: "bg-slate-900",
    iconColor: "text-[#C8FF00]",
    iconBg: "bg-[#C8FF00]/10"
  },
  {
    num: "02",
    icon: "how_to_vote",
    title: "Group Polls",
    desc: "Can't agree on a hotel? Create a poll, get everyone's vote, see live results. Move forward — together, in seconds.",
    tag: "bar_chart",
    tagText: "Live results",
    color: "bg-[#1A2E1A]",
    iconColor: "text-[#64C864]",
    iconBg: "bg-[#64C864]/10"
  },
  {
    num: "03",
    icon: "groups",
    title: "Real-time Collab",
    desc: "Invite friends to edit the itinerary live. Chat, react, assign tasks — no account required for guests. Everyone stays in sync.",
    tag: "people",
    tagText: "No account needed",
    color: "bg-[#1A1A2E]",
    iconColor: "text-[#6496FF]",
    iconBg: "bg-[#6496FF]/10"
  },
  {
    num: "04",
    icon: "payments",
    title: "Create Your Own Budget",
    desc: "Build a personalized financial blueprint. Compare with group targets, log private expenses, and stay on track without the stress.",
    tag: "savings",
    tagText: "Pocket-friendly",
    color: "bg-[#2E1A1A]",
    iconColor: "text-[#FFB866]",
    iconBg: "bg-[#FFB866]/10"
  }
];

function CardDeck() {
  const [current, setCurrent] = useState(0);

  const handleDragEnd = (event: any, info: any) => {
    if (info.offset.x > 100) {
      setCurrent((prev) => (prev - 1 + swipeCards.length) % swipeCards.length);
    } else if (info.offset.x < -100) {
      setCurrent((prev) => (prev + 1) % swipeCards.length);
    }
  };

  return (
    <div className="relative h-[520px] max-w-[420px] mx-auto group">
      <div className="relative w-full h-[480px]">
        {swipeCards.map((card, i) => {
          const offset = (i - current + swipeCards.length) % swipeCards.length;
          const isActive = offset === 0;

          return (
            <motion.div
              key={i}
              drag={isActive ? "x" : false}
              dragConstraints={{ left: 0, right: 0 }}
              onDragEnd={handleDragEnd}
              initial={false}
              animate={{
                rotate: offset === 1 ? 2 : offset === 2 ? -2 : 0,
                y: offset * 12,
                scale: 1 - offset * 0.03,
                zIndex: swipeCards.length - offset,
                opacity: offset > 2 ? 0 : 1,
                x: 0
              }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className={`absolute inset-0 rounded-[28px] p-9 flex flex-col justify-between shadow-xl text-white ${card.color} cursor-grab active:cursor-grabbing`}
            >
              <div className="absolute right-6 top-6 text-8xl font-black opacity-10 leading-none">
                {card.num}
              </div>
              <div className={`w-16 h-16 ${card.iconBg} rounded-2xl flex items-center justify-center`}>
                <span className={`material-symbols-outlined text-3xl ${card.iconColor}`}>{card.icon}</span>
              </div>
              <div>
                <h3 className="text-2xl font-black mb-3">{card.title}</h3>
                <p className="text-sm opacity-80 leading-relaxed">{card.desc}</p>
              </div>
              <div className={`inline-flex items-center gap-2 ${card.iconBg} px-4 py-2 rounded-full w-fit text-xs font-bold`}>
                <span className="material-symbols-outlined text-[16px]">{card.tag}</span>
                {card.tagText}
              </div>
            </motion.div>
          );
        })}
      </div>
      <div className="flex justify-center gap-2 mt-8">
        {swipeCards.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`h-1.5 rounded-full transition-all duration-300 ${i === current ? 'w-6 bg-primary' : 'w-1.5 bg-slate-200'}`}
          />
        ))}
      </div>
    </div>
  );
}

// --- FEATURE FOLDER SYSTEM ---
const toolkit = [
  {
    id: "expense",
    icon: "receipt_long",
    title: "Smart Expense Tracker",
    desc: "Add expenses in any currency. absoluTrip converts everything and generates a fair settlement breakdown.",
    color: "bg-slate-900",
    textColor: "text-white"
  },
  {
    id: "packing",
    icon: "luggage",
    title: "Shared Packing Lists",
    desc: "Create group packing lists and assign items to each traveller. Never forget anything.",
    color: "bg-primary",
    textColor: "text-white"
  },
  {
    id: "reminders",
    icon: "notifications_active",
    title: "Smart Reminders",
    desc: "Flight check-in, visa deadlines — we nudge the group so nothing slips through.",
    color: "bg-accent-lime",
    textColor: "text-slate-900"
  },
  {
    id: "language",
    icon: "translate",
    title: "Multi-language",
    desc: "Planning with an international crew? absoluTrip works in multiple languages.",
    color: "bg-[#1A2E1A]",
    textColor: "text-white"
  }
];

function FeatureFolder() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string | null>(null);

  return (
    <>
      <div className="flex justify-center w-full relative z-10">
        <motion.button
          layoutId="folder"
          onClick={() => setIsOpen(true)}
          className="group relative w-72 h-52 md:w-96 md:h-64 cursor-pointer"
        >
          {/* Back flap */}
          <div className="absolute inset-0 top-6 bg-slate-200 rounded-2xl transition-all duration-300 group-hover:bg-slate-300 overflow-hidden shadow-inner">
            <div className="absolute -right-8 -top-8 w-32 h-32 bg-primary/10 rounded-full blur-2xl"></div>
          </div>
          {/* Top tab */}
          <div className="absolute top-0 left-0 w-32 h-8 bg-slate-200 rounded-t-xl transition-all duration-300 group-hover:bg-slate-300"></div>

          {/* Front flap */}
          <div className="absolute inset-0 top-8 bg-white border border-slate-100 shadow-xl rounded-2xl origin-bottom transition-all duration-500 transform group-hover:rotate-[-4deg] group-hover:translate-y-2 flex flex-col items-center justify-center">
            <motion.div
              animate={{ rotate: [0, -5, 5, 0] }}
              transition={{ repeat: Infinity, duration: 4 }}
            >
              <span className="material-symbols-outlined text-6xl text-primary mb-2 shadow-sm rounded-full bg-primary/5 p-4">folder_open</span>
            </motion.div>
            <h4 className="text-2xl font-black text-slate-800 tracking-tight mt-2">AbsoluToolbox</h4>
            <span className="mt-3 bg-slate-100 text-slate-500 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest group-hover:bg-primary border border-slate-200 group-hover:border-primary group-hover:text-white shadow-sm transition-colors duration-300"> Tools Inside</span>
          </div>
        </motion.button>
      </div>

      <AnimatePresence>
        {isOpen && !activeTab && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[900] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 md:p-12"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              layoutId="folder"
              onClick={(e) => e.stopPropagation()}
              className="max-w-4xl w-full relative"
            >
              <button
                onClick={() => setIsOpen(false)}
                className="absolute -top-16 right-0 w-12 h-12 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 text-white transition-colors backdrop-blur-md"
              >
                <span className="material-symbols-outlined">close</span>
              </button>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {toolkit.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className="flex items-center gap-5 px-6 py-6 md:p-8 rounded-[32px] transition-all w-full text-left border-2 bg-white/95 border-transparent hover:border-primary shadow-xl hover:shadow-2xl hover:scale-[1.02] group"
                  >
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 bg-slate-100 text-slate-500 shadow-sm group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                      <span className="material-symbols-outlined text-3xl">{item.icon}</span>
                    </div>
                    <div>
                      <span className="font-black text-lg md:text-xl tracking-tight block text-slate-900">{item.title}</span>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeTab && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 md:p-12"
            onClick={() => setActiveTab(null)}
          >
            {toolkit.map((item) => activeTab === item.id && (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 40, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 40, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                onClick={(e) => e.stopPropagation()}
                className={`w-full max-w-2xl min-h-[400px] rounded-[40px] p-10 md:p-14 ${item.color} shadow-2xl flex flex-col justify-between relative overflow-hidden`}
              >
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none" />

                <button
                  onClick={() => setActiveTab(null)}
                  className={`absolute top-8 right-8 w-10 h-10 rounded-full flex items-center justify-center ${item.textColor === 'text-white' ? 'bg-white/10 hover:bg-white/20' : 'bg-black/5 hover:bg-black/10'} transition-colors z-20`}
                >
                  <span className={`material-symbols-outlined ${item.textColor}`}>close</span>
                </button>

                <div className={`w-20 h-20 ${item.textColor === 'text-white' ? 'bg-white/10' : 'bg-black/5'} rounded-3xl flex items-center justify-center mb-12 relative z-10`}>
                  <span className={`material-symbols-outlined text-4xl ${item.textColor}`}>{item.icon}</span>
                </div>

                <div className="relative z-10">
                  <h4 className={`text-4xl md:text-5xl font-black mb-6 leading-tight ${item.textColor}`}>{item.title}</h4>
                  <p className={`text-lg md:text-xl font-medium opacity-85 leading-relaxed ${item.textColor}`}>
                    {item.desc}
                  </p>
                </div>

                <div className={`mt-12 flex items-center gap-3 text-xs font-black uppercase tracking-[2px] ${item.textColor} opacity-60`}>
                  <span className="w-8 h-[2px] bg-current" />
                  Tap outside to close
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// --- MAIN LANDING PAGE ---
export function LandingPage() {
  const [mounted, setMounted] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return (
    <div className="bg-white text-slate-900 selection:bg-accent-lime selection:text-slate-900 overflow-x-hidden font-jakarta">
      <CustomCursor />

      {/* --- NAV --- */}
      <nav className="fixed top-0 left-0 right-0 z-[500] px-6 py-4 md:px-12 md:py-6 flex items-center justify-between bg-white/80 backdrop-blur-xl border-b border-slate-100">
        <Link href="/" className="flex items-center gap-3 no-underline">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/20">
            <span className="material-symbols-outlined text-[22px]">flight_takeoff</span>
          </div>
          <span className="text-xl font-black tracking-tight text-slate-900">absoluTrip</span>
        </Link>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-10 mr-4">
            <Link href="#features" className="text-sm font-bold text-slate-500 hover:text-primary transition-colors no-underline">Features</Link>
            <Link href="#how-it-works" className="text-sm font-bold text-slate-500 hover:text-primary transition-colors no-underline">How It Works</Link>
            <Link href="/login" className="text-sm font-bold text-slate-600 hover:text-primary transition-colors no-underline">Log In</Link>
          </div>
          <Link href="/register">
            <button className="bg-primary text-white px-5 py-2.5 md:px-6 md:py-3 rounded-full font-bold text-xs md:text-sm hover:scale-105 hover:bg-primary-dark transition-all active:scale-95 shadow-lg shadow-primary/20 flex items-center gap-2">
              Start Free
              <span className="material-symbols-outlined text-[14px] md:text-sm">north_east</span>
            </button>
          </Link>
        </div>
      </nav>

      <main>
        {/* --- HERO --- */}
        <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 pt-24 pb-12 overflow-hidden bg-[radial-gradient(circle_at_center,_rgba(255,85,51,0.08)_0%,transparent_60%)]">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />


          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-[clamp(48px,9vw,110px)] font-black leading-[0.95] tracking-tight mb-8"
          >
            Level up your <br className="md:hidden" /> next trip
            <span className="inline-flex items-center justify-center bg-primary text-white w-[80px] h-[45px] md:w-[140px] md:h-[80px] rounded-3xl mx-2 md:mx-4 align-middle transition-transform hover:rotate-12 cursor-default shrink-0">
              <span className="material-symbols-outlined text-2xl md:text-5xl">arrow_forward</span>
            </span>
            <br />
            with <span className="text-primary italic">absoluTrip</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-slate-500 text-lg md:text-xl max-w-xl mb-12 font-medium leading-relaxed"
          >
            Replace scattered WhatsApp threads and messy spreadsheets. Build itineraries, split costs, and vote on ideas — all in one place.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-wrap justify-center gap-4 mb-16"
          >
            <Link href="/register">
              <button className="bg-accent-lime text-slate-900 px-10 py-5 rounded-full font-black text-lg hover:scale-105 transition-all shadow-xl shadow-accent-lime/20 flex items-center gap-3">
                Start Planning Free
                <span className="material-symbols-outlined font-black">arrow_forward</span>
              </button>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex flex-wrap justify-center gap-8 mb-12"
          >
            <div className="flex items-center gap-2 text-slate-400 text-sm font-bold">
              <span className="material-symbols-outlined text-primary text-[18px]">check_circle</span>
              Free forever
            </div>
            <div className="flex items-center gap-2 text-slate-400 text-sm font-bold">
              <span className="material-symbols-outlined text-primary text-[18px]">credit_card_off</span>
              No card needed
            </div>
            <div className="flex items-center gap-2 text-slate-400 text-sm font-bold">
              <span className="material-symbols-outlined text-primary text-[18px]">luggage</span>
              Unlimited trips
            </div>
          </motion.div>
        </section>

        {/* --- CARD SECTION --- */}
        <section className="bg-slate-50 py-24 px-6 overflow-hidden">
          <div className="max-w-7xl mx-auto text-center mb-16">
            <div className="text-xs font-black uppercase tracking-widest text-primary mb-4">Swipe to explore</div>
            <h2 className="text-4xl md:text-6xl font-black tracking-tight">Everything your group <span className="text-primary italic">needs.</span></h2>
          </div>
          <CardDeck />
        </section>

        {/* --- FEATURES GRID --- */}
        <section className="py-24 px-6 md:px-12 max-w-7xl mx-auto" id="features">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-8 bg-[#001A1A] rounded-[32px] p-10 md:p-16 flex flex-col justify-between text-white relative overflow-hidden group border border-white/5">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[100px] -mr-32 -mt-32" />
              <div className="relative z-10">
                <h3 className="text-4xl md:text-5xl font-black mb-8 leading-tight">Group Travel Planning <br /> Made Simple</h3>
                <p className="text-slate-300 text-lg md:text-xl font-medium leading-relaxed mb-10 max-w-2xl">
                  From the streets of Lisbon to the temples of Kyoto, absoluTrip helps your group turn travel ideas into a clear, stress-free itinerary.
                </p>
                <div className="space-y-4 mb-12">
                  {[
                    "Build a day-by-day group itinerary",
                    "Manage your shared travel budget",
                    "Vote on destinations, activities & restaurants",
                    "Create shared packing lists and assign tasks"
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 text-slate-300 font-bold">
                      <div className="w-1.5 h-1.5 bg-accent-lime rounded-full" />
                      {item}
                    </div>
                  ))}
                </div>
                <Link href="/register">
                  <button className="bg-accent-lime text-slate-900 px-8 py-4 rounded-full font-black text-lg hover:scale-105 transition-all shadow-xl shadow-accent-lime/10">
                    Start Planning Together
                  </button>
                </Link>
              </div>
            </div>

            <div className="md:col-span-4 bg-[#0a0f1d] rounded-[32px] p-8 md:p-12 relative overflow-hidden flex flex-col items-center justify-between border border-white/5 group shadow-2xl">
              {/* Space Background */}
              <div className="absolute inset-0 bg-[#060913] z-0">
                <div className="absolute top-10 left-10 w-1 h-1 bg-white rounded-full opacity-30" />
                <div className="absolute top-1/4 right-20 w-1 h-1 bg-white rounded-full opacity-20" />
                <div className="absolute bottom-1/3 left-1/4 w-1 h-1 bg-white rounded-full opacity-40" />
                <div className="absolute bottom-10 right-1/3 w-1.5 h-1.5 bg-white rounded-full opacity-10" />
              </div>
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-900/20 rounded-full blur-[80px] -mr-32 -mt-32 z-0" />

              {/* Earth Circle */}
              <div className="relative z-10 w-48 h-48 md:w-64 md:h-64 mt-8 rounded-full bg-gradient-to-br from-blue-950 via-slate-900 to-black shadow-[inset_-20px_-20px_40px_rgba(0,0,0,0.8),inset_10px_10px_30px_rgba(59,130,246,0.2)] border border-white/5 flex items-center justify-center animate-[spin_60s_linear_infinite]">

                {/* Map Grid overlay */}
                <div className="absolute inset-0 rounded-full bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(255,255,255,0.05)_100%)] overflow-hidden">
                  <div className="absolute w-[200%] h-[1px] bg-white/5 top-1/2 left-[-50%]" />
                  <div className="absolute w-[1px] h-[200%] bg-white/5 left-1/2 top-[-50%]" />
                </div>

                {/* Blinking Pins - Note: Inverse spin to keep pins upright if rotating, but keeping them simple blinking works */}
                <motion.div animate={{ opacity: [0, 1, 0, 0] }} transition={{ duration: 4, repeat: Infinity, delay: 0.5 }} className="absolute top-[20%] left-[30%] w-2 h-2 md:w-3 md:h-3 bg-primary rounded-full shadow-[0_0_15px_#FF5533]" />
                <motion.div animate={{ opacity: [0, 0, 1, 0] }} transition={{ duration: 4, repeat: Infinity, delay: 1.5 }} className="absolute bottom-[30%] right-[30%] w-2 h-2 md:w-3 md:h-3 bg-accent-lime rounded-full shadow-[0_0_15px_#CCFF00]" />
                <motion.div animate={{ opacity: [0, 1, 0, 0] }} transition={{ duration: 4, repeat: Infinity, delay: 2.5 }} className="absolute top-[45%] left-[75%] w-1.5 h-1.5 md:w-2 md:h-2 bg-blue-400 rounded-full shadow-[0_0_15px_#60A5FA]" />
                <motion.div animate={{ opacity: [0, 0, 1, 0] }} transition={{ duration: 4, repeat: Infinity, delay: 3.5 }} className="absolute bottom-[20%] left-[40%] w-2 h-2 md:w-3 md:h-3 bg-purple-400 rounded-full shadow-[0_0_15px_#C084FC]" />

                <span className="material-symbols-outlined text-white/5 text-[100px] md:text-[140px] absolute">public</span>
              </div>

              <div className="text-center relative z-10 w-full mt-12 mb-4">
                <h4 className="text-white font-black text-2xl md:text-3xl tracking-tight mb-3">Global Access</h4>
                <p className="text-slate-400 font-medium text-sm md:text-base leading-relaxed px-4">Plan trips to literally any corner of the globe.</p>
              </div>
            </div>
            <div className="md:col-span-12 mt-12">
              <div className="bg-slate-50 rounded-[40px] p-12 md:p-32 border border-slate-100 flex justify-center items-center overflow-hidden relative">
                <div className="absolute -top-32 -right-32 w-96 h-96 bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
                <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-accent-lime/10 rounded-full blur-[100px] pointer-events-none" />
                <FeatureFolder />
              </div>
            </div>
          </div>
        </section>

        {/* --- MARQUEE --- */}
        <section className="bg-accent-lime py-6 overflow-hidden border-y border-slate-900/10">
          <motion.div
            animate={{ x: [0, -1000] }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="flex whitespace-nowrap gap-12"
          >
            {Array(10).fill(0).map((_, i) => (
              <div key={i} className="flex items-center gap-12 text-2xl md:text-3xl font-black text-slate-900 uppercase italic tracking-tighter">
                <span>Group trips, simplified</span>
                <span className="w-3 h-3 bg-slate-900 rounded-full" />
                <span>Plan together, travel better</span>
                <span className="w-3 h-3 bg-slate-900 rounded-full" />
                <span>Travel with ease</span>
                <span className="w-3 h-3 bg-slate-900 rounded-full" />
              </div>
            ))}
          </motion.div>
        </section>

        {/* --- HOW IT WORKS --- */}
        <section className="bg-slate-900 text-white py-32 px-6 relative overflow-hidden" id="how-it-works">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,_rgba(255,85,51,0.15)_0%,transparent_70%)] pointer-events-none" />
          <div className="max-w-4xl mx-auto relative z-10">
            <h2 className="text-[clamp(40px,8vw,80px)] font-black leading-[0.95] mb-24">Three steps from your couch to your <span className="text-primary italic">dream trip.</span></h2>
            <div className="space-y-12">
              {[
                { step: "01", label: "Step One", title: "Pick your vibe & invite the crew", desc: "Tell us where you're going and what you love. Share a link with your group — they're in instantly." },
                { step: "02", label: "Step Two", title: "Build the itinerary together", desc: "Explore AI suggestions, vote on activities with polls, and build a plan everyone's excited about." },
                { step: "03", label: "Step Three", title: "Travel, track & settle up", desc: "Access plans offline, log expenses, and settle the group tab with one tap. Zero awkwardness." }
              ].map((s, i) => (
                <div key={i} className="flex flex-col md:flex-row gap-8 py-12 border-t border-white/10 group">
                  <div className="text-6xl font-black text-primary opacity-30 group-hover:opacity-100 transition-opacity">
                    {s.step}
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-black uppercase tracking-widest text-primary mb-2">{s.label}</div>
                    <h3 className="text-3xl font-black mb-4">{s.title}</h3>
                    <p className="text-slate-400 font-medium text-lg leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* --- TESTIMONIALS --- */}
        <section className="py-16 md:py-24 px-0 md:px-6">
          <div className="max-w-7xl mx-auto bg-slate-50 rounded-none md:rounded-[40px] py-12 md:p-16 border-y md:border border-slate-100">
            <div className="mb-12 px-6 md:px-0">
              <div className="text-xs font-black uppercase tracking-widest text-primary mb-4">Testimonials</div>
              <h2 className="text-4xl md:text-5xl font-black">Loved by real travellers.</h2>
            </div>
            <div className="flex flex-col gap-6">
              <div className="bg-white px-6 py-10 md:p-10 rounded-none shadow-sm w-full border-y md:border-none border-slate-100">
                <div className="flex text-accent-lime mb-6">
                  {Array(5).fill(0).map((_, i) => <span key={i} className="material-symbols-outlined fill-[1]">star</span>)}
                </div>
                <p className="text-lg font-bold mb-8 italic">"absoluTrip made our group trip to Japan actually happen. The budget tool saved us from awkwardness!"</p>
                <div className="font-black text-slate-900">Robin Sajan</div>
                <div className="text-slate-400 text-sm font-bold">Co-Founder, absoluTrip</div>
              </div>
              <div className="bg-primary px-6 py-10 md:p-10 rounded-none text-white shadow-xl shadow-primary/20 w-full">
                <div className="flex text-accent-lime mb-6">
                  {Array(5).fill(0).map((_, i) => <span key={i} className="material-symbols-outlined fill-[1]">star</span>)}
                </div>
                <p className="text-lg font-bold mb-8 italic">"Finally, a travel app that doesn't feel like a spreadsheet. Beautiful UI and incredibly intuitive."</p>
                <div className="font-black">Jason Kalathingal</div>
                <div className="opacity-70 text-sm font-bold">Co-Founder, absoluTrip</div>
              </div>
              <div className="bg-accent-lime px-6 py-10 md:p-10 rounded-none text-slate-900 w-full">
                <p className="text-2xl font-black mb-8 leading-tight">"The polls feature alone is worth it. No more 47-message threads just to pick a restaurant."</p>
                <div className="font-black">Group of 8, Lisbon</div>
                <div className="text-slate-600 text-sm font-bold">Weekend trip, April 2025</div>
              </div>
            </div>
          </div>
        </section>

        {/* --- FAQ --- */}
        <section className="py-24 px-6 max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <div className="text-xs font-black uppercase tracking-widest text-primary mb-4">FAQ</div>
            <h2 className="text-4xl font-black">Common questions.</h2>
          </div>
          <div className="space-y-4">
            {[
              { q: "Is absoluTrip free to use?", a: "Yes! absoluTrip is free to get started. You can plan unlimited trips, invite friends, and access all core features at no cost." },
              { q: "How do I invite friends to a trip?", a: "Once you create a trip, share a unique link via WhatsApp or email. Friends can join instantly — no account required for guests." },
              { q: "Can everyone in the group edit the itinerary?", a: "Absolutely. Every collaborator can suggest activities, vote on plans, and update the itinerary in real-time." },
              { q: "Does absoluTrip work on mobile?", a: "Yes, it's fully responsive and works on any device. Excellent for using your plans on the go." }
            ].map((f, i) => (
              <div key={i} className="bg-slate-50 rounded-2xl overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full px-8 py-6 flex items-center justify-between text-left font-black text-lg hover:text-primary transition-colors"
                >
                  {f.q}
                  <span className={`material-symbols-outlined text-primary transition-transform duration-300 ${openFaq === i ? 'rotate-45' : ''}`}>add</span>
                </button>
                <AnimatePresence>
                  {openFaq === i && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: "auto" }}
                      exit={{ height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-8 pb-8 text-slate-500 font-medium leading-relaxed">
                        {f.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </section>

        {/* --- CTA --- */}
        <section className="px-6 py-12 mb-12">
          <div className="bg-primary rounded-[48px] p-12 md:p-24 text-center text-white relative overflow-hidden shadow-2xl shadow-primary/30 bg-[radial-gradient(circle_at_center,_rgba(200,255,0,0.3)_0%,rgba(255,85,51,1)_80%)]">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.2),transparent_50%)]" />
            <div className="relative z-10">
              <h2 className="text-[clamp(40px,10vw,100px)] font-black leading-[0.9] mb-12">Let's plan your next adventure.</h2>
              <Link href="/register">
                <button className="bg-white text-primary px-12 py-6 rounded-full font-black text-xl hover:scale-105 transition-all shadow-xl shadow-white/10 flex items-center gap-3 mx-auto">
                  Start Now
                  <span className="material-symbols-outlined font-black">arrow_forward</span>
                </button>
              </Link>
              <div className="mt-8 text-sm font-black opacity-60 uppercase tracking-widest">Free forever &nbsp;·&nbsp; No card needed</div>
            </div>
          </div>
        </section>
      </main>

      {/* --- FOOTER --- */}
      <footer className="bg-slate-50 border-t border-slate-200 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-sm">flight_takeoff</span>
            </div>
            <span className="font-black text-slate-900">absoluTrip</span>
          </div>
          <div className="flex flex-wrap justify-center gap-8 text-sm font-bold text-slate-400">
            <Link href="#" className="hover:text-primary transition-colors">Privacy Policy</Link>
            <Link href="#" className="hover:text-primary transition-colors">Terms of Service</Link>
            <Link href="#" className="hover:text-primary transition-colors">Contact Us</Link>
          </div>
          <div className="text-sm font-bold text-slate-400">
            © {new Date().getFullYear()} absoluTrip
          </div>
        </div>
      </footer>
    </div>
  );
}
