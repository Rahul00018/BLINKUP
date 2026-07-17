"use client";

import React, { useState, useEffect, Suspense } from "react";
import AppLayout from "../../components/layout/AppLayout";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { searchVideos, searchChannels } from "../../lib/youtube";
import VideoCard from "../../components/video/VideoCard";
import { VideoCardSkeleton } from "../../components/ui/Skeleton";
import { useSubscriptions } from "../../hooks/useSubscriptions";
import { formatCount } from "../../lib/utils";
import {
  Search as SearchIcon,
  Loader2,
  AlertCircle,
  Users,
  Video,
  Radio,
} from "lucide-react";
import Link from "next/link";

type FilterType = "all" | "videos" | "channels" | "live";

const FILTERS: { label: string; value: FilterType; icon: React.ElementType }[] = [
  { label: "All", value: "all", icon: SearchIcon },
  { label: "Videos", value: "videos", icon: Video },
  { label: "Channels", value: "channels", icon: Users },
  { label: "Live", value: "live", icon: Radio },
];

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryParam = searchParams.get("q") || "";

  const [inputVal, setInputVal] = useState(queryParam);
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const { isSubscribed, subscribe, unsubscribe } = useSubscriptions();

  useEffect(() => {
    setInputVal(queryParam);
    // Reset filter on new search
    setActiveFilter("all");
  }, [queryParam]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputVal.trim()) {
      router.push(`/search?q=${encodeURIComponent(inputVal.trim())}`);
    }
  };

  // Fetch search results with error handling
  const {
    data: results,
    isLoading,
    error,
    isFetching,
  } = useQuery({
    queryKey: ["searchResultsPage", queryParam, activeFilter],
    queryFn: async () => {
      if (!queryParam) return { videos: [], channels: [] };

      let videos: any[] = [];
      let channels: any[] = [];

      try {
        if (activeFilter === "all" || activeFilter === "videos") {
          const vidData = await searchVideos(queryParam, { maxResults: 20 });
          videos = vidData.videos || [];
        }
        if (activeFilter === "all" || activeFilter === "channels") {
          channels = await searchChannels(queryParam, 6);
        }
        if (activeFilter === "live") {
          const vidData = await searchVideos(queryParam, {
            isLive: true,
            maxResults: 20,
          });
          videos = vidData.videos || [];
        }
      } catch (err: any) {
        console.error("Search error:", err);
        throw new Error(
          err?.message || "Failed to fetch search results. Please try again."
        );
      }

      return { videos, channels };
    },
    enabled: !!queryParam,
    retry: 1,
  });

  const hasResults =
    results &&
    (results.videos.length > 0 || results.channels.length > 0);

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 pb-12 max-w-6xl">
        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="max-w-2xl w-full flex gap-2">
          <div className="relative flex-1">
            <SearchIcon
              className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none"
              size={18}
            />
            <input
              type="text"
              placeholder="Search channels or videos..."
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              className="w-full bg-bg-secondary border border-border focus:border-accent rounded-btn pl-12 pr-4 py-3 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none transition-colors"
              autoComplete="off"
            />
          </div>
          <button
            type="submit"
            style={{ backgroundColor: "var(--color-watch-now)" }}
            className="hover:opacity-90 text-text-primary text-sm font-semibold rounded-btn px-6 py-3 transition-all cursor-pointer shadow-glow"
          >
            Search
          </button>
        </form>

        {/* Filter Chips */}
        {queryParam && (
          <div className="flex gap-2 flex-wrap border-b border-border/40 pb-4">
            {FILTERS.map(({ label, value, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setActiveFilter(value)}
                className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-btn transition-all cursor-pointer ${
                  activeFilter === value
                    ? "bg-accent text-text-primary shadow-glow"
                    : "bg-bg-secondary border border-border text-text-secondary hover:text-text-primary hover:border-accent/40"
                }`}
              >
                <Icon size={13} />
                {label}
              </button>
            ))}

            {/* Result count badge */}
            {!isLoading && hasResults && (
              <span className="ml-auto text-xs text-text-tertiary self-center">
                {results.videos.length + results.channels.length} results for{" "}
                <span className="text-text-primary font-semibold">
                  &quot;{queryParam}&quot;
                </span>
              </span>
            )}
          </div>
        )}

        {/* Loading Skeletons */}
        {(isLoading || isFetching) && (
          <div className="flex flex-col gap-8">
            {activeFilter !== "videos" && activeFilter !== "live" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-20 rounded-card bg-bg-secondary animate-pulse border border-border"
                  />
                ))}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <VideoCardSkeleton key={i} />
              ))}
            </div>
          </div>
        )}

        {/* API Error State */}
        {!isLoading && error && (
          <div className="flex flex-col items-center justify-center py-20 text-center max-w-sm mx-auto gap-4">
            <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <AlertCircle size={28} className="text-red-400" />
            </div>
            <h3 className="font-display text-xl font-bold">Search Failed</h3>
            <p className="text-text-secondary text-sm">
              {(error as Error).message || "Could not load search results. Check your connection and try again."}
            </p>
            <button
              onClick={() => router.push(`/search?q=${encodeURIComponent(queryParam)}`)}
              className="bg-accent hover:opacity-90 text-text-primary text-sm font-semibold rounded-btn px-5 py-2 transition-all cursor-pointer"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Empty prompt — no query yet */}
        {!isLoading && !error && !queryParam && (
          <div className="flex flex-col items-center justify-center py-24 text-center max-w-sm mx-auto gap-5">
            <div className="w-20 h-20 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center">
              <SearchIcon size={32} className="text-accent" />
            </div>
            <h3 className="font-display text-2xl font-bold">Discover Content</h3>
            <p className="text-text-secondary text-sm leading-relaxed">
              Search for anything — videos, live streams, or channels to
              subscribe to.
            </p>
          </div>
        )}

        {/* No results */}
        {!isLoading && !error && queryParam && results && !hasResults && (
          <div className="flex flex-col items-center justify-center py-20 text-center max-w-sm mx-auto gap-4">
            <div className="w-16 h-16 rounded-full bg-bg-elevated border border-border flex items-center justify-center">
              <AlertCircle size={28} className="text-text-tertiary" />
            </div>
            <h3 className="font-display text-xl font-bold">No Results Found</h3>
            <p className="text-text-secondary text-sm">
              No matches for{" "}
              <span className="text-text-primary font-semibold">
                &quot;{queryParam}&quot;
              </span>
              . Try broader keywords or check spelling.
            </p>
          </div>
        )}

        {/* Results Grid */}
        {!isLoading && !error && results && hasResults && (
          <div className="flex flex-col gap-10">
            {/* Channels Section */}
            {results.channels.length > 0 &&
              (activeFilter === "all" || activeFilter === "channels") && (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-2 border-b border-border/40 pb-2">
                    <Users size={16} className="text-accent" />
                    <h3 className="font-display text-base font-bold uppercase tracking-wider text-text-secondary">
                      Channels
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {results.channels.map((channel: any) => {
                      const subbed = isSubscribed(channel.id);
                      return (
                        <div
                          key={channel.id}
                          className="bg-bg-secondary border border-border p-4 rounded-card flex items-center justify-between gap-4 hover:border-accent/30 transition-all"
                        >
                          <Link
                            href={`/channel/${channel.id}`}
                            className="flex items-center gap-4 min-w-0"
                          >
                            {channel.thumbnailUrl ? (
                              <img
                                src={channel.thumbnailUrl}
                                alt={channel.name}
                                className="w-14 h-14 rounded-full border border-border object-cover shrink-0"
                              />
                            ) : (
                              <div className="w-14 h-14 rounded-full border border-border bg-bg-elevated flex items-center justify-center text-accent font-bold text-lg shrink-0">
                                {channel.name?.substring(0, 2).toUpperCase()}
                              </div>
                            )}
                            <div className="flex flex-col min-w-0">
                              <span className="font-semibold text-sm text-text-primary hover:text-accent transition-colors truncate">
                                {channel.name}
                              </span>
                              {channel.handle && (
                                <span className="text-xs text-text-secondary truncate">
                                  {channel.handle}
                                </span>
                              )}
                              {channel.subscriberCount > 0 && (
                                <span className="text-xs text-text-tertiary mt-0.5">
                                  {formatCount(channel.subscriberCount)}{" "}
                                  subscribers
                                </span>
                              )}
                            </div>
                          </Link>

                          <button
                            onClick={async () => {
                              if (subbed) {
                                await unsubscribe(channel.id);
                              } else {
                                await subscribe(channel.id);
                              }
                            }}
                            className={`px-4 py-2 rounded-btn font-semibold text-xs transition-all shrink-0 cursor-pointer ${
                              subbed
                                ? "bg-bg-elevated border border-border hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 text-text-primary"
                                : "bg-accent hover:opacity-90 text-text-primary shadow-glow"
                            }`}
                          >
                            {subbed ? "Subscribed ✓" : "Subscribe"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            {/* Videos Section */}
            {results.videos.length > 0 &&
              (activeFilter === "all" ||
                activeFilter === "videos" ||
                activeFilter === "live") && (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-2 border-b border-border/40 pb-2">
                    {activeFilter === "live" ? (
                      <Radio size={16} className="text-red-400 animate-pulse" />
                    ) : (
                      <Video size={16} className="text-accent" />
                    )}
                    <h3 className="font-display text-base font-bold uppercase tracking-wider text-text-secondary">
                      {activeFilter === "live" ? "Live Streams" : "Videos"}
                    </h3>
                    <span className="text-xs text-text-tertiary ml-1">
                      ({results.videos.length})
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {results.videos.map((video: any) => (
                      <VideoCard key={video.id} {...video} />
                    ))}
                  </div>
                </div>
              )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-bg-primary flex items-center justify-center">
          <Loader2 className="animate-spin text-accent" size={28} />
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
