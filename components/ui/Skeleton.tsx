import React from "react";

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`animate-pulse rounded-btn bg-bg-elevated ${className}`}
      {...props}
    />
  );
}

export function VideoCardSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="aspect-video w-full" />
      <div className="flex gap-3 mt-1">
        <Skeleton className="w-9 h-9 rounded-full shrink-0" />
        <div className="flex flex-col gap-2 w-full">
          <Skeleton className="h-4 w-[90%]" />
          <Skeleton className="h-3.5 w-[60%]" />
        </div>
      </div>
    </div>
  );
}
