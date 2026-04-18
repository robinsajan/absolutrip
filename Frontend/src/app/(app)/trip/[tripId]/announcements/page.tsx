"use client";

import { useParams } from "next/navigation";
import { AnnouncementSection } from "@/components/announcements/AnnouncementSection";

export default function AnnouncementsPage() {
    const params = useParams();
    const tripId = params.tripId as string;

    return (
        <div className="px-5 py-3 pt-2 max-w-2xl mx-auto space-y-4 pb-24">
            <div className="flex flex-col gap-0.5 px-1">
                <h2 className="text-2xl font-black tracking-tight flex items-center gap-3 lowercase italic serif-title">
                    <span className="material-symbols-outlined text-primary text-2xl">campaign</span>
                    Announcements
                </h2>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.15em]">Important trip updates & news</p>
            </div>

            <AnnouncementSection tripId={tripId} />
        </div>
    );
}
