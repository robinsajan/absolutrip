"use client";

import { X, Download, ChevronLeft, ChevronRight, FileText, Image as ImageIcon, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DocumentViewerProps {
  isOpen: boolean;
  onClose: () => void;
  files: { url: string; type: string }[];
  title: string;
  initialIndex?: number;
}

export function DocumentViewer({
  isOpen,
  onClose,
  files,
  title,
  initialIndex = 0,
}: DocumentViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isLoading, setIsLoading] = useState(true);

  // Update currentIndex when initialIndex changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
      setIsLoading(true);
    }
  }, [isOpen, initialIndex]);

  const currentFile = files[currentIndex];
  if (!currentFile) return null;

  const isImage = currentFile.type.startsWith("image/");
  const isPdf = currentFile.type === "application/pdf";

  const next = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % files.length);
    setIsLoading(true);
  };
  
  const prev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + files.length) % files.length);
    setIsLoading(true);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-none w-full h-[100dvh] p-0 overflow-hidden border-none bg-slate-950 flex flex-col sm:max-w-[95vw] sm:h-[90vh] sm:rounded-3xl shadow-2xl">
        {/* Header - Safe area aware */}
        <div className="pt-[env(safe-area-inset-top)] bg-slate-900/50 backdrop-blur-md border-b border-white/10 z-50">
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="size-9 bg-white/10 rounded-xl flex items-center justify-center shrink-0">
                <FileText className="h-4 w-4 text-white" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-white text-sm font-bold truncate leading-tight">{title}</DialogTitle>
                {files.length > 1 && (
                  <p className="text-white/50 text-[10px] uppercase tracking-widest font-bold mt-0.5">
                    File {currentIndex + 1} of {files.length}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-white/70 hover:text-white hover:bg-white/10 rounded-full h-9 w-9"
                onClick={() => window.open(currentFile.url, "_blank")}
              >
                <Download className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-white/70 hover:text-white hover:bg-white/10 rounded-full h-9 w-9"
                onClick={onClose}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Viewer Content */}
        <div className="flex-1 relative flex items-center justify-center p-4 min-h-0 bg-slate-950">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <Loader2 className="h-8 w-8 text-white/20 animate-spin" />
            </div>
          )}

          {isImage ? (
            <img 
              src={currentFile.url} 
              alt={title}
              className="max-h-full max-w-full object-contain rounded-lg transition-all duration-300 shadow-2xl"
              onLoad={() => setIsLoading(false)}
              style={{ opacity: isLoading ? 0 : 1, transform: isLoading ? 'scale(0.95)' : 'scale(1)' }}
            />
          ) : isPdf ? (
            <iframe 
              src={`${currentFile.url}#toolbar=0`}
              className="w-full h-full rounded-lg bg-white transition-opacity duration-300"
              onLoad={() => setIsLoading(false)}
              style={{ opacity: isLoading ? 0 : 1 }}
            />
          ) : (
            <div className="flex flex-col items-center gap-4 text-white/50">
              <FileText className="h-16 w-16 opacity-20" />
              <p className="text-sm font-medium">Preview not available</p>
              <Button 
                variant="outline" 
                className="text-white border-white/20 hover:bg-white/10 rounded-xl px-6"
                onClick={() => window.open(currentFile.url, "_blank")}
              >
                Download to View
              </Button>
            </div>
          )}

          {/* Navigation Controls */}
          {files.length > 1 && (
            <>
              <div className="absolute inset-y-0 left-0 flex items-center pl-2 md:pl-6">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-10 md:size-12 bg-black/20 hover:bg-black/40 text-white rounded-full border border-white/10 backdrop-blur-md transition-all active:scale-90"
                  onClick={prev}
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
              </div>
              <div className="absolute inset-y-0 right-0 flex items-center pr-2 md:pr-6">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-10 md:size-12 bg-black/20 hover:bg-black/40 text-white rounded-full border border-white/10 backdrop-blur-md transition-all active:scale-90"
                  onClick={next}
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
              </div>
            </>
          )}
        </div>
        
        {/* Footer spacer for mobile home indicator */}
        <div className="h-[env(safe-area-inset-bottom)] bg-slate-950 shrink-0" />
      </DialogContent>
    </Dialog>
  );
}
