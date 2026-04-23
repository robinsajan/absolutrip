"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { notifications as notificationsApi } from "@/lib/api/endpoints";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell, Check } from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { Notification } from "@/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function NotificationModal() {
    const router = useRouter();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);

    const handleNotificationClick = (n: Notification) => {
        if (!n.is_read) {
            handleMarkAsRead(n.id);
        }
        if (n.path) {
            router.push(n.path);
            setIsOpen(false);
        }
    };

    const fetchNotifications = async () => {
        try {
            const res = await notificationsApi.list();
            setNotifications(res.notifications);
            setUnreadCount(res.unread_count);
        } catch (error) {
            console.error("Failed to fetch notifications", error);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchNotifications();
        }
    }, [isOpen]);

    // Initial fetch for unread count badge
    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000); // Check every 30 seconds
        return () => clearInterval(interval);
    }, []);

    const handleMarkAsRead = async (id: number) => {
        try {
            await notificationsApi.markAsRead(id);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            toast.error("Failed to mark as read");
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            await notificationsApi.markAllAsRead();
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            setUnreadCount(0);
            toast.success("All notifications marked as read");
        } catch (error) {
            toast.error("Failed to mark all as read");
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <button className="relative p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                    <Bell className="size-5" />
                    {unreadCount > 0 && (
                        <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-black text-white ring-2 ring-white dark:ring-slate-950">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </button>
            </DialogTrigger>
            <DialogContent className="p-0 border-none bg-white dark:bg-slate-900 overflow-hidden focus:outline-none">
                <div className="flex items-center justify-between p-6 border-b border-slate-50 dark:border-slate-800">
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 italic">
                        {unreadCount > 0 ? `${unreadCount} new notifications` : 'Notifications'}
                    </h3>
                    {unreadCount > 0 && (
                        <button
                            onClick={handleMarkAllAsRead}
                            className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline transition-all"
                        >
                            Read All
                        </button>
                    )}
                </div>
                <ScrollArea className="h-[450px] max-h-[60vh]">
                    {notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full p-20 text-center text-slate-400">
                            <Bell className="size-12 opacity-10 mb-4" />
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-50">No notifications yet</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-50 dark:divide-slate-800">
                            {notifications.map((n) => (
                                <div
                                    key={n.id}
                                    onClick={() => handleNotificationClick(n)}
                                    className={cn(
                                        "p-5 transition-all relative group",
                                        n.path && "cursor-pointer",
                                        !n.is_read ? "bg-primary/5" : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                                    )}
                                >
                                    <div className="flex items-start gap-4">
                                        <div className={cn(
                                            "size-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm transition-transform group-active:scale-90",
                                            n.type === 'announcement' ? "bg-amber-100 text-amber-600" :
                                                n.type === 'join_request' ? "bg-blue-100 text-blue-600" :
                                                    n.type === 'join_approved' ? "bg-emerald-100 text-emerald-600" :
                                                        n.type === 'join_rejected' ? "bg-red-100 text-red-600" :
                                                            "bg-slate-100 text-slate-600"
                                        )}>
                                            <span className="material-symbols-outlined text-xl">
                                                {n.type === 'announcement' ? 'campaign' :
                                                    n.type === 'join_request' ? 'person_add' :
                                                        n.type === 'join_approved' ? 'check_circle' :
                                                            n.type === 'join_rejected' ? 'cancel' :
                                                                'notifications'}
                                            </span>
                                        </div>
                                        <div className="flex-1 min-w-0 pr-6">
                                            <p className={cn(
                                                "text-[13px] leading-relaxed",
                                                !n.is_read ? "font-black text-slate-900 dark:text-white" : "font-medium text-slate-500 dark:text-slate-400"
                                            )}>
                                                {n.content}
                                            </p>
                                            <p className="text-[10px] font-black text-slate-400 uppercase mt-1.5 tracking-wider">
                                                {formatDistanceToNow(parseISO(n.created_at), { addSuffix: true })}
                                            </p>
                                        </div>
                                    </div>
                                    {!n.is_read && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleMarkAsRead(n.id);
                                            }}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-2 rounded-xl bg-white dark:bg-slate-800 shadow-xl border border-slate-100 dark:border-slate-700 text-primary transition-all hover:scale-110 active:scale-90"
                                            title="Mark as read"
                                        >
                                            <Check className="size-4" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
                <div className="p-4 bg-slate-50 dark:bg-slate-800/20 text-center">
                    <p className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em]">End of Notifications</p>
                </div>
            </DialogContent>
        </Dialog>
    );
}
