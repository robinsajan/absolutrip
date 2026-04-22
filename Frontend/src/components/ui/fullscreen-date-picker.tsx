"use client"

import * as React from "react"
import { format, differenceInDays, startOfDay, addMonths, addYears, startOfMonth } from "date-fns"
import { Calendar as CalendarIcon, X, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"
import { DateRange, DayPicker } from "react-day-picker"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Calendar } from "@/components/ui/calendar"

interface FullscreenDatePickerProps {
    date: DateRange | undefined
    onSelect: (date: DateRange | undefined) => void
    trigger?: React.ReactNode
    title?: string
    confirmText?: string
    minDate?: Date
    maxDate?: Date
}

export function FullscreenDatePicker({
    date,
    onSelect,
    trigger,
    title = "Select trip dates",
    confirmText = "Confirm",
    minDate = new Date(),
    maxDate,
}: FullscreenDatePickerProps) {
    const [open, setOpen] = React.useState(false)
    const [tempDate, setTempDate] = React.useState<DateRange | undefined>(date)
    const [currentMonth, setCurrentMonth] = React.useState<Date>(date?.from || new Date())

    React.useEffect(() => {
        if (open) {
            setTempDate(date)
            if (date?.from) setCurrentMonth(startOfMonth(date.from))
        }
    }, [open, date])

    const handleConfirm = () => {
        onSelect(tempDate)
        setOpen(false)
    }

    const nights = React.useMemo(() => {
        if (tempDate?.from && tempDate?.to) {
            return differenceInDays(tempDate.to, tempDate.from)
        }
        return 0
    }, [tempDate])

    const nextMonth = () => setCurrentMonth(prev => addMonths(prev, 1))
    const prevMonth = () => setCurrentMonth(prev => addMonths(prev, -1))
    const nextYear = () => setCurrentMonth(prev => addYears(prev, 1))
    const prevYear = () => setCurrentMonth(prev => addYears(prev, -1))

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button
                        variant="outline"
                        className={cn(
                            "w-full justify-start text-left font-normal h-12 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900",
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
                            <span>{title}</span>
                        )}
                    </Button>
                )}
            </DialogTrigger>

            {/*
              KEY FIX: Override ALL shadcn/radix Dialog positioning and sizing.
              - `!fixed !inset-0` forces it to cover the whole viewport
              - `!translate-x-0 !translate-y-0` removes the default centered transform
              - `!max-w-none !w-full !h-full` removes max-width constraints
              - `!rounded-none` removes rounded corners that expose background
              - `!p-0 !border-none` removes padding and border
            */}
            <DialogContent
                className="
                    !fixed !inset-0
                    !translate-x-0 !translate-y-0
                    !top-0 !left-0 !right-0 !bottom-0
                    !max-w-none !w-full !h-full
                    !rounded-none !p-0 !border-none
                    flex flex-col overflow-hidden
                "
                style={{
                    // Belt-and-suspenders: inline styles override any specificity wars
                    position: 'fixed',
                    inset: 0,
                    transform: 'none',
                    maxWidth: '100vw',
                    width: '100vw',
                    height: '100dvh',
                    borderRadius: 0,
                    padding: 0,
                    border: 'none',
                    margin: 0,
                }}
            >
                <div className="flex flex-col h-full bg-background">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-4 border-b">
                        <div className="w-10" />
                        <DialogTitle className="text-lg font-bold">{title}</DialogTitle>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 rounded-full"
                            onClick={() => setOpen(false)}
                        >
                            <X className="h-5 w-5 text-muted-foreground" />
                        </Button>
                    </div>

                    {/* Navigation Bar */}
                    <div className="flex items-center justify-between px-6 py-4 bg-slate-50 dark:bg-slate-900/50">
                        <div className="flex gap-2">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={prevYear}>
                                <ChevronsLeft className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={prevMonth}>
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                        </div>

                        <div className="text-center flex flex-col">
                            <span className="text-sm font-bold text-slate-900 dark:text-white leading-none">
                                {format(currentMonth, "yyyy")}
                            </span>
                            <span className="text-xs text-muted-foreground font-medium mt-1">
                                {format(currentMonth, "MMMM")} - {format(addMonths(currentMonth, 1), "MMMM")}
                            </span>
                        </div>

                        <div className="flex gap-2">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={nextMonth}>
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={nextYear}>
                                <ChevronsRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Calendar Area */}
                    <div className="flex-1 overflow-auto px-5 py-8 pb-64 bg-slate-50/20 dark:bg-slate-950">
                        <Calendar
                            mode="range"
                            selected={tempDate}
                            onDayClick={(day) => {
                                // Safety: Don't allow selecting disabled dates
                                if (minDate && startOfDay(day) < startOfDay(minDate)) return;
                                if (maxDate && startOfDay(day) > startOfDay(maxDate)) return;

                                if (!tempDate?.from || (tempDate.from && tempDate.to)) {
                                    setTempDate({ from: day, to: undefined })
                                } else {
                                    if (day < tempDate.from) {
                                        setTempDate({ from: day, to: tempDate.from })
                                    } else {
                                        setTempDate({ from: tempDate.from, to: day })
                                    }
                                }
                            }}
                            onSelect={() => { }}
                            month={currentMonth}
                            onMonthChange={setCurrentMonth}
                            numberOfMonths={2}
                            showOutsideDays={false}
                            disabled={[
                                minDate ? { before: minDate } : null,
                                maxDate ? { after: maxDate } : null,
                            ].filter(Boolean) as any}
                            className="w-full p-0"
                            classNames={{
                                root: "w-full",
                                months: "flex flex-col gap-14 w-full",
                                month: "w-full space-y-4",
                                head_row: "flex w-full mb-4 px-1 gap-4",
                                head_cell: "text-slate-500 font-medium text-[7px] w-full flex-1 text-center font-sans",
                                table: "w-full border-collapse",
                                row: "flex w-fit gap-4 mb-4 px-1",
                                cell: "relative p-0 text-center flex-shrink-0 w-[55px] min-h-[55px]",
                                day: cn(
                                    "h-[55px] w-[55px] p-0 font-bold text-[24px] flex items-center justify-center transition-all",
                                    "rounded-2xl bg-blue-50/50 border border-blue-100 text-slate-700 dark:bg-slate-900/40 dark:border-slate-800 dark:text-slate-300 shadow-sm"
                                ),
                                day_range_start: "!bg-blue-600 !border-blue-600 !text-white !opacity-100 shadow-md z-10",
                                day_range_end: "!bg-blue-600 !border-blue-600 !text-white !opacity-100 shadow-md z-10",
                                day_range_middle: "bg-blue-100/50 !border-blue-200/50 !rounded-none !text-blue-700 dark:bg-blue-900/30",
                                day_selected: "bg-blue-600 text-white",
                                day_today: "border-2 border-primary/30 font-bold",
                                day_outside: "opacity-0 pointer-events-none",
                                day_disabled: "opacity-10 bg-transparent border-transparent",
                                month_caption: "hidden",
                            }}
                            formatters={{
                                formatWeekdayName: (date) => format(date, "EEE"),
                            }}
                            components={{
                                MonthCaption: ({ calendarMonth }) => (
                                    <div className="text-center mb-6">
                                        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                                            {format(calendarMonth.date, "MMMM yyyy")}
                                        </h3>
                                    </div>
                                ),
                                Nav: () => <></>,
                            }}
                        />
                    </div>

                    {/* Footer */}
                    <div className="absolute bottom-0 inset-x-0 bg-slate-100/90 dark:bg-slate-900/90 backdrop-blur-md border-t p-4 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] flex flex-col gap-4 shadow-[0_-8px_30px_rgb(0,0,0,0.08)] z-50">
                        <div className="flex items-center justify-between px-2">
                            <div className="flex flex-col">
                                <span className="text-[10px] uppercase font-black text-slate-400 dark:text-slate-500 tracking-wider mb-1">Check-in</span>
                                <span className="text-[15px] font-black text-slate-800 dark:text-white">
                                    {tempDate?.from ? format(tempDate.from, "EEE, MMM d") : "—"}
                                </span>
                            </div>

                            <ChevronRight className="h-5 w-5 text-slate-300 animate-pulse" />

                            <div className="flex flex-col text-right">
                                <span className="text-[10px] uppercase font-black text-slate-400 dark:text-slate-500 tracking-wider mb-1">Check-out</span>
                                <span className="text-[15px] font-black text-slate-800 dark:text-white">
                                    {tempDate?.to ? format(tempDate.to, "EEE, MMM d") : "—"}
                                </span>
                            </div>
                        </div>

                        <Button
                            className="w-full h-14 rounded-2xl text-[16px] font-black shadow-xl bg-blue-600 hover:bg-blue-700 text-white transition-all active:scale-[0.98] disabled:opacity-50 disabled:grayscale"
                            onClick={handleConfirm}
                            disabled={!tempDate?.from || !tempDate?.to}
                        >
                            {tempDate?.from && tempDate?.to
                                ? `Confirm ${nights} night${nights !== 1 ? 's' : ''} selected`
                                : "Select trip dates"}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}