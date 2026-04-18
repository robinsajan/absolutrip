"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { notifications as notificationsApi } from "@/lib/api/endpoints";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell, Check, Trash2, X } from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { Notification } from "@/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function NotificationPopover() {
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
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <button className="relative p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                    <Bell className="size-5" />
                    {unreadCount > 0 && (
                        <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-black text-white ring-2 ring-white dark:ring-slate-950">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-900 overflow-hidden" align="end">
                <div className="flex items-center justify-between p-4 border-b border-slate-50 dark:border-slate-800">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Notifications</h3>
                    {unreadCount > 0 && (
                        <button
                            onClick={handleMarkAllAsRead}
                            className="text-[9px] font-black uppercase tracking-widest text-primary hover:underline transition-all"
                        >
                            Clear All
                        </button>
                    )}
                </div>
                <ScrollArea className="h-80">
                    {notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full p-8 text-center text-slate-400">
                            <Bell className="size-8 opacity-20 mb-2" />
                            <p className="text-[10px] font-bold uppercase tracking-widest">No notifications yet</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-50 dark:divide-slate-800">
                            {notifications.map((n) => (
                                <div
                                    key={n.id}
                                    onClick={() => handleNotificationClick(n)}
                                    className={cn(
                                        "p-4 transition-colors relative group",
                                        n.path && "cursor-pointer",
                                        !n.is_read ? "bg-primary/5" : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                                    )}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className={cn(
                                            "size-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm",
                                            n.type === 'announcement' ? "bg-amber-100 text-amber-600" :
                                                n.type === 'join_request' ? "bg-blue-100 text-blue-600" :
                                                    n.type === 'join_approved' ? "bg-emerald-100 text-emerald-600" :
                                                        n.type === 'join_rejected' ? "bg-red-100 text-red-600" :
                                                            "bg-slate-100 text-slate-600"
                                        )}>
                                            <span className="material-symbols-outlined text-base">
                                                {n.type === 'announcement' ? 'campaign' :
                                                    n.type === 'join_request' ? 'person_add' :
                                                        n.type === 'join_approved' ? 'check_circle' :
                                                            n.type === 'join_rejected' ? 'cancel' :
                                                                'notifications'}
                                            </span>
                                        </div>
                                        <div className="flex-1 min-w-0 pr-6">
                                            <p className={cn(
                                                "text-xs leading-relaxed",
                                                !n.is_read ? "font-bold text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400"
                                            )}>
                                                {n.content}
                                            </p>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">
                                                {formatDistanceToNow(parseISO(n.created_at), { addSuffix: true })}
                                            </p>
                                        </div>
                                    </div>
                                    {!n.is_read && (
                                        <button
                                            onClick={() => handleMarkAsRead(n.id)}
                                            className="absolute right-3 top-4 opacity-0 group-hover:opacity-100 p-1 rounded-lg bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 text-primary transition-all"
                                            title="Mark as read"
                                        >
                                            <Check className="size-3" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </PopoverContent>
        </Popover>
    );
}
