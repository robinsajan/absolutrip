"use client";

import { useState, useEffect } from "react";
import {
    MessageSquare,
    History,
    Paperclip,
    Send,
    User,
    Clock,
    CheckCircle2,
    AlertCircle,
    FileText,
    TrendingUp,
    Percent,
    Hash
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
    onClose: () => void;
}

export function ExpenseDetails({ expense, isOpen, onClose }: ExpenseDetailsProps) {
    const [comments, setComments] = useState<ExpenseComment[]>([]);
    const [activities, setActivities] = useState<ExpenseActivity[]>([]);
    const [newComment, setNewComment] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<"comments" | "activity">("comments");

    useEffect(() => {
        if (expense && isOpen) {
            fetchDetails();
        }
    }, [expense, isOpen]);

    const fetchDetails = async () => {
        if (!expense) return;
        setIsLoading(true);
        try {
            const [commentsRes, activitiesRes] = await Promise.all([
                expensesApi.getComments(expense.id),
                expensesApi.getActivities(expense.id)
            ]);
            setComments(commentsRes.comments);
            setActivities(activitiesRes.activities);
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
            const res = await expensesApi.createComment(expense.id, newComment);
            setComments((prev) => [res.comment, ...prev]);
            setNewComment("");
            // Refresh activities to see the comment log
            const activitiesRes = await expensesApi.getActivities(expense.id);
            setActivities(activitiesRes.activities);
        } catch (err) {
            toast.error("Failed to add comment");
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
            <SheetContent className="sm:max-w-md flex flex-col h-full p-0">
                <SheetHeader className="p-6 pb-2">
                    <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary" className="gap-1.5 capitalize font-bold">
                            {splitTypeIcons[expense.split_type as keyof typeof splitTypeIcons] || <Hash className="h-3 w-3" />}
                            {expense.split_type} split
                        </Badge>
                        {expense.currency && expense.currency !== 'USD' && (
                            <Badge variant="outline" className="font-mono">
                                {expense.currency} • {expense.exchange_rate?.toFixed(4)}
                            </Badge>
                        )}
                    </div>
                    <SheetTitle className="text-2xl font-serif">{expense.description}</SheetTitle>
                    <SheetDescription className="flex items-center gap-2 text-primary font-bold text-lg">
                        ${expense.amount.toFixed(2)}
                        <span className="text-xs text-muted-foreground font-normal">
                            paid by {expense.payer_name}
                        </span>
                    </SheetDescription>
                </SheetHeader>

                <div className="px-6 py-4 space-y-6 flex-1 overflow-hidden flex flex-col">
                    {/* Action Tabs */}
                    <div className="flex bg-muted p-1 rounded-lg">
                        <button
                            onClick={() => setActiveTab("comments")}
                            className={cn(
                                "flex-1 flex items-center justify-center gap-2 py-1.5 text-sm font-bold rounded-md transition-all",
                                activeTab === "comments" ? "bg-white shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <MessageSquare className="h-4 w-4" />
                            Comments ({comments.length})
                        </button>
                        <button
                            onClick={() => setActiveTab("activity")}
                            className={cn(
                                "flex-1 flex items-center justify-center gap-2 py-1.5 text-sm font-bold rounded-md transition-all",
                                activeTab === "activity" ? "bg-white shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <History className="h-4 w-4" />
                            Audit Log
                        </button>
                    </div>

                    <div className="flex-1 overflow-hidden">
                        {activeTab === "comments" ? (
                            <div className="h-full flex flex-col">
                                <form onSubmit={handleAddComment} className="flex gap-2 mb-4">
                                    <Input
                                        placeholder="Add a thought..."
                                        value={newComment}
                                        onChange={(e) => setNewComment(e.target.value)}
                                        className="flex-1"
                                    />
                                    <Button type="submit" size="icon" disabled={!newComment.trim()}>
                                        <Send className="h-4 w-4" />
                                    </Button>
                                </form>

                                <ScrollArea className="flex-1 pr-4">
                                    <div className="space-y-4">
                                        {comments.length === 0 ? (
                                            <div className="text-center py-8 text-muted-foreground">
                                                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-20" />
                                                <p className="text-sm">No discussion yet</p>
                                            </div>
                                        ) : (
                                            comments.map((comment) => (
                                                <div key={comment.id} className="flex gap-3">
                                                    <Avatar className="h-8 w-8">
                                                        <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                                                            {comment.user_name?.slice(0, 2).toUpperCase()}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className="flex-1 bg-muted/50 rounded-2xl px-4 py-2">
                                                        <div className="flex justify-between items-baseline mb-1">
                                                            <span className="font-bold text-xs">{comment.user_name}</span>
                                                            <span className="text-[10px] text-muted-foreground">
                                                                {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm">{comment.content}</p>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </ScrollArea>
                            </div>
                        ) : (
                            <ScrollArea className="h-full pr-4">
                                <div className="space-y-6 relative before:absolute before:inset-0 before:left-4 before:w-0.5 before:bg-muted">
                                    {activities.map((activity) => (
                                        <div key={activity.id} className="flex gap-4 relative">
                                            <div className={cn(
                                                "size-8 rounded-full flex items-center justify-center z-10",
                                                activity.activity_type === 'created' ? "bg-green-100 text-green-600" :
                                                    activity.activity_type === 'updated' ? "bg-blue-100 text-blue-600" :
                                                        "bg-slate-100 text-slate-600"
                                            )}>
                                                {activity.activity_type === 'created' ? <CheckCircle2 className="h-4 w-4" /> :
                                                    activity.activity_type === 'updated' ? <Clock className="h-4 w-4" /> :
                                                        <MessageSquare className="h-4 w-4" />}
                                            </div>
                                            <div className="flex-1 pb-2">
                                                <p className="text-sm font-medium leading-none mb-1">
                                                    <span className="font-bold">{activity.user_name}</span> {activity.details}
                                                </p>
                                                <p className="text-[10px] text-muted-foreground">
                                                    {format(new Date(activity.created_at), "MMM d, HH:mm")}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        )}
                    </div>
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
