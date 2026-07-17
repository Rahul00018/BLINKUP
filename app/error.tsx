"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-6">
      <div className="max-w-md w-full flex flex-col items-center text-center gap-6">
        {/* Animated error icon */}
        <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center animate-pulse">
          <AlertTriangle size={36} className="text-red-400" />
        </div>

        <div className="flex flex-col gap-2">
          <h1 className="font-display text-2xl font-bold text-text-primary">
            Something Went Wrong
          </h1>
          <p className="text-sm text-text-secondary leading-relaxed">
            An unexpected error occurred. This is usually caused by a temporary
            issue — try refreshing the page.
          </p>
          {error?.message && (
            <p className="text-xs font-mono text-text-tertiary bg-bg-elevated border border-border rounded px-3 py-2 mt-2 text-left break-all">
              {error.message}
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <button
            onClick={reset}
            className="flex-1 flex items-center justify-center gap-2 bg-accent hover:bg-accent-hover text-text-primary font-semibold text-sm rounded-btn py-3 px-5 transition-colors cursor-pointer shadow-glow"
          >
            <RefreshCw size={16} />
            Try Again
          </button>
          <Link
            href="/"
            className="flex-1 flex items-center justify-center gap-2 bg-bg-secondary hover:bg-bg-elevated border border-border text-text-primary font-semibold text-sm rounded-btn py-3 px-5 transition-colors"
          >
            <Home size={16} />
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
