"use client";

import { useState, useRef, useMemo } from "react";
import { Plus, Upload, X, Calendar, Home, Utensils, Car, Ticket } from "lucide-react";
import { toast } from "sonner";
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import type { OptionCategory } from "@/types";
import { DateRange } from "react-day-picker";

interface AddOptionFormProps {
  onSubmit: (data: {
    title: string;
    link: string;
    price: number;
    notes?: string;
    check_in_date?: string;
    check_out_date?: string;
    category?: OptionCategory;
    is_per_person?: boolean;
    is_per_night?: boolean;
  }) => Promise<{ option: { id: number } }>;
  onImageUpload?: (optionId: number, file: File) => Promise<void>;
  tripStartDate?: string;
  tripEndDate?: string;
  defaultDate?: string;
  initialData?: {
    title?: string;
    link?: string;
    image_url?: string;
    notes?: string;
  };
  onCancel?: () => void;
}

const CATEGORIES: { value: OptionCategory | "other"; label: string; icon: React.ReactNode }[] = [
  { value: "stay", label: "Stay", icon: <Home className="h-4 w-4" /> },
  { value: "activity", label: "Activity", icon: <Ticket className="h-4 w-4" /> },
  { value: "other", label: "Other", icon: <Plus className="h-4 w-4" /> },
];

export function AddOptionForm({ onSubmit, onImageUpload, tripStartDate, tripEndDate, defaultDate, initialData, onCancel }: AddOptionFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [title, setTitle] = useState(initialData?.title || "");
  const [link, setLink] = useState(initialData?.link || "");
  const [price, setPrice] = useState("");
  const [notes, setNotes] = useState(initialData?.notes || "");
  const [dateSelection, setDateSelection] = useState<DateRange | undefined>({
    from: defaultDate ? parseISO(defaultDate) : undefined,
    to: undefined,
  });

  const [category, setCategory] = useState<OptionCategory | "other">("stay");
  const [isPerPerson, setIsPerPerson] = useState(false);
  const [isPerNight, setIsPerNight] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>(initialData?.image_url ? [initialData.image_url] : []);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tripDateRange = useMemo(() => {
    if (!tripStartDate || !tripEndDate) return null;
    return {
      start: startOfDay(parseISO(tripStartDate)),
      end: endOfDay(parseISO(tripEndDate)),
    };
  }, [tripStartDate, tripEndDate]);

  const isDateInTripRange = (date: Date) => {
    if (!tripDateRange) return true;
    return isWithinInterval(date, { start: tripDateRange.start, end: tripDateRange.end });
  };

  const isDateDisabled = (date: Date) => {
    const today = startOfDay(new Date());
    return !isDateInTripRange(date) || date < today;
  };

  const resetForm = () => {
    setTitle("");
    setLink("");
    setPrice("");
    setNotes("");
    setDateSelection({
      from: defaultDate ? parseISO(defaultDate) : undefined,
      to: undefined,
    });
    setCategory("stay");
    setIsPerPerson(false);
    setIsPerNight(false);
    setImageFiles([]);
    setImagePreviews([]);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length) {
      const validFiles = files.filter(f => f.size <= 5 * 1024 * 1024);
      if (validFiles.length < files.length) toast.error("Some images skipped (must be <5MB)");
      setImageFiles(prev => [...prev, ...validFiles]);
      validFiles.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreviews(prev => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Please enter a title");
      return;
    }

    if (!price || isNaN(Number(price)) || Number(price) <= 0) {
      toast.error("Please enter a valid price");
      return;
    }

    setIsLoading(true);
    try {
      const result = await onSubmit({
        title: title.trim(),
        link: link.trim(),
        price: Number(price),
        notes: notes.trim() || undefined,
        check_in_date: dateSelection?.from ? format(dateSelection.from, "yyyy-MM-dd") : undefined,
        check_out_date: dateSelection?.to ? format(dateSelection.to, "yyyy-MM-dd") : undefined,
        category: category === "other" ? undefined : category,
        is_per_person: isPerPerson,
        is_per_night: isPerNight,
      });

      if (imageFiles.length > 0 && onImageUpload && result?.option?.id) {
        for (const file of imageFiles) {
          try {
            await onImageUpload(result.option.id, file);
          } catch {
            toast.error("Option created but some images failed to upload");
            break;
          }
        }
      }

      toast.success("Option added!");
      resetForm();
      if (onCancel) onCancel();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || "Failed to add option");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Category Selection */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-foreground">Category</Label>
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map((cat) => (
              <Button
                key={cat.value}
                type="button"
                variant={category === cat.value ? "default" : "outline"}
                size="sm"
                onClick={() => setCategory(cat.value)}
                disabled={isLoading}
                className="flex items-center gap-2 rounded-lg px-4 py-2"
              >
                {cat.icon}
                {cat.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <Label htmlFor="title" className="text-sm font-semibold text-foreground">
            Title
          </Label>
          <Input
            id="title"
            placeholder="Enter title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={isLoading}
            className="rounded-lg border-border bg-background px-4 py-2"
          />
        </div>

        {/* Link */}
        <div className="space-y-2">
          <Label htmlFor="link" className="text-sm font-semibold text-foreground">
            Link
          </Label>
          <Input
            id="link"
            type="url"
            placeholder="e.g., booking.com/your-hotel"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            disabled={isLoading}
            className="rounded-lg border-border bg-background px-4 py-2"
          />

        </div>

        {/* Dates component upgraded to DateRange - For stays and activities */}
        {(category === "stay" || category === "activity") && (
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-foreground">
              {category === "stay" ? "Check-in / Check-out" : "Activity Date"}
            </Label>
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    "w-full justify-start rounded-lg border-border bg-background px-4 py-2 text-left font-normal",
                    !dateSelection?.from && "text-muted-foreground"
                  )}
                  disabled={isLoading}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {dateSelection?.from ? (
                    category === "stay" && dateSelection.to ? (
                      <>
                        {format(dateSelection.from, "MMM d")} - {format(dateSelection.to, "MMM d")}
                      </>
                    ) : (
                      format(dateSelection.from, "MMM d, yyyy")
                    )
                  ) : (
                    category === "stay" ? "Select check-in/out dates" : "Select activity date"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 z-[200]" align="start">
                {category === "stay" ? (
                  <CalendarComponent
                    mode="range"
                    selected={dateSelection}
                    onSelect={(range, selectedDay) => {
                      if (dateSelection?.from && dateSelection?.to) {
                        setDateSelection({ from: selectedDay, to: undefined });
                      } else {
                        setDateSelection(range);
                        if (range?.to) {
                          setIsCalendarOpen(false);
                        }
                      }
                    }}
                    disabled={isDateDisabled}
                    defaultMonth={dateSelection?.from || tripDateRange?.start}
                    initialFocus
                    numberOfMonths={1}
                  />
                ) : (
                  <CalendarComponent
                    mode="single"
                    selected={dateSelection?.from}
                    onSelect={(date) => {
                      setDateSelection({ from: date, to: undefined });
                      if (date) {
                        setIsCalendarOpen(false);
                      }
                    }}
                    disabled={isDateDisabled}
                    defaultMonth={dateSelection?.from || tripDateRange?.start}
                    initialFocus
                  />
                )}
              </PopoverContent>
            </Popover>
          </div>
        )}

        {/* Images Selection */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-foreground">Images</Label>

          {imagePreviews.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {imagePreviews.map((preview, idx) => (
                <div key={idx} className="relative aspect-video rounded-xl border border-border">
                  <img src={preview} alt={`Preview ${idx + 1}`} className="h-full w-full object-cover rounded-xl" />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1 h-6 w-6 rounded-full bg-white/80 hover:bg-white text-xs"
                    onClick={() => removeImage(idx)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
            multiple
            onChange={handleImageSelect}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            className="w-full rounded-lg border-dashed border-border py-4 text-xs"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
          >
            <Upload className="mr-2 h-4 w-4" />
            Upload Photo(s)
          </Button>
        </div>

        {/* Price */}
        <div className="space-y-2">
          <Label htmlFor="price" className="text-sm font-semibold text-foreground">
            Price {category !== "stay" ? (isPerPerson ? "(per person)" : "(Total)") : (isPerPerson && isPerNight ? "(per person / night)" : isPerPerson ? "(per person)" : isPerNight ? "(per night)" : "(Total)")}
          </Label>
          <div className="flex items-center gap-4">
            <Input
              id="price"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              disabled={isLoading}
              className="rounded-lg border-border bg-background px-4 py-2 w-1/2"
            />
            <div className="flex items-center gap-4 text-sm font-medium">
              <div className="flex items-center gap-1.5 cursor-pointer">
                <Checkbox
                  id="isPerPerson"
                  checked={isPerPerson}
                  onCheckedChange={(checked) => setIsPerPerson(!!checked)}
                  disabled={isLoading}
                />
                <Label htmlFor="isPerPerson" className="cursor-pointer">Per Person</Label>
              </div>
              {category === "stay" && (
                <div className="flex items-center gap-1.5 cursor-pointer">
                  <Checkbox
                    id="isPerNight"
                    checked={isPerNight}
                    onCheckedChange={(checked) => setIsPerNight(!!checked)}
                    disabled={isLoading}
                  />
                  <Label htmlFor="isPerNight" className="cursor-pointer">Per Night</Label>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes" className="text-sm font-semibold text-foreground">
            Notes (Optional)
          </Label>
          <Input
            id="notes"
            placeholder="Add any notes..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={isLoading}
            className="rounded-lg border-border bg-background px-4 py-2"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1 rounded-lg py-2 font-semibold"
            onClick={() => {
              resetForm();
              if (onCancel) onCancel();
            }}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="flex-1 rounded-lg bg-primary py-2 font-semibold text-primary-foreground hover:bg-primary/90"
            disabled={isLoading}
          >
            {isLoading ? "Creating..." : "Create Option"}
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Learn more about voting
        </p>
      </form>
    </div>
  );
}
