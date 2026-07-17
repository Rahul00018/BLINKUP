"use client";

import React, { useState } from "react";
import AppLayout from "../../../components/layout/AppLayout";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import {
  getChannelById,
  getChannelVideos,
  getLiveStreams,
  getPlaylistsByChannelId,
  getPlaylistVideos,
} from "../../../lib/youtube";
import { YouTubePlaylist } from "../../../types/youtube";
import { useSubscriptions } from "../../../hooks/useSubscriptions";
import { useToast } from "../../../hooks/useToast";
import VideoCard from "../../../components/video/VideoCard";
import { VideoCardSkeleton, Skeleton } from "../../../components/ui/Skeleton";
import { formatCount, timeAgo } from "../../../lib/utils";
import {
  Radio,
  Info,
  Loader2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Search,
  ListVideo,
  Play,
} from "lucide-react";
import YoutubeIcon from "../../../components/ui/YoutubeIcon";

type TabType = "home" | "videos" | "playlists" | "live" | "about";
type VideoFilter = "all" | "most_viewed" | "oldest";

export default function ChannelPage() {
  const { channelId } = useParams() as { channelId: string };
  const router = useRouter();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TabType>("home");
  const [filter, setFilter] = useState<VideoFilter>("all");
  const [descExpanded, setDescExpanded] = useState(false);
  const [loadingPlaylistId, setLoadingPlaylistId] = useState<string | null>(null);
  
  const { isSubscribed, subscribe, unsubscribe, isSubscribing, isUnsubscribing } =
    useSubscriptions();

  const isSubbed = isSubscribed(channelId);

  // 1. Fetch channel metadata
  const { data: channel, isLoading: loadingChannel } = useQuery({
    queryKey: ["channelMetadata", channelId],
    queryFn: () => getChannelById(channelId),
    enabled: !!channelId,
  });

  // 2. Fetch channel videos with infinite query (shared by Home and Videos tab)
  const {
    data: videosData,
    isLoading: loadingVideos,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["channelVideosFeed", channelId],
    queryFn: ({ pageParam }) => getChannelVideos(channelId, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextPageToken,
    enabled: !!channelId && (activeTab === "videos" || activeTab === "home"),
  });

  // 3. Fetch channel live streams
  const { data: liveStreams = [], isLoading: loadingLive } = useQuery({
    queryKey: ["channelLiveStreams", channelId],
    queryFn: () => getLiveStreams(channelId),
    enabled: !!channelId && activeTab === "live",
  });

  // 3.5 Fetch channel playlists
  const { data: playlists = [], isLoading: loadingPlaylists } = useQuery<YouTubePlaylist[]>({
    queryKey: ["channelPlaylists", channelId],
    queryFn: () => getPlaylistsByChannelId(channelId),
    enabled: !!channelId && activeTab === "playlists",
  });

  const allVideos = videosData?.pages.flatMap((page) => page.videos) || [];

  // Filter and sort videos
  const getProcessedVideos = () => {
    const list = [...allVideos];
    if (filter === "most_viewed") {
      list.sort((a, b) => b.viewCount - a.viewCount);
    } else if (filter === "oldest") {
      list.sort(
        (a, b) =>
          new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime()
      );
    }
    return list;
  };

  const processedVideos = getProcessedVideos();
  const featuredVideo = processedVideos[0];
  const homeGridVideos = processedVideos.slice(1, 9); // latest uploads for home grid

  const handleSubscribeToggle = async () => {
    if (isSubbed) {
      await unsubscribe(channelId);
    } else {
      await subscribe(channelId);
    }
  };

  const handlePlayPlaylist = async (playlistId: string) => {
    setLoadingPlaylistId(playlistId);
    try {
      const vids = await getPlaylistVideos(playlistId, 1);
      if (vids.length > 0) {
        router.push(`/watch/${vids[0].id}?list=${playlistId}`);
      } else {
        toast("This playlist contains no videos", "info");
      }
    } catch (e) {
      toast("Failed to load playlist", "error");
    } finally {
      setLoadingPlaylistId(null);
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 pb-12 max-w-[1280px] mx-auto select-none">
        {loadingChannel ? (
          <div className="flex flex-col gap-6">
            <Skeleton className="w-full aspect-[6/1] rounded-2xl animate-pulse" />
            <div className="flex flex-col md:flex-row items-center gap-6">
              <Skeleton className="w-28 h-28 md:w-36 md:h-36 rounded-full shrink-0" />
              <div className="flex-1 flex flex-col gap-3 w-full">
                <Skeleton className="h-8 w-1/3" />
                <Skeleton className="h-4 w-1/4" />
              </div>
            </div>
          </div>
        ) : (
          channel && (
            <>
              {/* Banner with YouTube-standard aspect ratio */}
              <div className="relative w-full aspect-[6.2/1] rounded-2xl overflow-hidden border border-border/40 bg-bg-secondary shrink-0">
                {channel.bannerUrl ? (
                  <img
                    src={channel.bannerUrl}
                    alt={`${channel.name} banner`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-r from-bg-elevated to-bg-secondary flex items-center justify-center text-text-tertiary text-xs font-semibold">
                    No banner available
                  </div>
                )}
              </div>

              {/* Profile Details Header Section */}
              <div className="flex flex-col md:flex-row items-center md:items-start gap-6 px-2 mt-2">
                <img
                  src={channel.thumbnailUrl}
                  alt={channel.name}
                  className="w-28 h-28 md:w-36 md:h-36 rounded-full border border-border/40 object-cover shrink-0 shadow-glow"
                />
                
                <div className="flex-1 flex flex-col items-center md:items-start gap-2 text-center md:text-left min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap justify-center md:justify-start">
                    <h1 className="font-display text-2xl md:text-3xl font-extrabold tracking-tight text-text-primary">
                      {channel.name}
                    </h1>
                    {channel.subscriberCount > 100000 && (
                      <CheckCircle2 size={18} className="text-text-secondary fill-text-secondary mt-0.5 shrink-0" />
                    )}
                  </div>

                  {/* Inline metadata handle, subscribers, video count */}
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-1.5 text-xs text-text-secondary font-semibold">
                    <span>{channel.handle || `@${channel.name.toLowerCase().replace(/\s+/g, "")}`}</span>
                    <span>•</span>
                    <span>{formatCount(channel.subscriberCount)} subscribers</span>
                    <span>•</span>
                    <span>{formatCount(channel.videoCount)} videos</span>
                  </div>

                  {/* Expandable description snippet */}
                  {channel.description && (
                    <div className="max-w-xl text-xs text-text-secondary leading-relaxed flex flex-col items-center md:items-start gap-1">
                      <p className={`w-full ${descExpanded ? "" : "line-clamp-2"}`}>
                        {channel.description}
                      </p>
                      <button
                        onClick={() => setDescExpanded(!descExpanded)}
                        className="text-text-primary hover:text-accent font-bold mt-1 cursor-pointer flex items-center gap-0.5"
                      >
                        {descExpanded ? (
                          <>Show less <ChevronUp size={14} /></>
                        ) : (
                          <>...more</>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Action Pill Buttons */}
                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    <button
                      onClick={handleSubscribeToggle}
                      disabled={isSubscribing || isUnsubscribing}
                      className={`px-6 py-2.5 rounded-full font-bold text-xs transition-all cursor-pointer flex items-center gap-2 select-none shrink-0 ${
                        isSubbed
                          ? "bg-bg-elevated hover:bg-bg-elevated/85 border border-border text-text-primary"
                          : "bg-text-primary text-bg-primary hover:opacity-90"
                      }`}
                    >
                      {(isSubscribing || isUnsubscribing) && (
                        <Loader2 size={12} className="animate-spin" />
                      )}
                      {isSubbed ? "Subscribed" : "Subscribe"}
                    </button>

                    <button
                      onClick={() => toast("Community feature coming soon!", "info")}
                      className="px-6 py-2.5 rounded-full bg-bg-elevated hover:bg-bg-elevated/85 border border-border text-text-primary font-bold text-xs transition-all cursor-pointer"
                    >
                      Community
                    </button>
                  </div>
                </div>
              </div>

              {/* Tabs Navigation Row (YouTube style) */}
              <div className="border-b border-border/40 mt-6 flex items-center gap-4 overflow-x-auto scrollbar-none shrink-0 text-sm font-semibold">
                {(["home", "videos", "playlists", "live", "about"] as TabType[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`py-3 px-4 border-b-2 transition-all cursor-pointer shrink-0 uppercase tracking-wider text-[11px] font-bold ${
                      activeTab === tab
                        ? "border-text-primary text-text-primary"
                        : "border-transparent text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Tab Contents */}
              <div className="mt-4">
                {/* 1. HOME TAB - Feature Spotlight Video + Grid */}
                {activeTab === "home" && (
                  <div className="flex flex-col gap-8">
                    {loadingVideos ? (
                      <div className="flex flex-col gap-6">
                        <Skeleton className="w-full h-64 rounded-2xl" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                          {Array.from({ length: 4 }).map((_, i) => (
                            <VideoCardSkeleton key={i} />
                          ))}
                        </div>
                      </div>
                    ) : featuredVideo ? (
                      <>
                        {/* Featured Video Row (Spotlight horizontal layout) */}
                        <div
                          onClick={() => router.push(`/watch/${featuredVideo.id}`)}
                          className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-4 bg-bg-elevated/20 rounded-2xl border border-border/30 hover:border-accent/20 transition-all cursor-pointer group"
                        >
                          <div className="lg:col-span-5 aspect-video rounded-xl overflow-hidden border border-border shrink-0 relative">
                            <img
                              src={featuredVideo.thumbnailUrl}
                              alt={featuredVideo.title}
                              className="w-full h-full object-cover group-hover:scale-[1.01] transition-transform duration-300"
                            />
                            <span className="absolute bottom-2 right-2 bg-black/85 text-[10px] px-1.5 py-0.5 rounded font-mono text-text-primary">
                              Featured Video
                            </span>
                          </div>
                          
                          <div className="lg:col-span-7 flex flex-col gap-2 min-w-0 pr-4 mt-2 lg:mt-0">
                            <h3 
                              style={{ color: "var(--color-video-title)" }}
                              className="font-display font-bold text-lg md:text-xl leading-snug group-hover:text-accent transition-colors line-clamp-2"
                            >
                              {featuredVideo.title}
                            </h3>
                            <span className="text-[11px] text-text-tertiary">
                              {formatCount(featuredVideo.viewCount)} views • {timeAgo(featuredVideo.publishedAt)}
                            </span>
                            {featuredVideo.description && (
                              <p className="text-text-secondary text-xs leading-relaxed line-clamp-4 mt-1 font-normal">
                                {featuredVideo.description}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Latest uploads grid */}
                        <div className="flex flex-col gap-4">
                          <h3 className="font-display text-sm font-bold uppercase tracking-wider text-text-secondary border-b border-border/40 pb-2">
                            Latest Uploads
                          </h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            {homeGridVideos.map((video) => (
                              <VideoCard
                                key={video.id}
                                {...video}
                                channelAvatarUrl={channel.thumbnailUrl}
                              />
                            ))}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-20 text-text-secondary text-sm">
                        No videos uploaded yet.
                      </div>
                    )}
                  </div>
                )}

                {/* 2. VIDEOS TAB - Sorted Grid list */}
                {activeTab === "videos" && (
                  <div className="flex flex-col gap-6">
                    {/* Sort Filter for Videos */}
                    <div className="flex justify-end select-none">
                      <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value as VideoFilter)}
                        className="bg-bg-secondary border border-border text-xs rounded-full px-4 py-2 text-text-primary focus:outline-none focus:border-accent cursor-pointer font-bold uppercase tracking-wide"
                      >
                        <option value="all">Latest</option>
                        <option value="most_viewed">Most Viewed</option>
                        <option value="oldest">Oldest</option>
                      </select>
                    </div>

                    {loadingVideos ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {Array.from({ length: 8 }).map((_, i) => (
                          <VideoCardSkeleton key={i} />
                        ))}
                      </div>
                    ) : processedVideos.length > 0 ? (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                          {processedVideos.map((video) => (
                            <VideoCard
                              key={video.id}
                              {...video}
                              channelAvatarUrl={channel.thumbnailUrl}
                            />
                          ))}
                        </div>

                        {hasNextPage && (
                          <div className="flex justify-center mt-8">
                            <button
                              onClick={() => fetchNextPage()}
                              disabled={isFetchingNextPage}
                              className="bg-bg-secondary hover:bg-bg-elevated border border-border text-text-primary font-bold text-xs uppercase tracking-wider px-6 py-3 rounded-full transition-colors cursor-pointer flex items-center gap-2"
                            >
                              {isFetchingNextPage && (
                                <Loader2 size={14} className="animate-spin" />
                              )}
                              Load More Videos
                            </button>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-20 text-text-secondary text-sm">
                        No videos found.
                      </div>
                    )}
                  </div>
                )}

                {/* 2.5. PLAYLISTS TAB */}
                {activeTab === "playlists" && (
                  <div className="flex flex-col gap-6">
                    {loadingPlaylists ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {Array.from({ length: 4 }).map((_, i) => (
                          <div key={i} className="flex flex-col gap-3">
                            <Skeleton className="w-full aspect-video rounded-xl" />
                            <Skeleton className="h-4 w-2/3" />
                            <Skeleton className="h-3 w-1/3" />
                          </div>
                        ))}
                      </div>
                    ) : playlists.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {playlists.map((playlist) => (
                          <div
                            key={playlist.id}
                            onClick={() => handlePlayPlaylist(playlist.id)}
                            className="flex flex-col gap-2.5 group cursor-pointer"
                          >
                            {/* Card with custom playlist overlay */}
                            <div className="relative aspect-video rounded-xl overflow-hidden border border-border/40 bg-bg-secondary shrink-0">
                              <img
                                src={playlist.thumbnailUrl}
                                alt={playlist.title}
                                className="w-full h-full object-cover group-hover:scale-[1.01] transition-transform duration-300"
                              />
                              
                              {/* Dark right-side overlay for playlist item count */}
                              <div className="absolute right-0 top-0 bottom-0 w-2/5 bg-black/80 flex flex-col items-center justify-center text-text-primary gap-1 select-none backdrop-blur-[2px]">
                                <ListVideo size={20} className="text-white" />
                                <span className="text-xs font-bold text-white">{playlist.videoCount} videos</span>
                              </div>

                              {/* Hover Play Icon Overlay */}
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                <div className="p-3 bg-accent rounded-full text-white shadow-glow">
                                  <Play size={20} fill="currentColor" />
                                </div>
                              </div>

                              {/* Loading Spinner */}
                              {loadingPlaylistId === playlist.id && (
                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-20">
                                  <Loader2 className="w-8 h-8 text-accent animate-spin" />
                                </div>
                              )}
                            </div>

                            <div className="flex flex-col min-w-0 px-1.5">
                              <h4 className="font-display font-bold text-sm text-text-primary leading-snug line-clamp-2 group-hover:text-accent transition-colors">
                                {playlist.title}
                              </h4>
                              <span className="text-[10px] uppercase tracking-wider text-text-tertiary font-bold mt-1">
                                Playlist
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-20 text-text-secondary text-sm font-semibold">
                        No playlists found for this channel.
                      </div>
                    )}
                  </div>
                )}

                {/* 3. LIVE TAB */}
                {activeTab === "live" && (
                  <div className="flex flex-col gap-6">
                    {loadingLive ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {Array.from({ length: 4 }).map((_, i) => (
                          <VideoCardSkeleton key={i} />
                        ))}
                      </div>
                    ) : liveStreams.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {liveStreams.map((video) => (
                          <VideoCard
                            key={video.id}
                            {...video}
                            channelAvatarUrl={channel.thumbnailUrl}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-20 text-text-secondary text-sm font-semibold">
                        No active or upcoming live streams found.
                      </div>
                    )}
                  </div>
                )}

                {/* 4. ABOUT TAB */}
                {activeTab === "about" && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-2">
                    {/* Description */}
                    <div className="lg:col-span-2 bg-bg-elevated/20 border border-border/30 p-6 rounded-2xl flex flex-col gap-4">
                      <h3 className="font-display font-bold text-base uppercase tracking-wider text-text-secondary">Description</h3>
                      <p className="text-text-secondary text-xs leading-relaxed whitespace-pre-wrap font-normal">
                        {channel.description || "No description provided."}
                      </p>
                    </div>

                    {/* Stats Panel */}
                    <div className="bg-bg-elevated/20 border border-border/30 p-6 rounded-2xl flex flex-col gap-4 h-fit">
                      <h3 className="font-display font-bold text-base uppercase tracking-wider text-text-secondary">Stats</h3>
                      <div className="divide-y divide-border/40 text-xs font-semibold">
                        <div className="py-3.5 flex justify-between">
                          <span className="text-text-secondary">Custom Handle</span>
                          <span className="text-text-primary">{channel.handle || "N/A"}</span>
                        </div>
                        <div className="py-3.5 flex justify-between">
                          <span className="text-text-secondary">Subscribers</span>
                          <span className="text-text-primary">
                            {formatCount(channel.subscriberCount)}
                          </span>
                        </div>
                        <div className="py-3.5 flex justify-between">
                          <span className="text-text-secondary">Videos</span>
                          <span className="text-text-primary">
                            {formatCount(channel.videoCount)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )
        )}
      </div>
    </AppLayout>
  );
}
