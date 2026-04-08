"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerWithRangeProps {
    className?: string
    buttonClassName?: string
    date: DateRange | undefined
    setDate: (date: DateRange | undefined) => void
    placeholder?: string
}

export function DatePickerWithRange({
    className,
    buttonClassName,
    date,
    setDate,
    placeholder = "Pick a date",
}: DatePickerWithRangeProps) {
    const [open, setOpen] = React.useState(false);

    return (
        <div className={cn("grid gap-2", className)}>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        id="date"
                        variant={"outline"}
                        className={cn(
                            "w-full justify-start text-left font-normal h-12 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900",
                            buttonClassName,
                            !date && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date?.from ? (
                            date.to ? (
                                <>
                                    {format(date.from, "LLL dd, y")} -{" "}
                                    {format(date.to, "LLL dd, y")}
                                </>
                            ) : (
                                format(date.from, "LLL dd, y")
                            )
                        ) : (
                            <span>{placeholder}</span>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={date?.from}
                        selected={date}
                        onSelect={(range) => {
                            if (!range) {
                                setDate(undefined);
                                return;
                            }
                            
                            // Prevent mobile double-tap bug: if the start and end date are exactly the same,
                            // force it to stay in "waiting for end date" mode.
                            if (range.from && range.to && range.from.getTime() === range.to.getTime()) {
                                setDate({ from: range.from, to: undefined });
                                return;
                            }

                            setDate(range);

                            // Auto-close visually once a genuine, distinct range is completed.
                            if (range.from && range.to) {
                                setTimeout(() => setOpen(false), 50);
                            }
                        }}
                        numberOfMonths={2}
                        disabled={{ before: new Date(new Date().setHours(0, 0, 0, 0)) }}
                    />
                </PopoverContent>
            </Popover>
        </div>
    )
}
