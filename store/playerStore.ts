import { create } from "zustand";
import { YouTubeVideo } from "../types/youtube";

interface PlayerState {
  currentVideo: YouTubeVideo | null;
  queue: YouTubeVideo[];
  autoplayEnabled: boolean;
  theaterMode: boolean;
  playVideo: (video: YouTubeVideo, newQueue?: YouTubeVideo[]) => void;
  setQueue: (queue: YouTubeVideo[]) => void;
  addToQueue: (video: YouTubeVideo) => void;
  removeFromQueue: (videoId: string) => void;
  setAutoplayEnabled: (enabled: boolean) => void;
  setTheaterMode: (enabled: boolean) => void;
  nextVideo: () => YouTubeVideo | null;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentVideo: null,
  queue: [],
  autoplayEnabled: true,
  theaterMode: false,

  playVideo: (video, newQueue) => {
    set({ currentVideo: video });
    if (newQueue) {
      const filteredQueue = newQueue.filter((v) => v.id !== video.id);
      set({ queue: filteredQueue });
    }
  },

  setQueue: (queue) => set({ queue }),

  addToQueue: (video) => {
    const { queue } = get();
    if (!queue.find((v) => v.id === video.id)) {
      set({ queue: [...queue, video] });
    }
  },

  removeFromQueue: (videoId) => {
    const { queue } = get();
    set({ queue: queue.filter((v) => v.id !== videoId) });
  },

  setAutoplayEnabled: (enabled) => set({ autoplayEnabled: enabled }),
  setTheaterMode: (enabled) => set({ theaterMode: enabled }),

  nextVideo: () => {
    const { queue, autoplayEnabled } = get();
    if (queue.length === 0 || !autoplayEnabled) return null;

    const next = queue[0];
    set({
      currentVideo: next,
      queue: queue.slice(1),
    });
    return next;
  },
}));
