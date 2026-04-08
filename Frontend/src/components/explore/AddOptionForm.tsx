"use client";

import { useState, useRef, useMemo, useEffect } from "react";
import { Plus, Upload, X, Calendar, Home, Utensils, Car, Ticket, Globe } from "lucide-react";
import { toast } from "sonner";
import { format, parseISO, isWithinInterval, startOfDay, endOfDay, differenceInCalendarDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { options as optionsApi } from "@/lib/api/endpoints";
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
import { Textarea } from "@/components/ui/textarea";
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
    id?: number;
    title?: string;
    link?: string;
    price?: number;
    notes?: string;
    check_in_date?: string;
    check_out_date?: string;
    category?: OptionCategory;
    is_per_person?: boolean;
    is_per_night?: boolean;
    image_url?: string;
  };
  onCancel?: () => void;
}

const CATEGORIES: { value: OptionCategory | "other"; label: string; icon: React.ReactNode }[] = [
  { value: "stay", label: "Stay", icon: <Home className="h-4 w-4" /> },
  { value: "activity", label: "Activity", icon: <Ticket className="h-4 w-4" /> },
  // { value: "other", label: "Other", icon: <Plus className="h-4 w-4" /> },
];

export function AddOptionForm({ onSubmit, onImageUpload, tripStartDate, tripEndDate, defaultDate, initialData, onCancel }: AddOptionFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [title, setTitle] = useState(initialData?.title || "");
  const [link, setLink] = useState(initialData?.link || "");
  const [price, setPrice] = useState(initialData?.price?.toString() || "");
  const [notes, setNotes] = useState(initialData?.notes || "");
  const [dateSelection, setDateSelection] = useState<DateRange | undefined>({
    from: initialData?.check_in_date ? parseISO(initialData.check_in_date) : (defaultDate ? parseISO(defaultDate) : undefined),
    to: initialData?.check_out_date ? parseISO(initialData.check_out_date) : undefined,
  });

  const [category, setCategory] = useState<OptionCategory | "other">(initialData?.category || "stay");
  const [isPerPerson, setIsPerPerson] = useState(initialData?.is_per_person || false);
  const [isPerNight, setIsPerNight] = useState(initialData?.is_per_night || false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>(initialData?.image_url ? [initialData.image_url] : []);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tripDateRange = useMemo(() => {
    if (!tripStartDate || !tripEndDate) return null;
    return {
      start: startOfDay(parseISO(tripStartDate)),
      end: endOfDay(parseISO(tripEndDate)),
    };
  }, [tripStartDate, tripEndDate]);

  const shouldAutoSetStayDates = useMemo(() => {
    if (!tripStartDate || !tripEndDate) return false;
    // For very short trips (same-day or 1-night like today->tomorrow), don't ask for stay dates.
    const days = differenceInCalendarDays(parseISO(tripEndDate), parseISO(tripStartDate));
    return days <= 1;
  }, [tripStartDate, tripEndDate]);

  // Link Metadata Extraction
  useEffect(() => {
    const fetchMetadata = async () => {
      if (link && (link.includes("airbnb.com") || link.includes("booking.com") || link.includes("expedia.com")) && link.startsWith("http") && !title) {
        setIsExtracting(true);
        try {
          const metadata = await optionsApi.extract(link);
          if (metadata.link_title && !title) {
            setTitle(metadata.link_title);
          }
          if (metadata.image_url && imagePreviews.length === 0) {
            setImagePreviews([metadata.image_url]);
          }
          if (metadata.link_description && !notes) {
            setNotes(metadata.link_description);
          }
        } catch (err) {
          console.error("Failed to extract metadata:", err);
        } finally {
          setIsExtracting(false);
        }
      }
    };

    const timer = setTimeout(() => {
      fetchMetadata();
    }, 1000);

    return () => clearTimeout(timer);
  }, [link]);

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
        link: link,
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
        {/* Category Selection - Only show when creating */}
        {!initialData?.id && (
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-foreground">Category</Label>
            <div className="flex gap-2 flex-wrap">
              {CATEGORIES.map((cat) => (
                <Button
                  key={cat.value}
                  type="button"
                  variant={category === cat.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setCategory(cat.value);
                    setDateSelection({
                      from: initialData?.check_in_date ? parseISO(initialData.check_in_date) : (defaultDate ? parseISO(defaultDate) : undefined),
                      to: initialData?.check_out_date ? parseISO(initialData.check_out_date) : undefined,
                    });
                  }}
                  disabled={isLoading}
                  className="flex items-center gap-2 rounded-lg px-4 py-2"
                >
                  {cat.icon}
                  {cat.label}
                </Button>
              ))}
            </div>
          </div>
        )}

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
          {isExtracting && (
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary animate-pulse py-1">
              <span className="material-symbols-outlined text-xs animate-spin">refresh</span>
              Reading link details...
            </div>
          )}

        </div>

        {/* Dates component upgraded to DateRange - For stays and activities */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-foreground">
            {category === "stay" ? "Check-in / Check-out" : (category === "activity" ? "Activity Date" : "Date (Optional)")}
          </Label>

          {/* Mobile View: Inline Calendar (Ensures it 'shows up' and is selectable) */}
          <div className="md:hidden space-y-4">
            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 p-2 flex justify-center shadow-inner">
              {category === "stay" ? (
                <CalendarComponent
                  mode="range"
                  selected={dateSelection}
                  onSelect={setDateSelection}
                  disabled={isDateDisabled}
                  defaultMonth={dateSelection?.from || (tripDateRange?.start instanceof Date && !isNaN(tripDateRange.start.getTime()) ? tripDateRange.start : new Date())}
                  className="rounded-xl border-none"
                />
              ) : (
                <CalendarComponent
                  mode="single"
                  selected={dateSelection?.from}
                  onSelect={(date) => setDateSelection({ from: date, to: undefined })}
                  disabled={isDateDisabled}
                  defaultMonth={dateSelection?.from || (tripDateRange?.start instanceof Date && !isNaN(tripDateRange.start.getTime()) ? tripDateRange.start : new Date())}
                  className="rounded-xl border-none"
                />
              )}
            </div>
          </div>

          {/* Desktop View: Popover Calendar */}
          <div className="hidden md:block">
            <Popover modal={false}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    "w-full justify-start rounded-lg border-border bg-background px-4 py-6 text-left font-normal",
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
                    onSelect={setDateSelection}
                    disabled={isDateDisabled}
                    defaultMonth={dateSelection?.from || (tripDateRange?.start instanceof Date && !isNaN(tripDateRange.start.getTime()) ? tripDateRange.start : new Date())}
                    initialFocus
                    numberOfMonths={1}
                  />
                ) : (
                  <CalendarComponent
                    mode="single"
                    selected={dateSelection?.from}
                    onSelect={(date) => setDateSelection({ from: date, to: undefined })}
                    disabled={isDateDisabled}
                    defaultMonth={dateSelection?.from || (tripDateRange?.start instanceof Date && !isNaN(tripDateRange.start.getTime()) ? tripDateRange.start : new Date())}
                    initialFocus
                  />
                )}
              </PopoverContent>
            </Popover>
          </div>

          {dateSelection?.from && (
            <div className="bg-primary/5 rounded-xl border border-primary/10 p-3 flex items-center gap-3">
              <Calendar className="h-4 w-4 text-primary" />
              <p className="text-xs font-bold text-primary">
                {format(dateSelection.from, "MMM d, yyyy")}
                {category === "stay" && dateSelection.to && ` — ${format(dateSelection.to, "MMM d, yyyy")}`}
              </p>
            </div>
          )}
        </div>




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
          <Textarea
            id="notes"
            placeholder="Add any details, booking info, or reminders..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={isLoading}
            className="rounded-xl border-border bg-background px-4 py-3 resize-none min-h-[100px]"
            rows={3}
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
            {isLoading ? (initialData?.id ? "Updating..." : "Creating...") : (initialData?.id ? "Update Option" : "Create Option")}
          </Button>
        </div>


      </form>
    </div>
  );
}
