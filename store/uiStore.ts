import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AccentPreset = "red" | "violet" | "blue" | "green" | "rose" | "orange" | "gold";
export type ThemeMode = "dark" | "light";

export const ACCENT_PRESETS: Record<
  AccentPreset,
  { color: string; hover: string; glow: string }
> = {
  red: { color: "#FF0000", hover: "#CC0000", glow: "rgba(255, 0, 0, 0.2)" },
  violet: { color: "#6C63FF", hover: "#8B84FF", glow: "rgba(108, 99, 255, 0.2)" },
  blue: { color: "#3B82F6", hover: "#60A5FA", glow: "rgba(59, 130, 246, 0.2)" },
  green: { color: "#10B981", hover: "#34D399", glow: "rgba(16, 185, 129, 0.2)" },
  rose: { color: "#F43F5E", hover: "#FB7185", glow: "rgba(244, 63, 94, 0.2)" },
  orange: { color: "#F97316", hover: "#FB923C", glow: "rgba(249, 115, 22, 0.2)" },
  gold: { color: "#F59E0B", hover: "#FBBF24", glow: "rgba(245, 158, 11, 0.2)" },
};

interface UIState {
  sidebarExpanded: boolean;
  toggleSidebar: () => void;
  setSidebarExpanded: (expanded: boolean) => void;
  accent: AccentPreset;
  setAccent: (accent: AccentPreset) => void;
  themeMode: ThemeMode;
  setThemeMode: (themeMode: ThemeMode) => void;
  // Advanced color options
  customAccentColor: string | null;
  setCustomAccentColor: (color: string | null) => void;
  // Notification system
  lastNotificationCheck: string | null;
  setLastNotificationCheck: (timestamp: string | null) => void;
  
  // Specific custom element colors
  logoColor: string;
  setLogoColor: (color: string) => void;
  watchNowColor: string;
  setWatchNowColor: (color: string) => void;
  videoTitleColor: string;
  setVideoTitleColor: (color: string) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarExpanded: true,
      toggleSidebar: () => set((state) => ({ sidebarExpanded: !state.sidebarExpanded })),
      setSidebarExpanded: (expanded) => set({ sidebarExpanded: expanded }),
      accent: "red",
      themeMode: "dark",
      customAccentColor: null,
      lastNotificationCheck: null,
      
      // Default colors (using YouTube Red defaults)
      logoColor: "#FF0000",
      watchNowColor: "#FF0000",
      videoTitleColor: "#F1F1F1",
      
      setAccent: (accent) => {
        const preset = ACCENT_PRESETS[accent];
        set({ 
          accent, 
          customAccentColor: null,
          logoColor: preset.color,
          watchNowColor: preset.color
        });
        if (typeof window !== "undefined") {
          const root = document.documentElement;
          root.style.setProperty("--accent", preset.color);
          root.style.setProperty("--accent-hover", preset.hover);
          root.style.setProperty("--accent-glow", preset.glow);
          root.style.setProperty("--color-logo", preset.color);
          root.style.setProperty("--color-watch-now", preset.color);
        }
      },
      setThemeMode: (themeMode) => {
        set({ themeMode });
        if (typeof window !== "undefined") {
          const root = document.documentElement;
          if (themeMode === "light") {
            root.classList.add("light");
            // Automatically adapt default video title color for light theme readability
            set((state) => {
              if (state.videoTitleColor === "#F0F0F8" || state.videoTitleColor === "#F1F1F1" || state.videoTitleColor === "#0F0F14" || !state.videoTitleColor) {
                root.style.setProperty("--color-video-title", "#000000");
                return { videoTitleColor: "#000000" };
              }
              return {};
            });
          } else {
            root.classList.remove("light");
            set((state) => {
              if (state.videoTitleColor === "#000000" || state.videoTitleColor === "#0F0F14" || state.videoTitleColor === "#F0F0F8" || !state.videoTitleColor) {
                root.style.setProperty("--color-video-title", "#F1F1F1");
                return { videoTitleColor: "#F1F1F1" };
              }
              return {};
            });
          }
        }
      },
      setCustomAccentColor: (color) => {
        set({ customAccentColor: color });
        if (typeof window !== "undefined" && color) {
          const root = document.documentElement;
          root.style.setProperty("--accent", color);
          root.style.setProperty("--accent-hover", color);
          root.style.setProperty("--accent-glow", `${color}33`); // 20% opacity hex
        }
      },
      setLastNotificationCheck: (timestamp) => {
        set({ lastNotificationCheck: timestamp });
      },
      
      setLogoColor: (color) => {
        set({ logoColor: color });
        if (typeof window !== "undefined") {
          document.documentElement.style.setProperty("--color-logo", color);
        }
      },
      setWatchNowColor: (color) => {
        set({ watchNowColor: color });
        if (typeof window !== "undefined") {
          document.documentElement.style.setProperty("--color-watch-now", color);
        }
      },
      setVideoTitleColor: (color) => {
        set({ videoTitleColor: color });
        if (typeof window !== "undefined") {
          document.documentElement.style.setProperty("--color-video-title", color);
        }
      },
    }),
    {
      name: "blinkup-ui-store",
    }
  )
);
