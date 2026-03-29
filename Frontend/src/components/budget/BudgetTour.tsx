"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, ChevronLeft, Sparkles, Target, Calendar, Save } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Step {
  title: string;
  content: string;
  target: string; // CSS selector
  icon: React.ReactNode;
}

const steps: Step[] = [
  {
    title: "Welcome to Budget Planner!",
    content: "Let's take a quick tour of how you can plan your trip expenses and optimize your budget.",
    target: "#budget-title", 
    icon: <Sparkles className="text-primary size-6" />,
  },
  {
    title: "The Budget Dashboard",
    content: "Here you can see your current plan's total cost vs. the Admin's estimated price. Keep an eye on the difference!",
    target: "#budget-header",
    icon: <Target className="text-primary size-6" />,
  },
  {
    title: "Timeline Selection",
    content: "Plan your trip day-by-day. Select where you'll stay and what activities you'll do.",
    target: "#trip-timeline",
    icon: <Calendar className="text-primary size-6" />,
  },
  {
    title: "Commit Your Plan",
    content: "Once you're happy with your itinerary, click 'Commit' to save it to your trip's official schedule.",
    target: "#commit-button",
    icon: <Save className="text-primary size-6" />,
  },
];

export function BudgetTour({ onComplete }: { onComplete: () => void }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, height: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const updatePosition = () => {
      const targetElement = document.querySelector(steps[currentStep].target);
      if (targetElement) {
        const rect = targetElement.getBoundingClientRect();
        setCoords({
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        });
      }
    };

    const initialScroll = () => {
      const targetElement = document.querySelector(steps[currentStep].target);
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    };

    initialScroll();
    const timeout = setTimeout(updatePosition, 500);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    
    return () => {
      clearTimeout(timeout);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [currentStep]);

  if (!mounted) return null;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Calculate smart positioning
  const popoverWidth = 380;
  const popoverHeight = 300; // estimated height
  const margin = 24;

  let showAbove = false;
  let popoverTop = coords.top + coords.height + margin;
  let popoverLeft = Math.min(window.innerWidth - popoverWidth - 20, Math.max(20, coords.left + coords.width / 2 - popoverWidth / 2));

  const spaceBelow = window.innerHeight - (coords.top + coords.height);
  if (spaceBelow < popoverHeight + margin) {
    showAbove = true;
    popoverTop = coords.top - popoverHeight - margin;
  }

  const tourContent = (
    <div className="fixed inset-0 z-[9999] pointer-events-none isolate">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-[2px] pointer-events-auto" 
        style={{ width: '100vw', height: '100vh' }}
      />
      
      {/* Spotlight */}
      <motion.div
        className="absolute border-2 border-primary/50 rounded-2xl shadow-[0_0_0_200vmax_rgba(0,0,0,0.5)] z-[101]"
        animate={{
          top: coords.top - 8,
          left: coords.left - 8,
          width: coords.width + 16,
          height: coords.height + 16,
        }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      />

      {/* Popover */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: showAbove ? 20 : -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: showAbove ? -20 : 20, scale: 0.95 }}
          className="absolute z-[102] bg-white dark:bg-slate-900 rounded-[2rem] p-8 shadow-2xl border border-slate-100 dark:border-slate-800 w-[380px] pointer-events-auto"
          style={{
            top: popoverTop,
            left: popoverLeft,
          }}
        >
          <button 
            onClick={onComplete}
            className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X className="size-5" />
          </button>

          <div className="flex flex-col items-center text-center space-y-4">
            <div className="size-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-2">
              {steps[currentStep].icon}
            </div>
            
            <h3 className="text-xl font-black italic serif-title">
              {steps[currentStep].title}
            </h3>
            
            <p className="text-slate-500 dark:text-slate-400 font-medium text-sm leading-relaxed">
              {steps[currentStep].content}
            </p>

            <div className="flex items-center justify-between w-full pt-6">
              <div className="flex gap-1">
                {steps.map((_, i) => (
                  <div 
                    key={i} 
                    className={`h-1 rounded-full transition-all ${i === currentStep ? 'w-6 bg-primary' : 'w-2 bg-slate-200 dark:bg-slate-800'}`} 
                  />
                ))}
              </div>
              
              <div className="flex gap-2">
                {currentStep > 0 && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={handleBack}
                    className="rounded-xl border border-slate-100 dark:border-slate-800"
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                )}
                <Button 
                  onClick={handleNext}
                  className="rounded-xl px-6 font-black uppercase text-[10px] tracking-widest gap-2"
                >
                  {currentStep === steps.length - 1 ? "Finish" : "Next"}
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );

  return createPortal(tourContent, document.body);
}
