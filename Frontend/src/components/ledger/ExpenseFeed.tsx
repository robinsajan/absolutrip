"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Utensils, Car, Home, Sparkles, MoreHorizontal, Trash2, Pencil, Users, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Expense } from "@/types";

interface ExpenseFeedProps {
  expenses: Expense[];
  currentUserId?: number;
  onDelete?: (expenseId: number) => void;
  onEdit?: (expense: Expense) => void;
  memberCount?: number;
}

const categoryIcons: Record<string, React.ReactNode> = {
  food: <Utensils className="h-4 w-4" />,
  transport: <Car className="h-4 w-4" />,
  stay: <Home className="h-4 w-4" />,
  activity: <Sparkles className="h-4 w-4" />,
  other: <MoreHorizontal className="h-4 w-4" />,
};

const categoryColors: Record<string, string> = {
  food: "bg-orange-500",
  transport: "bg-blue-500",
  stay: "bg-purple-500",
  activity: "bg-green-500",
  other: "bg-gray-500",
};

export function ExpenseFeed({ expenses, currentUserId, onDelete, onEdit, memberCount }: ExpenseFeedProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (expenses.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No expenses yet</p>
        <p className="text-sm text-muted-foreground mt-1">
          Tap the + button to add an expense
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {expenses.map((expense) => {
        const canModify = expense.paid_by === currentUserId;
        const isExpanded = expandedId === expense.id;
        const isPartialSplit = memberCount && expense.splits.length < memberCount;

        return (
          <Card key={expense.id} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {getInitials(expense.payer_name)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">
                        <span className="text-primary">{expense.payer_name}</span>
                        {" paid "}
                        <span className="font-bold">${expense.amount.toFixed(2)}</span>
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {expense.description}
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      <span
                        className={cn(
                          "p-1.5 rounded text-white",
                          categoryColors[expense.category] || categoryColors.other
                        )}
                      >
                        {categoryIcons[expense.category] || categoryIcons.other}
                      </span>
                      {canModify && onEdit && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-primary"
                          onClick={() => onEdit(expense)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      {canModify && onDelete && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => onDelete(expense.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-2">
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(expense.created_at), {
                        addSuffix: true,
                      })}
                    </p>
                    
                    {expense.splits.length > 0 && (
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : expense.id)}
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Users className="h-3 w-3" />
                        <span>
                          {expense.splits.length} {expense.splits.length === 1 ? "person" : "people"}
                        </span>
                        {isPartialSplit && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                            Custom split
                          </Badge>
                        )}
                        {isExpanded ? (
                          <ChevronUp className="h-3 w-3" />
                        ) : (
                          <ChevronDown className="h-3 w-3" />
                        )}
                      </button>
                    )}
                  </div>

                  {isExpanded && expense.splits.length > 0 && (
                    <div className="mt-3 pt-3 border-t space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">Split breakdown:</p>
                      <div className="grid grid-cols-2 gap-2">
                        {expense.splits.map((split) => (
                          <div
                            key={split.id}
                            className="flex items-center justify-between text-sm bg-muted/50 rounded px-2 py-1"
                          >
                            <span className="truncate">{split.user_name || `User ${split.user_id}`}</span>
                            <span className="font-medium text-primary ml-2">
                              ${split.amount.toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
