"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { announcements as announcementsApi, notifications as notificationsApi } from "@/lib/api/endpoints";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Megaphone,
  Trash2,
  Edit2,
  ThumbsUp,
  ThumbsDown,
  Plus,
  Send,
  X
} from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { Announcement } from "@/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function AnnouncementSection({ tripId }: { tripId: string }) {
  const { user, activeTrip } = useAppStore();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadIds, setUnreadIds] = useState<Set<string>>(new Set());
  const [newContent, setNewContent] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const isAdmin = activeTrip?.created_by === user?.id;

  const fetchAnnouncements = async () => {
    try {
      // Fetch both announcements and notifications
      const [annRes, notifRes] = await Promise.all([
        announcementsApi.list(tripId),
        notificationsApi.list()
      ]);

      setAnnouncements(annRes.announcements);

      // Find IDs of unread announcements from notifications
      const unreadAnnouncements = notifRes.notifications
        .filter((n: any) => n.type === 'announcement' && !n.is_read)
        .map((n: any) => n.related_id);
      setUnreadIds(new Set(unreadAnnouncements));

      // Mark all as read after identifying them
      if (notifRes.unread_count > 0) {
        await notificationsApi.markAllAsRead();
      }
    } catch (error) {
      toast.error("Failed to load announcements");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, [tripId]);

  const handleCreate = async () => {
    if (!newContent.trim()) return;
    try {
      await announcementsApi.create(tripId, newContent);
      setNewContent("");
      setIsAdding(false);
      fetchAnnouncements();
      toast.success("Announcement posted");
    } catch (error) {
      toast.error("Failed to post announcement");
    }
  };

  const handleUpdate = async () => {
    if (!editingId || !editContent.trim()) return;
    try {
      await announcementsApi.update(tripId, editingId, editContent);
      setEditingId(null);
      fetchAnnouncements();
      toast.success("Announcement updated");
    } catch (error) {
      toast.error("Failed to update announcement");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await announcementsApi.delete(tripId, deleteId);
      setDeleteId(null);
      fetchAnnouncements();
      toast.success("Announcement deleted");
    } catch (error) {
      toast.error("Failed to delete announcement");
    }
  };

  const handleReact = async (id: number, type: 'like' | 'dislike') => {
    try {
      await announcementsApi.react(tripId, id, type);
      fetchAnnouncements();
    } catch (error) {
      toast.error("Failed to react");
    }
  };

  if (loading) return <div className="p-4 text-center text-slate-400 text-xs">Loading announcements...</div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <div className="flex flex-col">
          {/* <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[10px]">campaign</span>
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Announcements</span>
          </div> */}
        </div>
        {isAdmin && !isAdding && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsAdding(true)}
            className="h-7 px-2 text-[9px] font-black uppercase tracking-widest text-primary hover:bg-primary/5 rounded-lg"
          >
            <Plus className="size-3 mr-1" />
            New
          </Button>
        )}
      </div>

      {isAdding && (
        <Card className="border-2 border-primary/20 bg-primary/5 rounded-2xl overflow-hidden animate-in fade-in slide-in-from-top-2">
          <CardContent className="p-3 space-y-3">
            <Textarea
              placeholder="What's the update?"
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              className="min-h-[100px] bg-white dark:bg-slate-900 border-none rounded-xl focus-visible:ring-1 focus-visible:ring-primary font-medium"
            />
            <div className="flex gap-2">
              <Button
                onClick={handleCreate}
                disabled={!newContent.trim()}
                className="flex-1 h-10 rounded-xl bg-primary text-white font-black text-[10px] uppercase tracking-wider"
              >
                <Send className="size-3 mr-2" />
                Post Announcement
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsAdding(false)}
                className="h-10 rounded-xl border-slate-200 text-slate-400"
              >
                <X className="size-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {announcements.length === 0 ? (
          <div className="p-8 text-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-3xl">
            <Megaphone className="size-8 text-slate-200 mx-auto mb-2 opacity-50" />
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No announcements yet</p>
          </div>
        ) : (
          announcements.map((a) => (
            <Card key={a.id} className={cn(
              "border transition-all duration-500 bg-white dark:bg-slate-900 rounded-2xl overflow-hidden overflow-visible py-0",
              unreadIds.has(String(a.id))
                ? "border-primary shadow-[0_0_20px_rgba(var(--primary),0.1)] ring-1 ring-primary/20"
                : "border-slate-200 dark:border-slate-800 shadow-sm"
            )}>
              <CardContent className="px-4 py-2.5 space-y-1.5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-1">
                    {editingId === a.id ? (
                      <div className="space-y-2">
                        <Textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="min-h-[80px] rounded-xl border-slate-200 focus:border-primary font-medium"
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={handleUpdate}
                            className="bg-primary text-white text-[10px] font-black uppercase h-8 px-4 rounded-lg"
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingId(null)}
                            className="text-slate-400 text-[10px] font-black uppercase h-8 px-4"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                          {a.content}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[9px] font-black text-primary uppercase tracking-wider">{a.creator_name}</span>
                          <span className="text-slate-300"></span>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">
                            {formatDistanceToNow(parseISO(a.created_at), { addSuffix: true })}
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  {isAdmin && editingId !== a.id && (
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingId(a.id);
                          setEditContent(a.content);
                        }}
                        className="size-7 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg"
                      >
                        <Edit2 className="size-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteId(a.id)}
                        className="size-7 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4 pt-1 border-t border-slate-50 dark:border-slate-800">
                  <button
                    onClick={() => handleReact(a.id, 'like')}
                    className={`flex items-center gap-1.5 transition-all active:scale-90 ${a.reactions.some(r => r.user_id === user?.id && r.type === 'like')
                      ? 'text-primary'
                      : 'text-slate-400 hover:text-slate-600'
                      }`}
                  >
                    <ThumbsUp className={`size-4 ${a.reactions.some(r => r.user_id === user?.id && r.type === 'like') ? 'fill-current' : ''}`} />
                    <span className="text-[10px] font-black">{a.reactions.filter(r => r.type === 'like').length}</span>
                  </button>
                  <button
                    onClick={() => handleReact(a.id, 'dislike')}
                    className={`flex items-center gap-1.5 transition-all active:scale-90 ${a.reactions.some(r => r.user_id === user?.id && r.type === 'dislike')
                      ? 'text-red-500'
                      : 'text-slate-400 hover:text-slate-600'
                      }`}
                  >
                    <ThumbsDown className={`size-4 ${a.reactions.some(r => r.user_id === user?.id && r.type === 'dislike') ? 'fill-current' : ''}`} />
                    <span className="text-[10px] font-black">{a.reactions.filter(r => r.type === 'dislike').length}</span>
                  </button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="rounded-[2rem] border-none">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Announcement?</AlertDialogTitle>
            <AlertDialogDescription>
              This message will be removed for all trip members. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl border-none font-bold uppercase text-[10px] tracking-widest">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold uppercase text-[10px] tracking-widest"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
