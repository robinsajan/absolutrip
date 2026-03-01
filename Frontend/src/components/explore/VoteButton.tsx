"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";

interface VoteButtonProps {
  score: number;
  voteCount: number;
  userVote?: number;
  onVote: (score: number) => Promise<void>;
  disabled?: boolean;
}

export function VoteButton({
  score,
  voteCount,
  userVote,
  onVote,
  disabled,
}: VoteButtonProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const hasVoted = userVote && userVote > 0;

  const handleClick = async () => {
    if (disabled || isLoading) return;

    setIsLoading(true);
    setIsAnimating(true);

    try {
      await onVote(hasVoted ? 0 : 1);
    } finally {
      setIsLoading(false);
      setTimeout(() => setIsAnimating(false), 300);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled || isLoading}
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-full transition-all",
        "border-2 font-medium",
        hasVoted
          ? "bg-red-50 border-red-500 text-red-500"
          : "bg-background border-muted hover:border-red-300",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <Heart
        className={cn(
          "h-5 w-5 transition-all",
          hasVoted && "fill-red-500",
          isAnimating && "animate-pulse-vote"
        )}
      />
      <span className="text-sm">
        {score > 0 ? score : ""} {voteCount === 1 ? "vote" : "votes"}
      </span>
    </button>
  );
}
