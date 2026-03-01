"use client";

import { useState } from "react";
import { ArrowRight, Check, Copy, Info, Lightbulb } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { Settlement } from "@/types";

interface SettlementCardProps {
  settlement: Settlement;
  type: "pay" | "receive";
}

export function SettlementCard({
  settlement,
  type,
}: SettlementCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);

  const otherPerson = type === "pay" ? settlement.to_user_name : settlement.from_user_name;

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleCopyAmount = async () => {
    await navigator.clipboard.writeText(settlement.amount.toFixed(2));
    setCopied(true);
    toast.success("Amount copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <Card
        className={cn(
          "cursor-pointer hover:bg-accent/50 transition-colors",
          type === "pay" && "border-l-4 border-l-red-500",
          type === "receive" && "border-l-4 border-l-green-500"
        )}
        onClick={() => setShowDetails(true)}
      >
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12">
              <AvatarFallback
                className={cn(
                  type === "pay"
                    ? "bg-red-100 text-red-600"
                    : "bg-green-100 text-green-600"
                )}
              >
                {getInitials(otherPerson)}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <p className="font-medium">
                {type === "pay" ? "Pay" : "Receive from"}{" "}
                <span className="text-primary">{otherPerson}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                Tap to see payment details
              </p>
            </div>

            <div className="text-right">
              <p
                className={cn(
                  "text-xl font-bold",
                  type === "pay" ? "text-red-500" : "text-green-500"
                )}
              >
                ${settlement.amount.toFixed(2)}
              </p>
              <ArrowRight className="h-4 w-4 text-muted-foreground ml-auto" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {type === "pay" ? "Payment Details" : "Receiving Payment"}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="text-muted-foreground hover:text-foreground transition-colors">
                      <Info className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    <p className="text-sm">
                      This payment is calculated to minimize the total number of transactions needed to settle all debts in the group.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 pt-4">
            <div className="text-center">
              <Avatar className="h-20 w-20 mx-auto">
                <AvatarFallback
                  className={cn(
                    "text-2xl",
                    type === "pay"
                      ? "bg-red-100 text-red-600"
                      : "bg-green-100 text-green-600"
                  )}
                >
                  {getInitials(otherPerson)}
                </AvatarFallback>
              </Avatar>
              <p className="mt-3 font-medium text-lg">{otherPerson}</p>
              <p
                className={cn(
                  "text-3xl font-bold mt-2",
                  type === "pay" ? "text-red-500" : "text-green-500"
                )}
              >
                ${settlement.amount.toFixed(2)}
              </p>
            </div>

            <div className="bg-muted rounded-lg p-4 space-y-2">
              <p className="text-sm text-muted-foreground">
                {type === "pay"
                  ? "Send this amount to settle your debt"
                  : "You should receive this amount"}
              </p>
              <div className="flex items-center justify-between">
                <span className="font-mono text-lg">
                  ${settlement.amount.toFixed(2)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyAmount}
                >
                  {copied ? (
                    <Check className="h-4 w-4 mr-1" />
                  ) : (
                    <Copy className="h-4 w-4 mr-1" />
                  )}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
            </div>

            <div className="bg-blue-50 rounded-lg p-4 flex gap-3">
              <Lightbulb className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium">How this is calculated</p>
                <p className="mt-1 text-blue-600">
                  {type === "pay"
                    ? `${otherPerson} paid more than their share of expenses. This payment balances what you owe for expenses they covered.`
                    : `You paid more than your share of expenses. This payment is what ${otherPerson} owes you for expenses you covered.`}
                </p>
              </div>
            </div>

            {type === "pay" && (
              <Button className="w-full" size="lg" onClick={() => setShowDetails(false)}>
                Mark as Settled
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
