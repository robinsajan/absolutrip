"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { format, parseISO, addDays, differenceInDays } from "date-fns";
import { options as optionsApi } from "@/lib/api/endpoints";
import { FullPageLoader } from "@/components/common/FullPageLoader";
import { MapPin, Ticket, Home, ChevronRight, Route, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

function ItineraryGroup({ group }: { group: any }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="relative pl-12 space-y-4">
      {/* Group Marker / Toggle Button */}
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "absolute left-0 top-1 w-10 h-10 rounded-2xl flex items-center justify-center z-20 shadow-lg transition-all active:scale-90",
          isExpanded ? "bg-primary text-white shadow-primary/30" : "bg-white dark:bg-slate-800 text-primary border-2 border-primary/20 shadow-sm"
        )}
      >
        <div className="flex flex-col items-center leading-none">
          <span className="text-[9px] font-black uppercase">
            {group.startDay === group.endDay ? `D${group.startDay}` : `D${group.startDay}`}
          </span>
          {group.startDay !== group.endDay && (
            <span className="text-[7px] font-black opacity-60">-{group.endDay}</span>
          )}
        </div>
      </button>

      {/* Stay Info Header */}
      <div className="space-y-4" onClick={() => setIsExpanded(!isExpanded)} style={{ cursor: 'pointer' }}>
        <div className="flex items-center justify-between group/header">
          <div className="flex flex-col">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
              {group.startDay === group.endDay 
                ? format(group.days[0].date, "EEEE, MMM d") 
                : `${format(group.days[0].date, "MMM d")} - ${format(group.days[group.days.length-1].date, "MMM d")}`}
            </h3>
          </div>
          <ChevronDown className={cn("h-4 w-4 text-slate-300 transition-transform duration-300", isExpanded && "rotate-180 text-primary")} />
        </div>

        {group.stay ? (
          <div className={cn(
            "group relative p-4 rounded-3xl border-2 transition-all shadow-sm",
            isExpanded ? "bg-primary/5 border-primary/10" : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800"
          )}>
            <div className="flex items-start gap-4">
              <div className={cn(
                "mt-1 p-3 rounded-2xl transition-colors",
                isExpanded ? "bg-primary/10 text-primary" : "bg-slate-50 dark:bg-slate-800 text-slate-400"
              )}>
                <Home className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Finalized Homebase</p>
                  {isExpanded && <span className="px-2 py-0.5 bg-primary/10 text-primary text-[8px] font-black uppercase rounded-full">Active</span>}
                </div>
                <h4 className="text-base font-extrabold text-slate-900 dark:text-slate-100 truncate mt-1">
                  {group.stay.title}
                </h4>
                {isExpanded && group.stay.link && (
                  <a 
                    href={group.stay.link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-[10px] font-bold text-slate-400 hover:text-primary flex items-center gap-1.5 mt-2 transition-colors"
                  >
                    <MapPin className="h-3 w-3" />
                    View on Map
                  </a>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-3xl border-2 border-dashed border-slate-100 dark:border-slate-800 flex items-center justify-center bg-slate-50/50 dark:bg-slate-950/20">
            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest italic">Free-roaming period</p>
          </div>
        )}
      </div>

      {/* Daily Breakdown (Dropped content) */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="pl-2 pt-2 space-y-6">
              {group.days.map((day: any) => (
                <div key={day.dateStr} className="space-y-3 relative before:absolute before:-left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-50 dark:before:bg-slate-800/50">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 -ml-[19px] z-10" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{format(day.date, "EEEE")}</span>
                  </div>

                  {day.activities.length > 0 ? (
                    <div className="grid gap-2">
                      {day.activities.map((activity: any) => (
                        <div key={activity.id} className="group/activity relative p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 transition-all hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5">
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5 p-2 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-400 group-hover/activity:text-primary transition-colors">
                              <Ticket className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 group-hover/activity:text-primary/60 transition-colors">Activity</p>
                              <h4 className="text-sm font-extrabold text-slate-800 dark:text-slate-200 truncate mt-0.5">
                                {activity.title}
                              </h4>
                              {activity.notes && (
                                <p className="text-[10px] font-medium text-slate-500 mt-1 line-clamp-1 italic">
                                  &quot;{activity.notes}&quot;
                                </p>
                              )}
                            </div>
                            <ChevronRight className="h-4 w-4 text-slate-300 self-center" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 p-3 rounded-2xl border border-dashed border-slate-50 dark:border-slate-800/50">
                       <span className="material-symbols-outlined text-slate-200 text-sm">explore</span>
                       <span className="text-[9px] font-bold text-slate-200 uppercase tracking-widest">Free time / Not planned</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ItineraryPage() {
  const params = useParams();
  const tripId = params.tripId as string;

  const { data, isLoading } = useSWR(`itinerary-${tripId}`, () => optionsApi.getByDate(tripId));

  const itineraryGroups = useMemo(() => {
    if (!data?.trip_start || !data?.trip_end) return [];

    const start = parseISO(data.trip_start);
    const end = parseISO(data.trip_end);
    const totalDaysCount = differenceInDays(end, start) + 1;

    const allFinalizedStays = Array.from(new Map(
      data.options_by_date.flatMap(d => d.options.filter(opt => opt.category === 'stay' && opt.is_finalized))
      .map(item => [item.id, item])
    ).values());

    const allDays = [];
    for (let i = 0; i < totalDaysCount; i++) {
      const currentDate = addDays(start, i);
      const dateStr = format(currentDate, "yyyy-MM-dd");
      
      const dayOptions = data.options_by_date.find(d => d.date === dateStr)?.options || [];
      
      const currentStay = allFinalizedStays.find(s => {
        if (!s.check_in_date || !s.check_out_date) return false;
        const checkIn = parseISO(s.check_in_date);
        const checkOut = parseISO(s.check_out_date);
        return currentDate >= checkIn && currentDate < checkOut;
      });

      const activities = dayOptions.filter(opt => opt.category === 'activity');

      allDays.push({
        dayNumber: i + 1,
        date: currentDate,
        dateStr,
        stay: currentStay || null,
        activities
      });
    }

    const groups: any[] = [];
    if (allDays.length === 0) return [];

    let currentGroup: any = {
      stay: allDays[0].stay,
      days: [allDays[0]],
      startDay: 1,
      endDay: 1
    };

    for (let i = 1; i < allDays.length; i++) {
      const day = allDays[i];
      const sameStay = (day.stay === null && currentGroup.stay === null) || 
                      (day.stay !== null && currentGroup.stay !== null && day.stay.id === currentGroup.stay.id);

      if (sameStay) {
        currentGroup.days.push(day);
        currentGroup.endDay = day.dayNumber;
      } else {
        groups.push(currentGroup);
        currentGroup = {
          stay: day.stay,
          days: [day],
          startDay: day.dayNumber,
          endDay: day.dayNumber
        };
      }
    }
    groups.push(currentGroup);

    return groups;
  }, [data]);

  if (isLoading) return <FullPageLoader />;

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-6 pb-24">
      <div className="flex flex-col gap-0.5 px-1">
        <h2 className="text-2xl font-black tracking-tight flex items-center gap-3 lowercase italic serif-title">
          <Route className="h-7 w-7 text-primary" />
          Trip Itinerary
        </h2>
        <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.15em]">Your day-by-day plan</p>
      </div>

      <div className="space-y-10 relative before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100 dark:before:bg-slate-800 before:rounded-full">
        {itineraryGroups.map((group, idx) => (
          <ItineraryGroup key={idx} group={group} />
        ))}
      </div>

      {itineraryGroups.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
          <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-[2.5rem] flex items-center justify-center text-slate-300">
            <Route className="h-10 w-10" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-black tracking-tight text-slate-900 dark:text-white lowercase">no path found</h3>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest max-w-[200px]">Set trip dates to generate your itinerary</p>
          </div>
        </div>
      )}
    </div>
  );
}
