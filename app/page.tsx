"use client";

import React, { useState, useMemo } from "react";
import AppLayout from "../components/layout/AppLayout";
import { useSubscriptions } from "../hooks/useSubscriptions";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getChannelVideos, getLiveStreams, getVideosByIds } from "../lib/youtube";
import { YouTubeVideo } from "../types/youtube";
import VideoCard from "../components/video/VideoCard";
import { VideoCardSkeleton, Skeleton } from "../components/ui/Skeleton";
import { Play, Radio, Clock, Eye, AlertCircle, Bookmark, Flame, X } from "lucide-react";
import Link from "next/link";
import { formatCount, timeAgo } from "../lib/utils";
import { createClient } from "../lib/supabase";
import { useAuth } from "../components/auth/AuthProvider";
import { useToast } from "../hooks/useToast";

type FilterType = "all" | "videos" | "live" | "saved";
type SortType = "latest" | "most_viewed" | "oldest";

export default function HomeFeed() {
  const { user } = useAuth();
  const { subscriptions, isLoading: loadingSubs } = useSubscriptions();
  const [filter, setFilter] = useState<FilterType>("all");
  const [sort, setSort] = useState<SortType>("latest");
  const supabase = createClient();
  const avatarMap = useMemo(() => {
    return new Map(subscriptions.map((s) => [s.id, s.thumbnail_url]));
  }, [subscriptions]);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user's watch history for Continue Watching shelf (limited to 2 latest items)
  const { data: watchHistory } = useQuery({
    queryKey: ["recentWatchHistory", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("watch_history")
        .select("*")
        .order("watched_at", { ascending: false })
        .limit(2);
      return data || [];
    },
    enabled: !!user,
  });

  const handleRemoveFromHistory = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      const { error } = await supabase
        .from("watch_history")
        .delete()
        .eq("id", id);
      if (error) throw error;
      toast("Removed from watch history", "success");
      queryClient.invalidateQueries({ queryKey: ["recentWatchHistory", user?.id] });
    } catch (e) {
      toast("Failed to remove item", "error");
    }
  };

  // 1. Fetch channel videos and live streams
  const {
    data: feedData,
    isLoading: loadingFeed,
    error: feedError,
  } = useQuery({
    queryKey: ["homeFeed", subscriptions.map((s) => s.id)],
    queryFn: async () => {
      if (subscriptions.length === 0) {
        return { allVideos: [], channelMap: {}, liveStreams: [] };
      }

      // Fetch uploads videos in parallel
      const videoPromises = subscriptions.map(async (sub) => {
        try {
          const { videos } = await getChannelVideos(sub.id);
          return { channelId: sub.id, videos };
        } catch (e) {
          console.error(`Failed to load videos for ${sub.name}`, e);
          return { channelId: sub.id, videos: [] };
        }
      });

      // Fetch live streams in parallel
      const livePromises = subscriptions.map(async (sub) => {
        try {
          const live = await getLiveStreams(sub.id);
          return live;
        } catch (e) {
          return [];
        }
      });

      const [videoResults, liveResults] = await Promise.all([
        Promise.all(videoPromises),
        Promise.all(livePromises),
      ]);

      const liveStreams = liveResults.flat().filter((v) => v.isLive);
      const channelMap: Record<string, YouTubeVideo[]> = {};
      let allVideos: YouTubeVideo[] = [];

      videoResults.forEach((res) => {
        channelMap[res.channelId] = res.videos;
        allVideos = [...allVideos, ...res.videos];
      });

      // Sort by default: publishedAt DESC
      allVideos.sort(
        (a, b) =>
          new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      );

      return { allVideos, channelMap, liveStreams };
    },
    enabled: subscriptions.length > 0,
  });

  // 2. Fetch saved videos and hydrate details
  const { data: savedVideos = [], isLoading: loadingSaved } = useQuery({
    queryKey: ["savedVideosFeedData", user?.id],
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
    enabled: !!user && filter === "saved",
  });

  const getFilteredAndSortedVideos = () => {
    let list: YouTubeVideo[] = [];

    if (filter === "saved") {
      list = [...savedVideos];
    } else if (feedData) {
      if (filter === "live") {
        list = [...feedData.liveStreams];
      } else if (filter === "videos") {
        list = feedData.allVideos.filter((v) => !v.isLive);
      } else {
        list = [...feedData.allVideos];
      }
    }

    // Apply Sorting
    if (sort === "most_viewed") {
      list.sort((a, b) => b.viewCount - a.viewCount);
    } else if (sort === "oldest") {
      list.sort(
        (a, b) =>
          new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime()
      );
    } else {
      list.sort(
        (a, b) =>
          new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      );
    }

    return list;
  };

  const filteredVideos = getFilteredAndSortedVideos();
  const heroVideo = filteredVideos[0];
  const latestRowVideos = filteredVideos.slice(1, 13); // slice out hero

  const isLoading = loadingSubs || loadingFeed || (filter === "saved" && loadingSaved);

  return (
    <AppLayout>
      <div className="flex flex-col gap-8 pb-12">
        {/* Sorting & Filtering Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/40 pb-4 select-none">
          <div className="flex gap-2 flex-wrap">
            {(["all", "videos", "live", "saved"] as FilterType[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-1.5 text-xs font-bold rounded-full transition-colors cursor-pointer select-none border border-transparent ${
                  filter === f
                    ? "bg-text-primary text-bg-primary"
                    : "bg-bg-elevated text-text-primary hover:bg-bg-elevated/85"
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-text-secondary">Sort by</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortType)}
              className="bg-bg-secondary border border-border text-xs rounded-btn px-3 py-1.5 text-text-primary focus:outline-none focus:border-accent cursor-pointer"
            >
              <option value="latest">Latest</option>
              <option value="most_viewed">Most Viewed</option>
              <option value="oldest">Oldest</option>
            </select>
          </div>
        </div>

        {/* Loading Skeletons */}
        {isLoading && (
          <div className="flex flex-col gap-8">
            <div className="w-full h-80 rounded-card bg-bg-secondary animate-pulse" />
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <VideoCardSkeleton key={i} />
              ))}
            </div>
          </div>
        )}

        {/* Empty States */}
        {!isLoading && subscriptions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center max-w-md mx-auto gap-4">
            <AlertCircle size={48} className="text-accent" />
            <h3 className="font-display text-2xl font-bold">No Channels Added Yet</h3>
            <p className="text-text-secondary text-sm">
              Start building your custom feed! Search and subscribe to channels to watch their videos here.
            </p>
            <Link
              href="/subscriptions"
              className="bg-accent hover:bg-accent-hover text-text-primary font-semibold text-sm px-6 py-2.5 rounded-btn transition-colors mt-2 shadow-glow"
            >
              Add Channels
            </Link>
          </div>
        )}

        {!isLoading && subscriptions.length > 0 && filteredVideos.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center max-w-md mx-auto gap-4">
            <AlertCircle size={48} className="text-text-tertiary" />
            <h3 className="font-display text-xl font-bold">No Videos Found</h3>
            <p className="text-text-secondary text-sm">
              {filter === "saved"
                ? "You haven't saved any videos yet."
                : "No videos match the selected filters."}
            </p>
          </div>
        )}

        {/* Content */}
        {!isLoading && filteredVideos.length > 0 && (
          <>

            {/* Live Now Header Badge list (shown at top of ALL feed if active) */}
            {filter === "all" && feedData && feedData.liveStreams.length > 0 && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 border-b border-border/40 pb-2">
                  <Radio className="text-live animate-live" size={18} />
                  <h3 className="font-display text-lg font-bold tracking-wide uppercase">
                    Live Now
                  </h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {feedData.liveStreams.map((video) => (
                    <VideoCard key={video.id} {...video} />
                  ))}
                </div>
              </div>
            )}

            {/* Hero spotlight (Spotlight the newest/top video) */}
            {heroVideo && (
              <section className="relative w-full rounded-card border border-border overflow-hidden bg-bg-secondary group">
                <div
                  className="absolute inset-0 bg-cover bg-center blur-[60px] opacity-15 scale-105"
                  style={{ backgroundImage: `url(${heroVideo.thumbnailUrl})` }}
                />
                <div className="relative grid grid-cols-1 lg:grid-cols-5 p-6 md:p-8 gap-8 items-center z-10">
                  <div className="lg:col-span-3 flex flex-col gap-4">
                    <span className="bg-accent/15 border border-accent/30 text-accent text-[10px] font-semibold uppercase tracking-widest px-2.5 py-1 rounded-badge self-start flex items-center gap-1.5">
                      <Flame size={12} /> Spotlight
                    </span>
                    <h2 className="font-display text-2xl md:text-3xl font-bold leading-snug text-text-primary group-hover:text-accent transition-colors line-clamp-2">
                      {heroVideo.title}
                    </h2>
                    <p className="text-text-secondary text-sm line-clamp-2">
                      {heroVideo.description}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      <div className="w-10 h-10 rounded-full border border-border bg-bg-elevated flex items-center justify-center text-accent text-sm font-semibold overflow-hidden">
                        {heroVideo.channelAvatarUrl ? (
                          <img
                            src={heroVideo.channelAvatarUrl}
                            alt={heroVideo.channelName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          heroVideo.channelName.substring(0, 2).toUpperCase()
                        )}
                      </div>
                      <div className="flex flex-col">
                        <Link
                          href={`/channel/${heroVideo.channelId}`}
                          className="font-semibold text-xs text-text-primary hover:underline"
                        >
                          {heroVideo.channelName}
                        </Link>
                        <span className="text-[11px] text-text-secondary">
                          {heroVideo.isLive
                            ? "LIVE"
                            : `${formatCount(heroVideo.viewCount)} views • ${timeAgo(
                                heroVideo.publishedAt
                              )}`}
                        </span>
                      </div>
                    </div>
                    <Link
                      href={`/watch/${heroVideo.id}`}
                      style={{ backgroundColor: "var(--color-watch-now)" }}
                      className="hover:opacity-90 text-text-primary font-semibold text-sm rounded-btn py-3 px-6 mt-4 transition-all flex items-center justify-center gap-2 self-start cursor-pointer shadow-glow"
                    >
                      <Play size={16} fill="currentColor" /> Watch Now
                    </Link>
                  </div>

                  <Link
                    href={`/watch/${heroVideo.id}`}
                    className="lg:col-span-2 relative aspect-video rounded-card overflow-hidden border border-border group-hover:border-accent/40 shadow-glow transition-all"
                  >
                    <img
                      src={heroVideo.thumbnailUrl}
                      alt={heroVideo.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/35 flex items-center justify-center">
                      <div className="w-14 h-14 rounded-full bg-accent text-text-primary flex items-center justify-center shadow-glow">
                        <Play size={24} fill="currentColor" className="ml-1" />
                      </div>
                    </div>
                  </Link>
                </div>
              </section>
            )}

            {/* Horizontal scroll row of Latest Videos */}
            {latestRowVideos.length > 0 && (
              <section className="flex flex-col gap-4">
                <div className="flex items-center gap-2 border-b border-border/40 pb-2">
                  <Clock className="text-accent" size={18} />
                  <h3 className="font-display text-lg font-bold tracking-wide uppercase">
                    Latest Videos
                  </h3>
                </div>
                {/* Horizontal scroll slider */}
                <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-thin">
                  {latestRowVideos.map((video) => (
                    <div key={video.id} className="min-w-[280px] w-[300px] shrink-0">
                      <VideoCard {...video} channelAvatarUrl={avatarMap.get(video.channelId)} />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Per-channel rows (Only when "All" filter is active) */}
            {filter === "all" && feedData && (
              <div className="flex flex-col gap-10 mt-4">
                {subscriptions.map((channel) => {
                  const channelVideos = feedData.channelMap[channel.id] || [];
                  if (channelVideos.length === 0) return null;

                  return (
                    <section key={channel.id} className="flex flex-col gap-4">
                      {/* Row Header */}
                      <div className="flex items-center justify-between border-b border-border/40 pb-2">
                        <div className="flex items-center gap-3">
                          <img
                            src={channel.thumbnail_url}
                            alt={channel.name}
                            className="w-10 h-10 rounded-full border border-border object-cover"
                          />
                          <div className="flex flex-col">
                            <Link
                              href={`/channel/${channel.id}`}
                              className="font-display font-bold text-base hover:text-accent transition-colors"
                            >
                              {channel.name}
                            </Link>
                            <span className="text-[11px] text-text-secondary">
                              {formatCount(channel.subscriber_count)} subscribers
                            </span>
                          </div>
                        </div>
                        <Link
                          href={`/channel/${channel.id}`}
                          className="text-xs font-semibold text-accent hover:text-accent-hover transition-colors"
                        >
                          View All →
                        </Link>
                      </div>

                      {/* Video scroll list */}
                      <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-thin">
                        {channelVideos.slice(0, 8).map((video) => (
                          <div
                            key={video.id}
                            className="min-w-[280px] w-[300px] shrink-0"
                          >
                            <VideoCard {...video} channelAvatarUrl={avatarMap.get(video.channelId)} />
                          </div>
                        ))}
                      </div>
                    </section>
                  );
                })}
              </div>
            )}

            {/* General Grid layout (when viewing specific filters like Saved, Videos or Live search queries) */}
            {filter !== "all" && (
              <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {filteredVideos.map((video) => (
                  <VideoCard key={video.id} {...video} channelAvatarUrl={avatarMap.get(video.channelId)} />
                ))}
              </section>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
