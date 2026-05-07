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
  onDelete?: (id: number) => void;
  isDeleting?: boolean;
}

export function DocumentCard({ document, onDelete, isDeleting }: DocumentCardProps) {
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
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <div className="size-12 rounded-xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              {fileCount > 1 ? <FileText className="h-6 w-6 text-primary" /> : getIcon(document.files[0]?.type || "")}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-bold text-slate-900 dark:text-white truncate" title={document.title}>
                  {document.title}
                </h3>
                {fileCount > 1 && (
                  <Badge variant="outline" className="text-[10px] h-5 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 shrink-0">
                    {fileCount} files
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Added by {document.user_name} • {format(new Date(document.created_at), "MMM d, yyyy")}
              </p>
              
              {document.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {document.tags.map((tag) => (
                    <Badge 
                      key={tag} 
                      variant="secondary" 
                      className="text-[10px] py-0 px-2 h-5 bg-primary/5 text-primary border-none flex items-center gap-1"
                    >
                      <Tag className="h-2.5 w-2.5" />
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* File List */}
          <div className={cn(
            "mt-4 space-y-2 transition-all overflow-hidden",
            !isExpanded && fileCount > 2 ? "max-h-24" : "max-h-[500px]"
          )}>
            {document.files.map((file, index) => (
              <div key={index} className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group/file">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="shrink-0">{getIcon(file.type)}</div>
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-300 truncate max-w-[120px]">
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
              className="w-full mt-2 h-8 text-slate-400 hover:text-primary rounded-lg text-[10px] font-bold uppercase tracking-wider"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <>Show Less <ChevronUp className="ml-1 h-3 w-3" /></>
              ) : (
                <>Show {fileCount - 2} More <ChevronDown className="ml-1 h-3 w-3" /></>
              )}
            </Button>
          )}
        </CardContent>
        
        {onDelete && (
          <CardFooter className="px-4 py-2 bg-slate-50/30 dark:bg-slate-900/30 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className={cn(
                      "h-8 w-8 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors",
                      isDeleting && "animate-pulse"
                    )}
                    onClick={() => onDelete(document.id)}
                    disabled={isDeleting}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Delete entire group</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardFooter>
        )}
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
