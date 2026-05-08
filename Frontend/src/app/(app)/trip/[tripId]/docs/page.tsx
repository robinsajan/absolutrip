"use client";

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { 
  FileText, 
  Plus, 
  Search, 
  Tag as TagIcon,
  X,
  Loader2,
  FileQuestion,
  Files
} from "lucide-react";
import { documents as documentsApi } from "@/lib/api/endpoints";
import { useAuth } from "@/lib/hooks";
import { DocumentUploadModal } from "@/components/docs/DocumentUploadModal";
import { DocumentCard } from "@/components/docs/DocumentCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function DocsPage() {
  const params = useParams();
  const tripId = params.tripId as string;
  const { user } = useAuth();

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const { data, isLoading, mutate } = useSWR(
    tripId ? `docs-${tripId}` : null,
    () => documentsApi.list(tripId)
  );

  const { data: tagsData } = useSWR(
    tripId ? `docs-tags-${tripId}` : null,
    () => documentsApi.getTags(tripId)
  );

  const filteredDocs = useMemo(() => {
    if (!data?.documents) return [];

    return data.documents.filter((doc) => {
      const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTag = !selectedTag || doc.tags.includes(selectedTag);
      return matchesSearch && matchesTag;
    });
  }, [data, searchQuery, selectedTag]);

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this document group?")) return;

    setDeletingId(id);
    try {
      await documentsApi.delete(id);
      toast.success("Documents deleted");
      mutate();
    } catch (error) {
      toast.error("Failed to delete documents");
    } finally {
      setDeletingId(null);
    }
  };

  const clearFilters = () => {
    setSelectedTag(null);
    setSearchQuery("");
  };

  if (isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-12">
        <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
        <p className="text-slate-500 font-medium animate-pulse">Loading documents...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="size-10 bg-primary rounded-2xl flex items-center justify-center text-white shadow-lg shadow-primary/20">
              <Files className="h-5 w-5" />
            </div>
            <h1 className="text-3xl font-serif font-black text-slate-900 dark:text-white">Documents</h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 font-medium ml-1">
            Keep your travel essentials in one place
          </p>
        </div>
        <Button 
          onClick={() => setIsUploadModalOpen(true)}
          className="rounded-2xl bg-primary hover:bg-primary/90 text-white px-6 py-6 font-bold shadow-xl shadow-primary/20 transition-all active:scale-95 group"
        >
          <Plus className="mr-2 h-5 w-5 group-hover:rotate-90 transition-transform" />
          Add Files
        </Button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search documents..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11 h-12 rounded-2xl border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 focus:ring-primary"
            />
          </div>

          {(selectedTag || searchQuery) && (
            <Button 
              variant="ghost" 
              onClick={clearFilters}
              className="h-12 px-4 rounded-2xl text-slate-400 hover:text-red-500 hover:bg-red-50"
            >
              <X className="h-4 w-4 mr-2" />
              Clear Filters
            </Button>
          )}
        </div>

        {tagsData?.tags && tagsData.tags.length > 0 && (
          <>
            <Separator className="opacity-50" />
            <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-hide">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400 shrink-0">
                <TagIcon className="h-3 w-3" />
                Tags:
              </div>
              <div className="flex gap-2">
                {tagsData.tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant={selectedTag === tag ? "default" : "secondary"}
                    className={cn(
                      "cursor-pointer px-3 py-1 rounded-lg transition-all border-none font-bold",
                      selectedTag === tag 
                        ? "bg-primary text-white scale-105" 
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-primary/10 hover:text-primary"
                    )}
                    onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Docs Grid */}
      {filteredDocs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
          {filteredDocs.map((doc) => (
            <DocumentCard 
              key={doc.id} 
              document={doc} 
              currentUserId={user?.id}
              onDelete={handleDelete}
              isDeleting={deletingId === doc.id}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-[3rem] p-20 flex flex-col items-center justify-center text-center">
          <div className="size-20 bg-slate-50 dark:bg-slate-950 rounded-full flex items-center justify-center mb-6">
            <FileQuestion className="h-10 w-10 text-slate-300" />
          </div>
          <h2 className="text-2xl font-serif font-bold text-slate-900 dark:text-white">No documents found</h2>
          <p className="text-slate-500 max-w-xs mt-2">
            {searchQuery || selectedTag
              ? "Try adjusting your filters to find what you're looking for." 
              : "Upload your tickets, IDs, or receipts to keep them organized."}
          </p>
          {!searchQuery && !selectedTag && (
            <Button 
              variant="outline" 
              className="mt-8 rounded-2xl px-8"
              onClick={() => setIsUploadModalOpen(true)}
            >
              Upload Now
            </Button>
          )}
        </div>
      )}

      <DocumentUploadModal 
        tripId={tripId}
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={() => {
          mutate();
          setIsUploadModalOpen(false);
        }}
      />
    </div>
  );
}
