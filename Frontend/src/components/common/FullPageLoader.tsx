"use client";

import React, { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";

const BRAND = "absoluTrip";

export function FullPageLoader() {
  /* ── typewriter state ─────────────────────────────── */
  const [typed, setTyped] = useState("");
  const [charIdx, setCharIdx] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  /* ── slow-load note after 30 s ───────────────────── */
  const [showSlowNote, setShowSlowNote] = useState(false);

  /* ── enter animation ─────────────────────────────── */
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setEntered(true), 80);
    return () => clearTimeout(t);
  }, []);

  /* ── typewriter loop ─────────────────────────────── */
  useEffect(() => {
    const speed = isDeleting ? 40 : 110;
    const timer = setTimeout(() => {
      if (!isDeleting && charIdx < BRAND.length) {
        setTyped(BRAND.slice(0, charIdx + 1));
        setCharIdx((p) => p + 1);
      } else if (!isDeleting && charIdx === BRAND.length) {
        // Full word paused — restart after a delay
        setTimeout(() => setIsDeleting(true), 2200);
      } else if (isDeleting && charIdx > 0) {
        setTyped(BRAND.slice(0, charIdx - 1));
        setCharIdx((p) => p - 1);
      } else if (isDeleting && charIdx === 0) {
        setIsDeleting(false);
      }
    }, speed);
    return () => clearTimeout(timer);
  }, [charIdx, isDeleting]);

  /* ── slow-load timer ─────────────────────────────── */
  useEffect(() => {
    const t = setTimeout(() => setShowSlowNote(true), 30_000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center select-none"
      style={{ background: "#EFEDE8" }}
    >
      {/* ── Main editorial text block ── */}
      <div
        className="px-8 max-w-[600px] w-full"
        style={{
          opacity: entered ? 1 : 0,
          transform: entered ? "translateY(0)" : "translateY(16px)",
          transition: "opacity 0.55s ease, transform 0.55s ease",
        }}
      >
        {/* Line 1: "Level up" */}
        <h1
          className="leading-[0.92] font-extrabold tracking-tight"
          style={{
            fontFamily:
              "'Inter', 'Helvetica Neue', Arial, sans-serif",
            fontSize: "clamp(3.5rem, 12vw, 7.5rem)",
            color: "#0F1324",
          }}
        >
          Level up
        </h1>

        {/* Line 2: "your next" */}
        <h1
          className="leading-[0.92] font-extrabold tracking-tight"
          style={{
            fontFamily:
              "'Inter', 'Helvetica Neue', Arial, sans-serif",
            fontSize: "clamp(3.5rem, 12vw, 7.5rem)",
            color: "#0F1324",
          }}
        >
          your next
        </h1>

        {/* Line 3: "trip → with" — arrow is inline badge */}
        <h1
          className="leading-[0.92] font-extrabold tracking-tight flex items-center flex-wrap gap-x-4"
          style={{
            fontFamily:
              "'Inter', 'Helvetica Neue', Arial, sans-serif",
            fontSize: "clamp(3.5rem, 12vw, 7.5rem)",
            color: "#0F1324",
          }}
        >
          <span>trip</span>
          {/* Arrow badge */}
          <span
            className="inline-flex items-center justify-center rounded-2xl"
            style={{
              background: "#3B67F6",
              width: "clamp(4rem, 12vw, 7.5rem)",
              height: "clamp(2.8rem, 8vw, 5rem)",
              flexShrink: 0,
              marginTop: "0.08em",
              marginBottom: "0.04em",
            }}
          >
            <ArrowRight
              style={{
                color: "#fff",
                width: "clamp(1.4rem, 4vw, 2.8rem)",
                height: "clamp(1.4rem, 4vw, 2.8rem)",
                strokeWidth: 2.5,
              }}
            />
          </span>
          <span>with</span>
        </h1>

        {/* Line 4: absoluTrip typewriter in brand blue */}
        <h1
          className="leading-[0.92] font-extrabold tracking-tight flex items-baseline"
          style={{
            fontFamily:
              "'Inter', 'Helvetica Neue', Arial, sans-serif",
            fontSize: "clamp(3.5rem, 12vw, 7.5rem)",
            color: "#3B67F6",
          }}
        >
          <span>{typed}</span>
          {/* cursor */}
          <span
            className="inline-block ml-1 rounded-sm"
            style={{
              width: "clamp(3px, 0.5vw, 6px)",
              height: "0.85em",
              background: "#3B67F6",
              opacity: 0.85,
              animation: "pulse 1s cubic-bezier(0.4,0,0.6,1) infinite",
              verticalAlign: "baseline",
              marginBottom: "0.06em",
            }}
          />
        </h1>
      </div>

      {/* ── Slow-load note (appears after 30 s) ── */}
      <div
        className="absolute bottom-12 left-0 right-0 flex justify-center px-8"
        style={{
          opacity: showSlowNote ? 1 : 0,
          transform: showSlowNote ? "translateY(0)" : "translateY(8px)",
          transition: "opacity 0.7s ease, transform 0.7s ease",
          pointerEvents: showSlowNote ? "auto" : "none",
        }}
      >
        <p
          className="text-center font-semibold max-w-sm"
          style={{
            color: "#0F1324",
            opacity: 0.5,
            fontSize: "clamp(0.8rem, 2vw, 1rem)",
            lineHeight: 1.5,
          }}
        >
          Planning takes time — let us do that for you while you have fun.
        </p>
      </div>
    </div>
  );
}
