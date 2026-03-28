"use client";

import React, { useEffect, useState } from "react";

export function FullPageLoader() {
  const [text, setText] = useState("");
  const fullText = "AbsoluTrip";
  const [index, setIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isDeleting && index < fullText.length) {
        setText((prev) => prev + fullText.charAt(index));
        setIndex((prev) => prev + 1);
      } else if (isDeleting && index > 0) {
        setText((prev) => prev.slice(0, -1));
        setIndex((prev) => prev - 1);
      } else if (!isDeleting && index === fullText.length) {
        // Longer pause at the end
        setTimeout(() => setIsDeleting(true), 1500);
      } else if (isDeleting && index === 0) {
        setIsDeleting(false);
      }
    }, isDeleting ? 40 : 120);

    return () => clearTimeout(timer);
  }, [index, isDeleting]);

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white dark:bg-black transition-colors duration-500">
      <div className="relative">
        <div className="absolute -inset-8 bg-black/5 dark:bg-white/5 blur-3xl rounded-full" />
        <h1 className="relative text-4xl md:text-6xl font-extrabold tracking-tighter text-black dark:text-white font-mono">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-black via-black/80 to-black/40 dark:from-white dark:via-white/80 dark:to-white/40">
            {text}
          </span>
          <span className="inline-block w-[3px] h-[1.1em] ml-1 align-middle bg-black dark:bg-white animate-pulse" />
        </h1>
      </div>
      
      <div className="mt-12 flex items-center gap-2">
         {[0, 1, 2].map((i) => (
           <div 
             key={i}
             className="w-1.5 h-1.5 rounded-full bg-black/20 dark:bg-white/20 animate-bounce" 
             style={{ animationDelay: `${i * 0.15}s` }}
           />
         ))}
      </div>
      
      <p className="mt-6 text-[10px] font-black tracking-[0.4em] uppercase text-black/40 dark:text-white/40 serif-title italic">
        Syncing your adventures
      </p>
    </div>
  );
}
