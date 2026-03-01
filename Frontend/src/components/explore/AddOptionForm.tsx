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
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import type { OptionCategory } from "@/types";

interface AddOptionFormProps {
  onSubmit: (data: {
    title: string;
    link: string;
    price: number;
    notes?: string;
    check_in_date?: string;
    check_out_date?: string;
    category?: OptionCategory;
  }) => Promise<{ option: { id: number } }>;
  onImageUpload?: (optionId: number, file: File) => Promise<void>;
  tripStartDate?: string;
  tripEndDate?: string;
  onCancel?: () => void;
}

const CATEGORIES: { value: OptionCategory; label: string; icon: React.ReactNode }[] = [
  { value: "stay", label: "Stay", icon: <Home className="h-4 w-4" /> },
  { value: "activity", label: "Activity", icon: <Ticket className="h-4 w-4" /> },
  { value: "food", label: "Food", icon: <Utensils className="h-4 w-4" /> },
  { value: "transport", label: "Transport", icon: <Car className="h-4 w-4" /> },
];

export function AddOptionForm({ onSubmit, onImageUpload, tripStartDate, tripEndDate, onCancel }: AddOptionFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [link, setLink] = useState("");
  const [price, setPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [checkInDate, setCheckInDate] = useState<Date | undefined>();
  const [checkOutDate, setCheckOutDate] = useState<Date | undefined>();
  const [category, setCategory] = useState<OptionCategory>("stay");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
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
    return !isDateInTripRange(date);
  };

  const resetForm = () => {
    setTitle("");
    setLink("");
    setPrice("");
    setNotes("");
    setCheckInDate(undefined);
    setCheckOutDate(undefined);
    setCategory("stay");
    setImageFile(null);
    setImagePreview(null);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image must be less than 5MB");
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
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
        check_in_date: checkInDate ? format(checkInDate, "yyyy-MM-dd") : undefined,
        check_out_date: checkOutDate ? format(checkOutDate, "yyyy-MM-dd") : undefined,
        category,
      });

      if (imageFile && onImageUpload && result?.option?.id) {
        try {
          await onImageUpload(result.option.id, imageFile);
        } catch {
          toast.error("Option created but image upload failed");
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
    <form onSubmit={handleSubmit} className="space-y-6">
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
          className="rounded-lg border-border bg-background px-4 py-3"
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
          className="rounded-lg border-border bg-background px-4 py-3"
        />
        <p className="text-xs text-muted-foreground">
          Will try to fetch title & image from link
        </p>
      </div>

      {/* Dates */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold text-foreground">Dates</Label>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    "w-full justify-start rounded-lg border-border bg-background px-4 py-3 text-left font-normal",
                    !checkInDate && "text-muted-foreground"
                  )}
                  disabled={isLoading}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {checkInDate ? format(checkInDate, "MMM d") : "Check-in (Select)"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={checkInDate}
                  onSelect={setCheckInDate}
                  disabled={isDateDisabled}
                  defaultMonth={tripDateRange?.start}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-1">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    "w-full justify-start rounded-lg border-border bg-background px-4 py-3 text-left font-normal",
                    !checkOutDate && "text-muted-foreground"
                  )}
                  disabled={isLoading}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {checkOutDate ? format(checkOutDate, "MMM d") : "Check-out (Select)"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={checkOutDate}
                  onSelect={setCheckOutDate}
                  disabled={(date) => {
                    if (isDateDisabled(date)) return true;
                    if (checkInDate && date < checkInDate) return true;
                    return false;
                  }}
                  defaultMonth={checkInDate || tripDateRange?.start}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      {/* Image Upload - Preview Card */}
      {imagePreview && (
        <div className="relative overflow-hidden rounded-xl border border-border bg-muted/30">
          <div className="aspect-video w-full">
            <img
              src={imagePreview}
              alt="Preview"
              className="h-full w-full object-cover"
            />
          </div>
          <div className="absolute bottom-4 left-4 rounded-lg bg-white/90 px-3 py-1.5 text-xs font-medium text-foreground">
            Stitch - Design with AI
          </div>
          <div className="space-y-1 p-4">
            <h3 className="font-bold text-foreground">{title || "Title Title"}</h3>
            <p className="text-2xl font-bold text-foreground">
              ${price || "12,450.00"}
            </p>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-0.5">
                ★★★★★
              </span>
              <span>{notes || "10 votons"}</span>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2 h-8 w-8 rounded-full bg-white/80 hover:bg-white"
            onClick={removeImage}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Image Upload Button */}
      {!imagePreview && (
        <div className="space-y-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
            onChange={handleImageSelect}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            className="w-full rounded-lg border-dashed border-border py-8"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
          >
            <Upload className="mr-2 h-5 w-5" />
            Upload Image
          </Button>
        </div>
      )}

      {/* Price */}
      <div className="space-y-2">
        <Label htmlFor="price" className="text-sm font-semibold text-foreground">
          Price (Total)
        </Label>
        <Input
          id="price"
          type="number"
          step="0.01"
          min="0"
          placeholder="0.00"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          disabled={isLoading}
          className="rounded-lg border-border bg-background px-4 py-3"
        />
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
          className="rounded-lg border-border bg-background px-4 py-3"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          className="flex-1 rounded-lg py-3 font-semibold"
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
          className="flex-1 rounded-lg bg-primary py-3 font-semibold text-primary-foreground hover:bg-primary/90"
          disabled={isLoading}
        >
          {isLoading ? "Creating..." : "Create Option"}
        </Button>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Learn more about voting
      </p>
    </form>
  );
}
