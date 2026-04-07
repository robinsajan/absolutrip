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

interface ExpenseDetailsProps {
    expense: Expense | null;
    isOpen: boolean;
    currentUserId?: number;
    onClose: () => void;
    onDelete?: (expenseId: number) => void;
}

export function ExpenseDetails({ expense, isOpen, onClose, currentUserId, onDelete }: ExpenseDetailsProps) {
    const [comments, setComments] = useState<ExpenseComment[]>([]);
    const [newComment, setNewComment] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

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
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent 
                side="bottom"
                className="w-full h-full sm:max-w-none p-0 flex flex-col border-none shadow-none z-[100]"
                showCloseButton={false}
            >
                <SheetHeader className="p-6 pb-4 border-b relative">
                    <div className="flex items-center justify-between mb-4 pr-10">
                        <Badge variant="outline" className="gap-1.5 capitalize font-black text-[10px] tracking-widest text-primary border-primary/20 bg-primary/5">
                            {splitTypeIcons[expense.split_type as keyof typeof splitTypeIcons] || <Hash className="h-3 w-3" />}
                            {expense.split_type} split
                        </Badge>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                <Calendar className="h-3 w-3" />
                                {format(new Date(expense.expense_date || expense.created_at), "MMM d, yyyy")}
                            </div>
                            {expense.paid_by === currentUserId && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all rounded"
                                    onClick={handleDelete}
                                    disabled={isDeleting}
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                            )}
                        </div>
                    </div>

                    <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-6 top-6 h-8 w-8 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 transition-all shadow-lg z-50 p-0"
                        onClick={onClose}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                    <SheetTitle className="text-3xl font-black italic tracking-tight text-slate-900 dark:text-white leading-tight">
                        {expense.description}
                    </SheetTitle>
                    <SheetDescription className="sr-only">
                        Details and breakdown for {expense.description}
                    </SheetDescription>
                    <div className="mt-4 flex items-center justify-between">
                        <div className="flex flex-col">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Amount</p>
                            <p className="text-2xl font-black text-primary">₹{expense.amount.toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Paid By</p>
                            <div className="flex items-center gap-2 justify-end">
                                <span className="text-sm font-bold text-slate-700">
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
                <div className="flex-1 overflow-hidden flex flex-col min-h-0 bg-slate-50/50 dark:bg-slate-900/50">
                    <ScrollArea className="flex-1">
                        <div className="p-6 space-y-8">
                            {/* Splits Section */}
                            <section className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                        <Users className="h-3.5 w-3.5" />
                                        Split Breakdown
                                    </h3>
                                    <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none text-[9px] font-black uppercase ring-1 ring-emerald-200">
                                        {expense.amount === expense.splits.reduce((sum, s) => sum + s.amount, 0) ? "Fully Allocated" : "Partial Allocation"}
                                    </Badge>
                                </div>

                                <div className="space-y-2">
                                    {expense.splits.map((split) => {
                                        const isPayer = split.user_name === expense.payer_name;
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
                                                            {isPayer && <span className="ml-1.5 text-[8px] font-black text-primary bg-primary/5 px-1 rounded uppercase tracking-tighter">Payer</span>}
                                                        </p>
                                                        <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tight">
                                                            {isPayer ? (split.user_id === currentUserId ? "Your share" : "Part of share") : "To be paid"}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm font-black text-slate-900 dark:text-white">₹{split.amount.toLocaleString()}</p>
                                                    <p className={cn(
                                                        "text-[9px] font-black uppercase tracking-widest",
                                                        isPayer ? "text-emerald-500" : "text-amber-500"
                                                    )}>
                                                        {isPayer ? "Settled" : "Pending"}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>

                            <Separator className="opacity-50" />

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
                        </div>
                    </ScrollArea>
                </div>

                {/* Receipt Section */}
                {expense.receipt_url && (
                    <div className="p-6 bg-muted/30 border-t">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="font-bold flex items-center gap-2">
                                <Paperclip className="h-4 w-4 text-primary" />
                                Receipt Vault
                            </h4>
                            <Button variant="outline" size="sm" asChild>
                                <a href={expense.receipt_url} target="_blank" rel="noopener noreferrer">
                                    <FileText className="h-4 w-4 mr-2" />
                                    View Full
                                </a>
                            </Button>
                        </div>
                        <div className="aspect-video relative rounded-xl overflow-hidden border bg-white group cursor-zoom-in">
                            <img
                                src={expense.receipt_url}
                                alt="Expense receipt"
                                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                            />
                        </div>
                    </div>
                )}
            </SheetContent>
        </Sheet>
    );
}
