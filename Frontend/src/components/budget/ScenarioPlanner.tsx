"use client";

import { useEffect, useMemo, useCallback } from "react";
import { format, parseISO, differenceInDays } from "date-fns";
import { Info, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { RankedOption } from "@/types";

interface ScenarioPlannerProps {
  options: RankedOption[];
  memberCount: number;
  currentExpenses: number;
  onScenarioChange: (totalWithOptions: number, perPerson: number) => void;
  title?: string;
  description?: string;
  selectedOptionIds: number[];
  onSelectOption: (optionId: number) => void;
  hideSelectionIndicator?: boolean;
}

export function ScenarioPlanner({
  options,
  memberCount,
  currentExpenses,
  onScenarioChange,
  title = "What-If Planner",
  description = "Select an option to see how it affects your budget",
  selectedOptionIds,
  onSelectOption,
  hideSelectionIndicator,
}: ScenarioPlannerProps) {

  const calculateOptionPrice = useCallback((ro: RankedOption) => {
    const { option } = ro;

    // Use pre-calculated pricing from DB as-is (Per Person Per Day)
    if (option.price_per_day_pp !== undefined && option.price_per_day_pp !== null) {
      let nights = 1;
      if (option.check_in_date && option.check_out_date) {
        nights = Math.max(differenceInDays(parseISO(option.check_out_date), parseISO(option.check_in_date)), 1);
      }
      return option.price_per_day_pp * nights;
    }

    // Fallback to strict calculation (Per Person)
    let price = (option.price || 0) / Math.max(memberCount, 1);
    if (option.check_in_date && option.check_out_date) {
      try {
        const nights = Math.max(differenceInDays(parseISO(option.check_out_date), parseISO(option.check_in_date)), 1);
        price *= nights;
      } catch (e) {
        // fallback to 1 night
      }
    }
    return price;
  }, [memberCount]);

  const totalSelectedPrice = useMemo(() => {
    return selectedOptionIds.reduce((sum, id) => {
      const ro = options.find(o => o.option.id === id);
      return sum + (ro ? calculateOptionPrice(ro) : 0);
    }, 0);
  }, [selectedOptionIds, options, calculateOptionPrice]);

  useEffect(() => {
    const totalPerPerson = (currentExpenses || 0) + totalSelectedPrice;
    const groupTotal = totalPerPerson * Math.max(memberCount, 1);
    onScenarioChange(groupTotal, totalPerPerson);
  }, [totalSelectedPrice, memberCount, currentExpenses, onScenarioChange]);

  if (options.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base">{title}</CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="text-muted-foreground hover:text-foreground transition-colors">
                  <Info className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs">
                <p className="text-sm">
                  Select options to see how they affect your total trip budget.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <p className="text-xs text-muted-foreground">
          {description}
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {options.map((rankedOption) => {
          const { option } = rankedOption;
          const isSelected = selectedOptionIds.includes(option.id);
          const isFinalized = option.is_finalized;

          const ppTotal = calculateOptionPrice(rankedOption);
          const groupTotal = option.total_price ?? (ppTotal * Math.max(memberCount, 1));
          const unitPrice = option.price_per_day_pp ?? (option.price / Math.max(memberCount, 1));

          return (
            <div
              key={option.id}
              onClick={() => !hideSelectionIndicator && onSelectOption(option.id)}
              className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all ${hideSelectionIndicator ? "cursor-default" : "cursor-pointer"} ${isSelected
                ? "border-primary bg-primary/5"
                : isFinalized
                  ? "border-green-500 bg-green-50 hover:bg-green-100"
                  : "border-muted hover:border-muted-foreground/50 hover:bg-muted/50"
                }`}
            >
              <div className="flex items-center gap-3">
                {!hideSelectionIndicator && (
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? "border-primary bg-primary" : "border-muted-foreground/30"
                    }`}>
                    {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                )}
                <Label className="cursor-pointer">
                  <span className="font-medium flex items-center gap-2">
                    {option.title}
                    {isFinalized && (
                      <Badge variant="outline" className="text-green-700 border-green-500 gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Admin Pick
                      </Badge>
                    )}
                  </span>
                  <span className="text-xs text-muted-foreground block">
                    {rankedOption.vote_count} votes
                  </span>
                </Label>
              </div>

              <div className="flex-1 px-4 text-center hidden md:block">
                {option.check_in_date && (
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      {format(parseISO(option.check_in_date), "MMM d")}
                      {option.check_out_date && (
                        <> — {format(parseISO(option.check_out_date), "MMM d")}</>
                      )}
                    </span>
                    {option.check_in_date && option.check_out_date && (
                      <span className="text-[9px] font-bold text-muted-foreground/50 uppercase">
                        {Math.max(differenceInDays(parseISO(option.check_out_date), parseISO(option.check_in_date)), 1)} {Math.max(differenceInDays(parseISO(option.check_out_date), parseISO(option.check_in_date)), 1) === 1 ? 'night' : 'nights'}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="text-right">
                <p className={`font-bold ${isSelected ? "text-primary" : isFinalized ? "text-green-700" : ""}`}>
                  ${ppTotal.toFixed(2)}
                </p>
                <div className="flex flex-col text-[10px] text-muted-foreground leading-tight">
                  <p>
                    ${unitPrice.toFixed(2)} / Person / Night
                  </p>
                  <p>
                    Group: ${groupTotal.toFixed(0)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}

        {selectedOptionIds.length > 0 && (
          <div className="pt-3 border-t flex items-center justify-between">
            <span className="text-sm font-medium">Extra Scenario Total (/ Person)</span>
            <span className="font-bold text-primary">${totalSelectedPrice.toFixed(2)}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
