"use client";

import React, { useState } from "react";
import AppLayout from "../../components/layout/AppLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "../../lib/supabase";
import { useAuth } from "../../components/auth/AuthProvider";
import { useToast } from "../../hooks/useToast";
import { formatDuration, timeAgo } from "../../lib/utils";
import { History, Trash2, X, Search, Play, AlertCircle } from "lucide-react";
import { Skeleton } from "../../components/ui/Skeleton";
import Link from "next/link";

export default function HistoryPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const supabase = createClient();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");

  // 1. Fetch Watch History from Supabase
  const { data: historyItems = [], isLoading } = useQuery({
    queryKey: ["watchHistory", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("watch_history")
        .select("*")
        .order("watched_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // 2. Delete Single History Item Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("watch_history").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["watchHistory", user?.id] });
      toast("Video removed from history", "success");
    },
    onError: () => {
      toast("Failed to remove video", "error");
    },
  });

  // 3. Clear All History Mutation
  const clearAllMutation = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const { error } = await supabase
        .from("watch_history")
        .delete()
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["watchHistory", user?.id] });
      toast("Watch history cleared successfully!", "success");
    },
    onError: () => {
      toast("Failed to clear history", "error");
    },
  });

  const handleClearAll = () => {
    if (confirm("Are you sure you want to clear your entire watch history?")) {
      clearAllMutation.mutate();
    }
  };

  // Grouping Function
  const groupHistory = (items: any[]) => {
    const groups: Record<string, any[]> = {
      Today: [],
      Yesterday: [],
      "This Week": [],
      Earlier: [],
    };

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const oneWeekAgo = new Date(today);
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    items.forEach((item) => {
      const d = new Date(item.watched_at);
      const itemDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());

      if (itemDate.getTime() === today.getTime()) {
        groups.Today.push(item);
      } else if (itemDate.getTime() === yesterday.getTime()) {
        groups.Yesterday.push(item);
      } else if (d.getTime() > oneWeekAgo.getTime()) {
        groups["This Week"].push(item);
      } else {
        groups.Earlier.push(item);
      }
    });

    // Remove empty groups
    return Object.fromEntries(
      Object.entries(groups).filter(([_, val]) => val.length > 0)
    );
  };

  // Filter history by search query
  const filteredItems = historyItems.filter((item) =>
    item.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedHistory = groupHistory(filteredItems);

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 pb-12">
        {/* Header bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/40 pb-4">
          <div className="flex flex-col gap-1">
            <h1 className="font-display text-2xl font-bold">Watch History</h1>
            <p className="text-text-secondary text-sm">
              Keep track of videos you watched on BLINKUP
            </p>
          </div>

          {historyItems.length > 0 && (
            <button
              onClick={handleClearAll}
              className="bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/20 text-xs font-semibold uppercase tracking-wider px-4 py-2 rounded-btn transition-colors cursor-pointer flex items-center gap-2"
            >
              <Trash2 size={14} /> Clear History
            </button>
          )}
        </div>

        {/* Search Bar within History */}
        {historyItems.length > 0 && (
          <div className="relative max-w-md w-full">
            <Search
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary"
              size={16}
            />
            <input
              type="text"
              placeholder="Search in watch history..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-bg-secondary border border-border focus:border-accent rounded-btn pl-10 pr-4 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none transition-colors"
            />
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex flex-col gap-8">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="flex flex-col gap-4">
                <Skeleton className="h-4 w-24" />
                <div className="flex flex-col gap-4">
                  <div className="flex gap-4 p-2 bg-bg-secondary/40 border border-border/30 rounded-card animate-pulse">
                    <div className="w-40 aspect-video bg-bg-elevated rounded" />
                    <div className="flex-1 flex flex-col gap-2">
                      <div className="h-4 w-1/2 bg-bg-elevated rounded" />
                      <div className="h-3 w-1/4 bg-bg-elevated rounded" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && historyItems.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center max-w-sm mx-auto gap-4">
            <History size={48} className="text-text-tertiary" />
            <h3 className="font-display text-xl font-bold">No History Yet</h3>
            <p className="text-text-secondary text-sm font-medium">
              Videos you watch will be listed here, and you can resume them from where you left off.
            </p>
          </div>
        )}

        {/* Grouped History List */}
        {!isLoading && filteredItems.length > 0 && (
          <div className="flex flex-col gap-8 mt-2">
            {Object.entries(groupedHistory).map(([groupName, items]) => (
              <div key={groupName} className="flex flex-col gap-4">
                <h3 className="font-display font-bold text-base text-accent uppercase tracking-wider">
                  {groupName}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {items.map((item: any) => {
                    const percentWatched = item.duration_seconds
                      ? (item.progress_seconds / item.duration_seconds) * 100
                      : 0;

                    return (
                      <div
                        key={item.id}
                        className="bg-bg-secondary border border-border hover:border-border-hover p-4 rounded-card flex gap-4 transition-all group relative"
                      >
                        {/* Video Thumbnail with Progress Bar */}
                        <Link
                          href={`/watch/${item.video_id}`}
                          className="relative w-32 md:w-40 aspect-video rounded-btn overflow-hidden border border-border shrink-0"
                        >
                          <img
                            src={item.thumbnail_url}
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <Play size={18} fill="currentColor" className="text-white" />
                          </div>
                          {/* Duration tag */}
                          {item.duration_seconds > 0 && (
                            <span className="absolute bottom-1 right-1 bg-black/85 text-[9px] px-1 rounded text-text-primary">
                              {formatDuration(item.duration_seconds)}
                            </span>
                          )}
                          {/* Progress bar overlay */}
                          {percentWatched > 2 && (
                            <div className="absolute bottom-0 inset-x-0 h-1 bg-white/20">
                              <div
                                className="h-full bg-accent"
                                style={{ width: `${percentWatched}%` }}
                              />
                            </div>
                          )}
                        </Link>

                        {/* Metadata */}
                        <div className="flex-1 flex flex-col gap-1 min-w-0 pr-8">
                          <Link
                            href={`/watch/${item.video_id}`}
                            className="font-semibold text-sm text-text-primary hover:text-accent transition-colors line-clamp-2 leading-tight"
                          >
                            {item.title}
                          </Link>
                          <span className="text-xs text-text-secondary">
                            Watched {timeAgo(item.watched_at)}
                          </span>
                          {item.duration_seconds > 0 && (
                            <span className="text-[10px] text-text-tertiary">
                              Watched {Math.floor(percentWatched)}% (
                              {formatDuration(item.progress_seconds)} /{" "}
                              {formatDuration(item.duration_seconds)})
                            </span>
                          )}
                        </div>

                        {/* Delete single button */}
                        <button
                          onClick={() => deleteMutation.mutate(item.id)}
                          className="absolute top-4 right-4 text-text-secondary hover:text-red-400 p-1 hover:bg-bg-elevated rounded transition-colors cursor-pointer"
                          title="Remove from history"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
