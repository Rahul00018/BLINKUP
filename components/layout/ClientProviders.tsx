"use client";

import React, { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastProvider } from "../../hooks/useToast";
import { AuthProvider } from "../auth/AuthProvider";
import { useUIStore, ACCENT_PRESETS } from "../../store/uiStore";

// Synchronize themes and colors from Zustand store to DOM root
function ThemeSync() {
  const { 
    themeMode, 
    accent, 
    customAccentColor, 
    logoColor, 
    watchNowColor, 
    videoTitleColor 
  } = useUIStore();

  useEffect(() => {
    const root = document.documentElement;
    
    // Apply theme class
    if (themeMode === "light") {
      root.classList.add("light");
    } else {
      root.classList.remove("light");
    }

    // Apply accent colors
    if (customAccentColor) {
      root.style.setProperty("--accent", customAccentColor);
      root.style.setProperty("--accent-hover", customAccentColor);
      root.style.setProperty("--accent-glow", `${customAccentColor}33`);
    } else if (ACCENT_PRESETS[accent]) {
      const preset = ACCENT_PRESETS[accent];
      root.style.setProperty("--accent", preset.color);
      root.style.setProperty("--accent-hover", preset.hover);
      root.style.setProperty("--accent-glow", preset.glow);
    }

    // Apply specific element custom colors
    root.style.setProperty("--color-logo", logoColor || "#6C63FF");
    root.style.setProperty("--color-watch-now", watchNowColor || "#6C63FF");
    root.style.setProperty("--color-video-title", videoTitleColor || (themeMode === "light" ? "#000000" : "#F1F1F1"));
  }, [themeMode, accent, customAccentColor, logoColor, watchNowColor, videoTitleColor]);

  return null;
}

export default function ClientProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes
            gcTime: 30 * 60 * 1000, // 30 minutes
            retry: 2,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <ThemeSync />
        <AuthProvider>{children}</AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}
