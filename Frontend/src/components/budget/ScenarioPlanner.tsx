"use client";

import { useEffect, useMemo } from "react";
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
  selectedOptionId: number | null;
  onSelectOption: (optionId: number) => void;
}

export function ScenarioPlanner({
  options,
  memberCount,
  currentExpenses,
  onScenarioChange,
  title = "What-If Planner",
  description = "Select an option to see how it affects your budget",
  selectedOptionId,
  onSelectOption,
}: ScenarioPlannerProps) {
  
  const selectedOption = useMemo(() => {
    return options.find((o) => o.option.id === selectedOptionId);
  }, [options, selectedOptionId]);

  useEffect(() => {
    const optionPrice = selectedOption?.option.price || 0;
    const total = currentExpenses + optionPrice;
    const perPerson = memberCount > 0 ? total / memberCount : total;
    onScenarioChange(total, perPerson);
  }, [selectedOptionId, selectedOption, memberCount, currentExpenses, onScenarioChange]);

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
                  Select a stay option to see how it affects your total trip budget. Only one option can be selected per day.
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
          const isSelected = selectedOptionId === option.id;
          const isFinalized = option.is_finalized;
          const perPerson = memberCount > 0 ? option.price / memberCount : option.price;

          return (
            <div
              key={option.id}
              onClick={() => onSelectOption(option.id)}
              className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-all ${
                isSelected 
                  ? "border-primary bg-primary/5" 
                  : isFinalized 
                    ? "border-green-500 bg-green-50 hover:bg-green-100" 
                    : "border-muted hover:border-muted-foreground/50 hover:bg-muted/50"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  isSelected ? "border-primary bg-primary" : "border-muted-foreground/30"
                }`}>
                  {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
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
              <div className="text-right">
                <p className={`font-medium ${isSelected ? "text-primary" : isFinalized ? "text-green-700" : ""}`}>
                  ${option.price.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">
                  ${perPerson.toFixed(2)}/person
                </p>
              </div>
            </div>
          );
        })}
        
        {selectedOption && (
          <div className="pt-3 border-t flex items-center justify-between">
            <span className="text-sm font-medium">Selected stay</span>
            <span className="font-bold text-primary">${selectedOption.option.price.toFixed(2)}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
