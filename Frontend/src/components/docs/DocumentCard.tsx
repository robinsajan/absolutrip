"use client";

import { FileText, Image as ImageIcon, File, Download, ExternalLink, Trash2, Tag, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import { Document } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { DocumentViewer } from "./DocumentViewer";

interface DocumentCardProps {
  document: Document;
  currentUserId?: number;
  onDelete?: (id: number) => void;
  isDeleting?: boolean;
}

export function DocumentCard({ document, currentUserId, onDelete, isDeleting }: DocumentCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  const fileCount = document.files.length;

  const getIcon = (type: string) => {
    if (type.startsWith("image/")) return <ImageIcon className="h-5 w-5 text-blue-500" />;
    if (type === "application/pdf") return <FileText className="h-5 w-5 text-red-500" />;
    return <File className="h-5 w-5 text-slate-500" />;
  };

  const handleDownload = (url: string) => {
    window.open(url, "_blank");
  };

  const handleView = (index: number) => {
    setViewerIndex(index);
    setIsViewerOpen(true);
  };

  return (
    <>
      <Card className="overflow-hidden border-slate-200 dark:border-slate-800 hover:shadow-md transition-all group">
        <CardContent >
          <div className="flex items-start justify-between ">
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-slate-900 dark:text-white truncate" title={document.title}>
                {document.title}
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {format(new Date(document.created_at), "MMM d, yyyy")}
              </p>
            </div>

            {onDelete && currentUserId === document.user_id && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "h-8 w-8 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all shrink-0",
                        isDeleting && "animate-pulse"
                      )}
                      onClick={() => onDelete(document.id)}
                      disabled={isDeleting}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Delete group</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>

          {document.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {document.tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="text-[9px] py-0 px-1.5 h-4 bg-slate-50 dark:bg-slate-800 text-slate-500 border-none font-bold"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* File List */}
          <div className={cn(
            "mt-3 space-y-1 transition-all overflow-hidden",
            !isExpanded && fileCount > 2 ? "max-h-24" : "max-h-[500px]"
          )}>
            {document.files.map((file, index) => (
              <div key={index} className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group/file">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="shrink-0">{getIcon(file.type)}</div>
                  <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300 truncate">
                    File {index + 1}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-slate-400 hover:text-primary hover:bg-white dark:hover:bg-slate-700"
                    onClick={() => handleView(index)}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-slate-400 hover:text-primary hover:bg-white dark:hover:bg-slate-700"
                    onClick={() => handleDownload(file.url)}
                  >
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {fileCount > 2 && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-1 h-7 text-slate-400 hover:text-primary rounded-lg text-[9px] font-bold uppercase tracking-wider"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? "Show Less" : `+ ${fileCount - 2} More`}
            </Button>
          )}
        </CardContent>
      </Card>

      <DocumentViewer
        isOpen={isViewerOpen}
        onClose={() => setIsViewerOpen(false)}
        files={document.files}
        title={document.title}
        initialIndex={viewerIndex}
      />
    </>
  );
}
