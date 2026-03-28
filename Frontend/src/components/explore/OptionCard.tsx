"use client";

import { ExternalLink, Trash2, Award, Calendar, Home, Utensils, Car, Ticket, CheckCircle2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { VoteButton } from "./VoteButton";
import { cn } from "@/lib/utils";
import { getOptionImages } from "@/lib/image";
import { SafeImage } from "@/components/common/SafeImage";
import type { RankedOption, OptionCategory } from "@/types";

interface OptionCardProps {
  rankedOption: RankedOption;
  memberCount: number;
  currentUserId?: number;
  onVote: (optionId: number, score: number) => Promise<void>;
  onDelete?: (optionId: number) => void;
  onFinalize?: (optionId: number) => void;
  onUnfinalize?: (optionId: number) => void;
  isTopRated?: boolean;
  isOwner?: boolean;
}

const CATEGORY_ICONS: Record<OptionCategory, React.ReactNode> = {
  stay: <Home className="h-3 w-3" />,
  activity: <Ticket className="h-3 w-3" />,
  food: <Utensils className="h-3 w-3" />,
  transport: <Car className="h-3 w-3" />,
};

const CATEGORY_COLORS: Record<OptionCategory, string> = {
  stay: "bg-blue-100 text-blue-800",
  activity: "bg-purple-100 text-purple-800",
  food: "bg-orange-100 text-orange-800",
  transport: "bg-green-100 text-green-800",
};

export function OptionCard({
  rankedOption,
  memberCount,
  currentUserId,
  onVote,
  onDelete,
  onFinalize,
  onUnfinalize,
  isTopRated,
  isOwner,
}: OptionCardProps) {
  const { option, total_score, vote_count, voters, rank } = rankedOption;
  const userVote = voters.find((v) => v.user_id === currentUserId);
  const pricePerPerson = memberCount > 0 ? option.price / memberCount : option.price;
  const canDelete = option.added_by === currentUserId;
  const imageUrls = getOptionImages(option);
  const imageUrl = imageUrls.length > 0 ? imageUrls[0] : null;
  const category = option.category || "stay";
  const isFinalized = option.is_finalized;

  const handleVote = async (score: number) => {
    await onVote(option.id, score);
  };

  const formatDateRange = () => {
    if (!option.check_in_date) return null;
    const checkIn = parseISO(option.check_in_date);
    const checkInStr = format(checkIn, "MMM d");
    if (option.check_out_date) {
      const checkOut = parseISO(option.check_out_date);
      return `${checkInStr} - ${format(checkOut, "MMM d")}`;
    }
    return checkInStr;
  };

  const dateRange = formatDateRange();

  const CATEGORY_ICONS_DATA: Record<OptionCategory, any> = {
    stay: Home,
    activity: Ticket,
    food: Utensils,
    transport: Car,
  };

  return (
    <Card
      className={cn(
        "overflow-hidden transition-all",
        isTopRated && "ring-2 ring-secondary",
        isFinalized && "ring-2 ring-green-500 bg-green-50/30"
      )}
    >
      <div className="relative h-40 bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center overflow-hidden">
        <SafeImage 
          src={imageUrl} 
          alt={option.title} 
          fallbackIcon={CATEGORY_ICONS_DATA[category]}
          className="group-hover:scale-110 transition-transform duration-700" 
        />
        
        <div className="absolute top-3 left-3 flex flex-wrap gap-1 z-20">
          {isFinalized && (
            <Badge className="bg-green-600 text-white">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Selected
            </Badge>
          )}
          {isTopRated && !isFinalized && (
            <Badge className="bg-secondary text-secondary-foreground">
              <Award className="h-3 w-3 mr-1" />
              Top Rated
            </Badge>
          )}
          {rank <= 3 && !isTopRated && !isFinalized && (
            <Badge variant="outline" className="bg-background/80">
              #{rank}
            </Badge>
          )}
          <Badge className={cn("flex items-center gap-1", CATEGORY_COLORS[category])}>
            {CATEGORY_ICONS[category]}
            {category.charAt(0).toUpperCase() + category.slice(1)}
          </Badge>
        </div>

        {dateRange && (
          <Badge variant="outline" className="absolute bottom-3 left-3 bg-background/90 flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {dateRange}
          </Badge>
        )}
      </div>

      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate">
              {option.link_title || option.title}
            </h3>
            {option.link_description && (
              <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                {option.link_description}
              </p>
            )}
            {option.link && (
              <a
                href={option.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline flex items-center gap-1 mt-1"
              >
                View details
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
          {canDelete && onDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={() => onDelete(option.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>

        {option.notes && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {option.notes}
          </p>
        )}

        <div className="flex items-center justify-between pt-2 border-t">
          <div>
            <p className="text-lg font-bold">${option.price?.toFixed(2) || "0.00"}</p>
            <p className="text-xs text-muted-foreground">
              ${pricePerPerson?.toFixed(2) || "0.00"}/person
            </p>
          </div>

          <div className="flex items-center gap-2">
            {isOwner && (
              isFinalized ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => onUnfinalize?.(option.id)}
                >
                  Unselect
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-green-600 border-green-200 hover:bg-green-50"
                  onClick={() => onFinalize?.(option.id)}
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Select
                </Button>
              )
            )}
            <VoteButton
              score={total_score}
              voteCount={vote_count}
              userVote={userVote?.score}
              onVote={handleVote}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
