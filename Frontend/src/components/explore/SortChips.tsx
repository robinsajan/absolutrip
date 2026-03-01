"use client";

import { Info } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type SortOption = "votes" | "price" | "created_at";

interface SortChipsProps {
  value: SortOption;
  onChange: (value: SortOption) => void;
}

const sortOptions: { value: SortOption; label: string }[] = [
  { value: "votes", label: "Top Voted" },
  { value: "price", label: "Lowest Price" },
  { value: "created_at", label: "Newest" },
];

export function SortChips({ value, onChange }: SortChipsProps) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0">
              <Info className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <p className="text-sm">
              Vote on options to help the group decide. The top-voted option is highlighted with a badge.
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      {sortOptions.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
            value === option.value
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
