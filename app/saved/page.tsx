"use client";

import React from "react";
import AppLayout from "../../components/layout/AppLayout";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getVideosByIds } from "../../lib/youtube";
import { createClient } from "../../lib/supabase";
import { useAuth } from "../../components/auth/AuthProvider";
import { useToast } from "../../hooks/useToast";
import VideoCard from "../../components/video/VideoCard";
import { VideoCardSkeleton } from "../../components/ui/Skeleton";
import { Bookmark, AlertCircle, Trash2 } from "lucide-react";

export default function SavedVideosPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const supabase = createClient();
  const queryClient = useQueryClient();

  // Fetch saved video ids and hydrate metadata
  const { data: videos = [], isLoading } = useQuery({
    queryKey: ["savedVideosFullPage", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("saved_videos")
        .select("video_id")
        .order("saved_at", { ascending: false });

      if (error) throw error;
      const ids = data.map((v: any) => v.video_id);
      if (ids.length === 0) return [];

      return await getVideosByIds(ids);
    },
    enabled: !!user,
  });

  const handleClearSaved = async () => {
    if (!confirm("Are you sure you want to clear all saved videos?")) return;
    try {
      const { error } = await supabase
        .from("saved_videos")
        .delete()
        .eq("user_id", user?.id);

      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["savedVideosFullPage", user?.id] });
      toast("Saved videos cleared successfully!", "success");
    } catch (e) {
      toast("Failed to clear saved videos", "error");
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 pb-12">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-border/40 pb-4">
          <div className="flex flex-col gap-1">
            <h1 className="font-display text-2xl font-bold">Saved Videos</h1>
            <p className="text-text-secondary text-sm">
              Your bookmarks ({videos.length} videos)
            </p>
          </div>

          {videos.length > 0 && (
            <button
              onClick={handleClearSaved}
              className="bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/20 text-xs font-semibold uppercase tracking-wider px-4 py-2 rounded-btn transition-colors cursor-pointer flex items-center gap-2"
            >
              <Trash2 size={14} /> Clear All
            </button>
          )}
        </div>

        {/* Loading Skeletons */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <VideoCardSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && videos.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center max-w-sm mx-auto gap-4">
            <Bookmark size={48} className="text-text-tertiary" />
            <h3 className="font-display text-xl font-bold">No Saved Videos</h3>
            <p className="text-text-secondary text-sm font-medium">
              Click the three-dot menu on any video card to save it here for later.
            </p>
          </div>
        )}

        {/* Content */}
        {!isLoading && videos.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {videos.map((video) => (
              <VideoCard key={video.id} {...video} />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
