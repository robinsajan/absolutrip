"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SafeImageProps {
  src: string | null;
  alt: string;
  fallbackIcon?: any;
  className?: string;
  containerClassName?: string;
}

export function SafeImage({ 
  src, 
  alt, 
  fallbackIcon: Icon,
  className,
  containerClassName
}: SafeImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  return (
    <div className={cn("w-full h-full relative flex items-center justify-center overflow-hidden bg-slate-100 dark:bg-slate-800", containerClassName)}>
      {src && !hasError ? (
        <>
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-50/50 backdrop-blur-sm z-10 transition-opacity">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          )}
          <img
            src={src}
            alt={alt}
            className={cn(
              "w-full h-full object-cover transition-all duration-500",
              isLoading ? "opacity-0 scale-105" : "opacity-100 scale-100",
              className
            )}
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setHasError(true);
              setIsLoading(false);
            }}
          />
        </>
      ) : (
        <div className="flex flex-col items-center justify-center text-slate-400 opacity-20">
          {Icon ? <Icon className="size-10" /> : <span className="text-4xl font-bold">{alt.charAt(0).toUpperCase()}</span>}
        </div>
      )}
    </div>
  );
}
