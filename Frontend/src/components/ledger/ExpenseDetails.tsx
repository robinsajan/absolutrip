"use client";

import { useState, useEffect } from "react";
import {
    MessageSquare,
    History,
    Paperclip,
    Send,
    User,
    Calendar,
    Clock,
    CheckCircle2,
    AlertCircle,
    FileText,
    TrendingUp,
    Percent,
    Hash,
    Receipt,
    Wallet,
    Users,
    Trash2,
    X
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { expenses as expensesApi } from "@/lib/api/endpoints";
import { toast } from "sonner";
import type { Expense, ExpenseComment, ExpenseActivity } from "@/types";
import { cn } from "@/lib/utils";
import { getReceiptUrl } from "@/lib/image";
import { useBackCloseController } from "@/lib/hooks/use-back-close";

interface ExpenseDetailsProps {
    expense: Expense | null;
    isOpen: boolean;
    currentUserId?: number;
    onClose: () => void;
    onDelete?: (expenseId: number) => void;
    urlKey?: string;
    urlValue?: string;
}

export function ExpenseDetails({ expense, isOpen, onClose, currentUserId, onDelete, urlKey, urlValue }: ExpenseDetailsProps) {
    const [comments, setComments] = useState<ExpenseComment[]>([]);
    const [newComment, setNewComment] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    
    // URL-synced state for the zoomed receipt
    const { open: isReceiptZoomed, onOpenChange: setIsReceiptZoomed } = useBackCloseController({
        urlKey: "viewReceipt",
        urlValue: expense?.id?.toString() || "true"
    });

    useEffect(() => {
        if (expense && isOpen) {
            fetchDetails();
        }
    }, [expense, isOpen]);

    const fetchDetails = async () => {
        if (!expense) return;
        setIsLoading(true);
        try {
            const commentsRes = await expensesApi.getComments(expense.trip_id, expense.id);
            setComments(commentsRes);
        } catch (err) {
            console.error("Failed to fetch details", err);
            toast.error("Failed to load details");
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!expense || !newComment.trim()) return;

        try {
            const res = await expensesApi.createComment(expense.trip_id, expense.id, newComment);
            setComments((prev) => [res, ...prev]);
            setNewComment("");
        } catch (err) {
            toast.error("Failed to add comment");
        }
    };

    const handleDelete = async () => {
        if (!expense || !onDelete) return;
        if (!window.confirm("Are you sure you want to delete this expense?")) return;
        
        setIsDeleting(true);
        try {
            await onDelete(expense.id);
            onClose();
        } catch (err) {
            toast.error("Failed to delete expense");
        } finally {
            setIsDeleting(false);
        }
    };

    if (!expense) return null;

    const splitTypeIcons = {
        equally: <Hash className="h-3 w-3" />,
        shares: <TrendingUp className="h-3 w-3" />,
        percentage: <Percent className="h-3 w-3" />,
        exact: <AlertCircle className="h-3 w-3" />
    };

    return (
        <Sheet open={isOpen} onOpenChange={onClose} urlKey={urlKey} urlValue={urlValue}>
            <SheetContent 
                side="bottom"
                className="w-full h-full sm:max-w-none p-0 flex flex-col border-none shadow-none z-[300] bg-white dark:bg-slate-950"
            >
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/30 via-primary to-primary/30 opacity-40 z-50 px-8" />
                <SheetHeader className="p-8 pb-8 border-b relative pt-[calc(2.5rem+env(safe-area-inset-top,0px))]">

                    {expense.paid_by === currentUserId && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-16 top-6 h-8 w-8 rounded-full bg-rose-50 dark:bg-rose-500/20 text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-500/30 transition-all shadow-sm z-50 p-0"
                            onClick={handleDelete}
                            disabled={isDeleting}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    )}

                    <div className="mb-4 pr-16">
                        <Badge variant="outline" className="gap-1.5 capitalize font-black text-[10px] tracking-widest text-primary border-primary/20 bg-primary/5">
                            {splitTypeIcons[expense.split_type as keyof typeof splitTypeIcons] || <Hash className="h-3 w-3" />}
                            {expense.split_type} split
                        </Badge>
                    </div>

                    <div className="flex items-start justify-between gap-4">
                        <SheetTitle className="text-3xl font-black italic tracking-tight text-slate-900 dark:text-white leading-tight">
                            {expense.description}
                        </SheetTitle>
                    </div>

                    <SheetDescription className="sr-only">
                        Details and breakdown for {expense.description}
                    </SheetDescription>

                    <div className="mt-8 grid grid-cols-3 gap-4">
                        <div className="flex flex-col gap-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Paid On</p>
                            <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
                                <Calendar className="h-3.5 w-3.5 text-primary" />
                                <span className="text-sm">{format(new Date(expense.expense_date || expense.created_at), "MMM d, yyyy")}</span>
                            </div>
                        </div>

                        <div className="flex flex-col gap-1 border-x border-slate-100 dark:border-white/5 px-4">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total</p>
                            <p className="text-xl font-black text-primary">₹{expense.amount.toLocaleString()}</p>
                        </div>

                        <div className="flex flex-col gap-1 text-right">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">By Member</p>
                            <div className="flex items-center gap-2 justify-end">
                                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                    {expense.paid_by === currentUserId ? "You" : expense.payer_name}
                                </span>
                                <Avatar className="h-6 w-6">
                                    <AvatarFallback className="text-[8px] bg-primary text-white font-black">
                                        {expense.payer_name.slice(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                            </div>
                        </div>
                    </div>

                </SheetHeader>
                <div className="flex-1 overflow-y-auto bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="p-6 pb-[calc(12rem+env(safe-area-inset-bottom,0px))] md:pb-12 space-y-8">
                            {/* Splits Section */}
                            <section className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                        <Users className="h-3.5 w-3.5" />
                                        Split Breakdown
                                    </h3>
                                </div>

                                <div className="space-y-2">
                                    {expense.splits.map((split) => {
                                        return (
                                            <div key={split.id} className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between group hover:border-primary/20 transition-all">
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-8 w-8">
                                                        <AvatarFallback className="text-[10px] bg-slate-100 text-slate-600 font-bold">
                                                            {split.user_name?.slice(0, 2).toUpperCase() || '??'}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-900 dark:text-white">
                                                            {split.user_id === currentUserId ? "You" : (split.user_name || `User ${split.user_id}`)}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm font-black text-slate-900 dark:text-white">₹{split.amount.toLocaleString()}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>

                            <Separator className="opacity-50" />

                            {/* Receipt Section */}
                            {expense.receipt_url && (
                                <>
                                    <section className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                                <Paperclip className="h-3.5 w-3.5" />
                                                Receipt Evidence
                                            </h3>
                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                className="h-7 text-[10px] font-black uppercase tracking-widest text-primary hover:text-primary hover:bg-primary/5" 
                                                onClick={() => setIsReceiptZoomed(true)}
                                            >
                                                View Full
                                            </Button>
                                        </div>
                                        <div 
                                            className="aspect-video relative rounded-3xl overflow-hidden border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm group cursor-zoom-in"
                                            onClick={() => setIsReceiptZoomed(true)}
                                        >
                                            <img
                                                src={getReceiptUrl(expense.receipt_url)}
                                                alt="Expense receipt"
                                                className="w-full h-full object-contain p-2 transition-transform group-hover:scale-105"
                                            />
                                        </div>
                                    </section>
                                    <Separator className="opacity-50" />
                                </>
                            )}

                            {/* Discussion Section */}
                            <section className="space-y-4">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                    <MessageSquare className="h-3.5 w-3.5" />
                                    Discussion
                                </h3>

                                <form onSubmit={handleAddComment} className="relative group">
                                    <Input
                                        placeholder="Type a message..."
                                        value={newComment}
                                        onChange={(e) => setNewComment(e.target.value)}
                                        className="h-12 pl-4 pr-12 rounded-2xl bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-800 focus:ring-primary/20 transition-all shadow-sm"
                                    />
                                    <Button
                                        type="submit"
                                        size="icon"
                                        disabled={!newComment.trim()}
                                        className="absolute right-1 top-1 h-10 w-10 rounded-xl bg-primary text-white hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
                                    >
                                        <Send className="h-4 w-4" />
                                    </Button>
                                </form>

                                <div className="space-y-4 pt-2">
                                    {comments.length === 0 ? (
                                        <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
                                            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-5 text-slate-900" />
                                            <p className="text-xs font-bold text-slate-300 uppercase tracking-widest italic">No thoughts yet</p>
                                        </div>
                                    ) : (
                                        comments.map((comment) => (
                                            <div key={comment.id} className="flex gap-3">
                                                <Avatar className="h-8 w-8 shrink-0">
                                                    <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-black">
                                                        {comment.user_name?.slice(0, 2).toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="flex-1 bg-white dark:bg-slate-800 rounded-2xl px-4 py-3 border border-slate-100 dark:border-slate-800 shadow-sm">
                                                    <div className="flex justify-between items-baseline mb-1">
                                                        <span className="font-black text-[10px] text-primary uppercase tracking-widest">{comment.user_name}</span>
                                                        <span className="text-[9px] font-bold text-slate-400">
                                                            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-relaxed">{comment.content}</p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </section>

                            {/* Full Screen Receipt Preview */}
                            {isReceiptZoomed && expense.receipt_url && (
                                <div 
                                    className="fixed inset-0 z-[600] bg-black/95 backdrop-blur-xl flex flex-col animate-in fade-in duration-300"
                                    onClick={() => setIsReceiptZoomed(false)}
                                >
                                    <div className="flex items-center justify-between p-6 pt-[calc(1.5rem+env(safe-area-inset-top,0px))]">
                                        <div className="flex flex-col">
                                            <h4 className="text-white font-black uppercase tracking-[0.2em] text-[10px]">Document Preview</h4>
                                            <p className="text-white/60 text-xs font-bold truncate max-w-[200px]">{expense.description}</p>
                                        </div>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="rounded-full bg-white/10 text-white hover:bg-white/20 transition-all h-10 w-10 p-0"
                                            onClick={() => setIsReceiptZoomed(false)}
                                        >
                                            <X className="h-5 w-5" />
                                        </Button>
                                    </div>
                                    <div className="flex-1 flex items-center justify-center p-4 md:p-12 mb-[env(safe-area-inset-bottom,0px)]">
                                        {expense.receipt_url.toLowerCase().endsWith('.pdf') ? (
                                            <iframe 
                                                src={getReceiptUrl(expense.receipt_url)}
                                                className="w-full h-full rounded-2xl border-none bg-white"
                                                title="Receipt PDF"
                                            />
                                        ) : (
                                            <img
                                                src={getReceiptUrl(expense.receipt_url)}
                                                alt="Receipt Full View"
                                                className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        )}
                                    </div>
                                    <div className="p-8 text-center bg-gradient-to-t from-black/50 to-transparent">
                                        <Button 
                                            variant="outline" 
                                            className="rounded-full bg-white/5 border-white/10 text-white hover:bg-white/10 font-bold uppercase tracking-widest text-[10px] h-12 px-8"
                                            asChild
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <a href={getReceiptUrl(expense.receipt_url)} target="_blank" rel="noopener noreferrer">
                                                Download Original
                                            </a>
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
