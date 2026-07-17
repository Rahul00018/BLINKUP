"use client";

import React, { useState, useEffect } from "react";
import AppLayout from "../../components/layout/AppLayout";
import { useRouter } from "next/navigation";
import { YouTubeVideo } from "../../types/youtube";
import { formatCount, formatDuration } from "../../lib/utils";
import { Download, Trash2, Play } from "lucide-react";
import { useToast } from "../../hooks/useToast";

export default function DownloadsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [downloads, setDownloads] = useState<YouTubeVideo[]>([]);

  // Load downloads from local storage
  useEffect(() => {
    const stored = localStorage.getItem("blinkup_downloads");
    if (stored) {
      try {
        setDownloads(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse downloads list", e);
      }
    }
  }, []);

  const handleRemoveDownload = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = downloads.filter((v) => v.id !== id);
    setDownloads(updated);
    localStorage.setItem("blinkup_downloads", JSON.stringify(updated));
    toast("Video removed from downloads", "info");
  };

  const handlePlayVideo = (id: string) => {
    router.push(`/watch/${id}`);
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 pb-12 max-w-[1280px] mx-auto px-4 select-none">
        {/* Header Title */}
        <div className="flex items-center justify-between border-b border-border/40 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-600/10 rounded-2xl text-red-500 shadow-glow">
              <Download size={24} />
            </div>
            <div>
              <h1 className="font-display text-2xl font-black text-text-primary tracking-tight">
                Downloads
              </h1>
              <p className="text-xs text-text-secondary font-medium mt-0.5">
                {downloads.length} {downloads.length === 1 ? "video" : "videos"} saved offline
              </p>
            </div>
          </div>
        </div>

        {/* Downloads Feed */}
        {downloads.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {downloads.map((video) => (
              <div
                key={video.id}
                onClick={() => handlePlayVideo(video.id)}
                className="flex flex-col gap-2.5 group cursor-pointer relative"
              >
                {/* Thumbnail Wrapper */}
                <div className="relative aspect-video rounded-xl overflow-hidden border border-border/40 bg-bg-secondary shrink-0">
                  <img
                    src={video.thumbnailUrl}
                    alt={video.title}
                    className="w-full h-full object-cover group-hover:scale-[1.01] transition-transform duration-300"
                  />
                  <span className="absolute bottom-2 right-2 bg-black/85 text-[10px] px-1.5 py-0.5 rounded font-mono text-text-primary">
                    {formatDuration(video.duration)}
                  </span>

                  {/* Play Overlay */}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <div className="p-3 bg-red-600 rounded-full text-white shadow-glow">
                      <Play size={18} fill="currentColor" />
                    </div>
                  </div>

                  {/* Trash Icon for Removal */}
                  <button
                    onClick={(e) => handleRemoveDownload(video.id, e)}
                    className="absolute top-2 right-2 p-2 bg-black/70 hover:bg-red-600 rounded-full text-white hover:text-white transition-colors opacity-0 group-hover:opacity-100 transition-opacity z-20 shadow"
                    title="Remove from downloads"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* Metadata Column */}
                <div className="flex flex-col min-w-0 px-1">
                  <h4 className="font-display font-bold text-sm text-text-primary leading-snug line-clamp-2 group-hover:text-accent transition-colors">
                    {video.title}
                  </h4>
                  <span className="text-xs text-text-secondary mt-1 font-semibold truncate">
                    {video.channelName}
                  </span>
                  <div className="flex items-center gap-1.5 text-[10px] text-text-tertiary font-bold uppercase tracking-wider mt-0.5">
                    <span>{formatCount(video.viewCount)} views</span>
                    <span>•</span>
                    <span className="px-1.5 py-0.5 bg-green-500/10 text-green-500 rounded font-bold">
                      Offline
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="p-4 bg-bg-secondary border border-border/40 rounded-full text-text-tertiary mb-4">
              <Download size={40} />
            </div>
            <h3 className="font-display font-bold text-base text-text-primary">
              No offline downloads
            </h3>
            <p className="text-xs text-text-secondary max-w-sm mt-1 leading-relaxed font-normal">
              Videos you download will show up here. Open any video and click the Download button below the player.
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
