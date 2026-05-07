"use client";

import { useState } from "react";
import { Upload, X, FileText, Loader2, Tag, Trash2, Files } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { documents as documentsApi } from "@/lib/api/endpoints";

interface DocumentUploadModalProps {
  tripId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function DocumentUploadModal({
  tripId,
  isOpen,
  onClose,
  onSuccess,
}: DocumentUploadModalProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      setFiles((prev) => [...prev, ...selectedFiles]);
      
      if (!title && selectedFiles.length > 0) {
        setTitle(selectedFiles[0].name.replace(/\.[^/.]+$/, ""));
      }
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      toast.error("Please select at least one file");
      return;
    }

    setIsUploading(true);
    try {
      await documentsApi.upload(tripId, {
        files,
        title,
        tags,
      });
      toast.success("Documents uploaded successfully!");
      onSuccess();
      handleClose();
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload documents");
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setFiles([]);
    setTitle("");
    setTags("");
    onClose();
  };

  const totalSize = files.reduce((acc, file) => acc + file.size, 0);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden border-none rounded-3xl">
        <div className="bg-primary p-8 text-white relative">
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute right-4 top-4 text-white/70 hover:text-white hover:bg-white/10 rounded-full"
            onClick={handleClose}
          >
            <X className="h-5 w-5" />
          </Button>
          <div className="size-12 bg-white/20 rounded-2xl flex items-center justify-center mb-4">
            <Files className="h-6 w-6" />
          </div>
          <DialogTitle className="text-2xl font-serif font-bold">Upload Documents</DialogTitle>
          <p className="text-white/70 text-sm mt-1">Select one or more files to store</p>
        </div>

        <div className="p-8 space-y-6 bg-white dark:bg-slate-950">
          <div className="space-y-4">
            <label 
              htmlFor="file-upload"
              className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors group"
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <div className="size-10 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <Upload className="h-5 w-5 text-slate-500" />
                </div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Click to add files</p>
                <p className="text-[10px] text-slate-400 mt-1">PDF, Images, etc. (Can select multiple)</p>
              </div>
              <input 
                id="file-upload" 
                type="file" 
                multiple 
                className="hidden" 
                onChange={handleFileChange} 
              />
            </label>

            {files.length > 0 && (
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1 scrollbar-thin">
                {files.map((file, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-primary/5 rounded-xl border border-primary/10">
                    <div className="size-8 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                      <FileText className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{file.name}</p>
                      <p className="text-[10px] text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7 text-slate-400 hover:text-red-500" 
                      onClick={() => removeFile(index)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="title" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Document Group Title</Label>
              <Input
                id="title"
                placeholder="e.g. Flight Tickets, Hotel Receipts"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="rounded-xl border-slate-200 dark:border-slate-800 focus:ring-primary focus:border-primary"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Tags (optional)</Label>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input
                  id="tags"
                  placeholder="ticket, id, hotel"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  className="pl-9 rounded-xl border-slate-200 dark:border-slate-800 focus:ring-primary focus:border-primary"
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="p-8 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 sm:justify-end">
          <Button variant="ghost" onClick={handleClose} disabled={isUploading} className="rounded-xl font-bold">
            Cancel
          </Button>
          <Button 
            onClick={handleUpload} 
            disabled={isUploading || files.length === 0 || !title}
            className="rounded-xl bg-primary hover:bg-primary/90 px-8 font-bold shadow-lg shadow-primary/20"
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              `Upload ${files.length > 1 ? `${files.length} Files` : "Document"}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
