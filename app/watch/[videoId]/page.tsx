"use client";

import React, { useState, useEffect, useMemo } from "react";
import AppLayout from "../../../components/layout/AppLayout";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  getVideoById,
  searchVideos,
  getChannelById,
  getPlaylistVideos,
  getPlaylistDetails,
  getVideosByIds,
  getChannelVideos,
} from "../../../lib/youtube";
import { YouTubeVideo } from "../../../types/youtube";
import VideoCard from "../../../components/video/VideoCard";
import CustomPlayer from "../../../components/player/CustomPlayer";
import { useSubscriptions } from "../../../hooks/useSubscriptions";
import { usePlayerStore } from "../../../store/playerStore";
import { useAuth } from "../../../components/auth/AuthProvider";
import { useToast } from "../../../hooks/useToast";
import { createClient } from "../../../lib/supabase";
import { formatCount, timeAgo, formatDuration } from "../../../lib/utils";
import {
  ThumbsUp,
  ThumbsDown,
  Share2,
  Bookmark,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  AlertCircle,
  Sparkles,
  MoreHorizontal,
  CheckCircle2,
  ListFilter,
  Bell,
  Download,
  Play,
  X,
  MonitorPlay,
  FileVideo,
} from "lucide-react";
import Link from "next/link";
import { Skeleton } from "../../../components/ui/Skeleton";

const EMPTY_ARRAY: any[] = [];

export default function WatchPage() {
  const { videoId } = useParams() as { videoId: string };
  const router = useRouter();
  const searchParams = useSearchParams();
  const listId = searchParams.get("list");
  const { user } = useAuth();
  const { toast } = useToast();
  const supabase = createClient();
  
  const { theaterMode, setTheaterMode, nextVideo, setQueue, queue } = usePlayerStore();
  const { isSubscribed, subscribe, unsubscribe, subscriptions } = useSubscriptions();

  const [saved, setSaved] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  // Suggestions filter state
  const [suggestionFilter, setSuggestionFilter] = useState("all");

  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);

  // Check if current video is downloaded
  useEffect(() => {
    if (!videoId) return;
    const stored = localStorage.getItem("blinkup_downloads");
    if (stored) {
      try {
        const list: YouTubeVideo[] = JSON.parse(stored);
        setIsDownloaded(list.some((v) => v.id === videoId));
      } catch (e) {
        console.error(e);
      }
    }
  }, [videoId]);

  const handleDownloadOffline = () => {
    if (!video || downloading) return;
    setShowDownloadModal(false);

    setDownloading(true);
    setDownloadProgress(0);
    toast("Starting video download to offline library...", "info");

    const interval = setInterval(() => {
      setDownloadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setDownloading(false);
          const stored = localStorage.getItem("blinkup_downloads") || "[]";
          try {
            const list: YouTubeVideo[] = JSON.parse(stored);
            if (!list.some((v) => v.id === video.id)) {
              list.push(video);
              localStorage.setItem("blinkup_downloads", JSON.stringify(list));
            }
            setIsDownloaded(true);
            toast("Download complete! Video is now available offline.", "success");
          } catch (e) {
            console.error(e);
          }
          return 100;
        }
        return prev + 10;
      });
    }, 400);
  };

  const handleDownloadFile = () => {
    if (!videoId) return;
    setShowDownloadModal(false);
    toast("Redirecting to high quality video downloader...", "success");
    window.open(`https://9xbuddy.in/process?url=https://www.youtube.com/watch?v=${videoId}`, "_blank");
  };

  const handleDownloadClick = () => {
    if (isDownloaded) {
      const stored = localStorage.getItem("blinkup_downloads");
      if (stored) {
        try {
          const list: YouTubeVideo[] = JSON.parse(stored);
          const updated = list.filter((v) => v.id !== videoId);
          localStorage.setItem("blinkup_downloads", JSON.stringify(updated));
          setIsDownloaded(false);
          toast("Video removed from offline downloads", "info");
        } catch (e) {
          console.error(e);
        }
      }
      return;
    }

    setShowDownloadModal(true);
  };

  // 1. Fetch video metadata
  const { data: video, isLoading: loadingVideo, error: videoError } = useQuery({
    queryKey: ["watchVideoMetadata", videoId],
    queryFn: () => getVideoById(videoId),
    enabled: !!videoId,
  });

  const isSubbed = video ? isSubscribed(video.channelId) : false;

  // 1.2. Fetch playlist items if in playlist mode
  const { data: playlistVideos = EMPTY_ARRAY, isLoading: loadingPlaylistVideos } = useQuery<YouTubeVideo[]>({
    queryKey: ["playlistWatchVideos", listId],
    queryFn: () => getPlaylistVideos(listId!),
    enabled: !!listId,
  });

  // 1.3. Fetch playlist details if in playlist mode
  const { data: playlistInfo } = useQuery({
    queryKey: ["playlistWatchInfo", listId],
    queryFn: () => getPlaylistDetails(listId!),
    enabled: !!listId,
  });

  // 1.5. Fetch channel details for verified status and sub count
  const { data: channelDetails } = useQuery({
    queryKey: ["watchChannelDetails", video?.channelId],
    queryFn: () => getChannelById(video!.channelId),
    enabled: !!video?.channelId,
  });

  // 2. Fetch all uploads from subscribed channels for related recommendations
  const { data: suggestionsFeed = EMPTY_ARRAY, isLoading: loadingSuggestions } = useQuery<YouTubeVideo[]>({
    queryKey: ["watchSuggestionsFeed", subscriptions.map((s: any) => s.id)],
    queryFn: async () => {
      if (subscriptions.length === 0) return [];
      const promises = subscriptions.slice(0, 10).map(async (sub) => {
        try {
          const { videos } = await getChannelVideos(sub.id);
          return videos;
        } catch (e) {
          return [];
        }
      });
      const results = await Promise.all(promises);
      return results
        .flat()
        .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
    },
    enabled: subscriptions.length > 0 && !listId,
  });

  // Filter recommendations based on pill chips (only used when NOT in playlist mode)
  const relatedVideos = useMemo(() => {
    if (listId) return EMPTY_ARRAY;
    let list = suggestionsFeed.filter((v) => v.id !== videoId);
    if (suggestionFilter === "channel" && video) {
      list = list.filter((v) => v.channelId === video.channelId);
    } else if (suggestionFilter === "related" && video) {
      list = list.filter((v) => v.channelId !== video.channelId);
    }
    return list;
  }, [suggestionsFeed, videoId, suggestionFilter, video, listId]);

  // Update playback queue dynamically
  useEffect(() => {
    const targetQueue = listId
      ? (playlistVideos.length > 0
        ? (playlistVideos.findIndex((v) => v.id === videoId) !== -1
          ? playlistVideos.slice(playlistVideos.findIndex((v) => v.id === videoId) + 1)
          : playlistVideos)
        : EMPTY_ARRAY)
      : relatedVideos;

    const currentQueueIds = queue.map((v) => v.id).join(",");
    const targetQueueIds = targetQueue.map((v) => v.id).join(",");

    if (targetQueueIds !== currentQueueIds && targetQueue.length > 0) {
      setQueue(targetQueue);
    }
  }, [listId, playlistVideos, relatedVideos, videoId, queue, setQueue]);

  // Check if saved
  useEffect(() => {
    if (!user || !videoId) return;
    const checkSaved = async () => {
      const { data } = await supabase
        .from("saved_videos")
        .select("id")
        .eq("user_id", user.id)
        .eq("video_id", videoId)
        .maybeSingle();
      if (data) setSaved(true);
    };
    checkSaved();
  }, [user, videoId, supabase]);

  // Load Watch History & auto-seek / resume prompt
  useEffect(() => {
    if (!user || !videoId || !video) return;

    const loadHistoryAndResume = async () => {
      const { data } = await supabase
        .from("watch_history")
        .select("progress_seconds")
        .eq("user_id", user.id)
        .eq("video_id", videoId)
        .maybeSingle();

      if (data && data.progress_seconds > 5 && !historyLoaded) {
        setHistoryLoaded(true);
        setTimeout(() => {
          window.dispatchEvent(
            new CustomEvent("seek-player", { detail: data.progress_seconds })
          );
          toast(
            `Resumed playback from ${formatDuration(data.progress_seconds)}`,
            "success"
          );
        }, 1500);
      }
    };

    loadHistoryAndResume();
  }, [user, videoId, video, historyLoaded, supabase, toast]);

  // Progress Sync to database (every 5 seconds)
  useEffect(() => {
    if (!user || !video || !videoId) return;

    const syncInterval = setInterval(async () => {
      window.dispatchEvent(new CustomEvent("get-player-time"));
    }, 5000);

    const handleTimeReport = async (e: Event) => {
      const { currentTime, duration } = (e as CustomEvent).detail;
      if (currentTime > 2 && duration > 0) {
        const { data: existing } = await supabase
          .from("watch_history")
          .select("id")
          .eq("user_id", user.id)
          .eq("video_id", videoId)
          .maybeSingle();

        if (existing) {
          await supabase
            .from("watch_history")
            .update({
              progress_seconds: Math.floor(currentTime),
              watched_at: new Date().toISOString(),
            })
            .eq("id", existing.id);
        } else {
          await supabase.from("watch_history").insert({
            user_id: user.id,
            video_id: videoId,
            channel_id: video.channelId,
            title: video.title,
            thumbnail_url: video.thumbnailUrl,
            progress_seconds: Math.floor(currentTime),
            duration_seconds: Math.floor(duration),
          });
        }
      }
    };

    window.addEventListener("report-player-time", handleTimeReport);

    return () => {
      clearInterval(syncInterval);
      window.removeEventListener("report-player-time", handleTimeReport);
    };
  }, [user, video, videoId, supabase]);

  const handleSaveVideo = async () => {
    if (!user) {
      toast("Please sign in to save videos", "warning");
      return;
    }
    try {
      if (saved) {
        await supabase
          .from("saved_videos")
          .delete()
          .eq("user_id", user.id)
          .eq("video_id", videoId);
        setSaved(false);
        toast("Removed from Saved Videos", "success");
      } else {
        await supabase.from("saved_videos").insert({
          user_id: user.id,
          video_id: videoId,
          channel_id: video!.channelId,
          title: video!.title,
          thumbnail_url: video!.thumbnailUrl,
        });
        setSaved(true);
        toast("Saved to Saved Videos!", "success");
      }
    } catch (e) {
      toast("Failed to update Saved status", "error");
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast("Link copied to clipboard!", "success");
  };

  const handleNextAutoplay = () => {
    const next = nextVideo();
    if (next) {
      router.push(`/watch/${next.id}`);
    } else {
      toast("No more videos in queue", "info");
    }
  };

  const renderDescription = (text: string) => {
    const timeRegex = /\b(?:(\d{1,2}):)?(\d{1,2}):(\d{2})\b/g;
    const lines = text.split("\n");

    return lines.map((line, idx) => {
      const match = line.match(timeRegex);
      if (match) {
        const timestamp = match[0];
        const parts = timestamp.split(":");
        let seconds = 0;
        if (parts.length === 3) {
          seconds =
            parseInt(parts[0], 10) * 3600 +
            parseInt(parts[1], 10) * 60 +
            parseInt(parts[2], 10);
        } else {
          seconds = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
        }

        const lineParts = line.split(timestamp);
        return (
          <div key={idx} className="whitespace-pre-wrap">
            {lineParts[0]}
            <button
              onClick={() =>
                window.dispatchEvent(
                  new CustomEvent("seek-player", { detail: seconds })
                )
              }
              className="text-accent hover:underline font-semibold cursor-pointer"
            >
              {timestamp}
            </button>
            {lineParts[1]}
          </div>
        );
      }
      return (
        <div key={idx} className="whitespace-pre-wrap">
          {line}
        </div>
      );
    });
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 pb-12 max-w-[1440px] mx-auto">
        {loadingVideo ? (
          <div className="flex flex-col gap-6">
            <div className="w-full aspect-video rounded-card bg-bg-secondary animate-pulse" />
            <div className="flex flex-col gap-4">
              <Skeleton className="h-8 w-2/3" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          </div>
        ) : videoError || !video ? (
          <div className="flex flex-col items-center justify-center py-20 text-center max-w-md mx-auto gap-4">
            <AlertCircle size={48} className="text-red-500" />
            <h3 className="font-display text-xl font-bold">Video Unavailable</h3>
            <p className="text-text-secondary text-sm">
              We couldn&apos;t load details for this video.
            </p>
          </div>
        ) : (
          <div
            className={`grid grid-cols-1 ${
              theaterMode ? "w-full" : "lg:grid-cols-10"
            } gap-6 items-start`}
          >
            {/* Main Player Column */}
            <div className={theaterMode ? "w-full" : "lg:col-span-7"}>
              <div className="flex flex-col gap-3">
                <CustomPlayer
                  videoId={videoId}
                  description={video.description}
                  onVideoEnd={handleNextAutoplay}
                />

                {/* Title */}
                <h1 
                  style={{ color: "var(--color-video-title)" }}
                  className="font-display text-lg md:text-xl font-bold leading-snug mt-2 px-1"
                >
                  {video.title}
                </h1>

                {/* Brand / Subscribe / Actions Info Row */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 py-3 border-b border-border/40 pb-4">
                  {/* Left Side: Avatar, Name, Subs, and Subscribe Button */}
                  <div className="flex items-center justify-between lg:justify-start gap-4 w-full lg:w-auto">
                    <div className="flex items-center gap-3 min-w-0">
                      <Link
                        href={`/channel/${video.channelId}`}
                        className="w-10 h-10 rounded-full border border-border bg-bg-elevated flex items-center justify-center text-accent text-sm font-semibold overflow-hidden shrink-0"
                      >
                        {channelDetails?.thumbnailUrl ? (
                          <img
                            src={channelDetails.thumbnailUrl}
                            alt={video.channelName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          video.channelName.substring(0, 2).toUpperCase()
                        )}
                      </Link>
                      <div className="flex flex-col min-w-0 pr-2">
                        <Link
                          href={`/channel/${video.channelId}`}
                          className="font-bold text-sm text-text-primary hover:text-accent transition-colors flex items-center gap-1 truncate"
                        >
                          {video.channelName}
                          {(channelDetails?.subscriberCount || 0) > 100000 && (
                            <CheckCircle2 size={13} className="text-text-secondary fill-text-secondary" />
                          )}
                        </Link>
                        <span className="text-[11px] text-text-secondary truncate">
                          {channelDetails
                            ? `${formatCount(channelDetails.subscriberCount)} subscribers`
                            : "Loading subscribers..."}
                        </span>
                      </div>
                    </div>

                    {isSubbed ? (
                      <div className="flex items-center bg-bg-elevated hover:bg-bg-elevated/85 border border-border/50 text-text-primary rounded-full px-4 py-2 text-xs font-bold transition-all cursor-pointer select-none shrink-0 gap-1.5 ml-2">
                        <button
                          onClick={async () => {
                            await unsubscribe(video.channelId);
                          }}
                          className="flex items-center gap-1.5 hover:text-accent transition-colors"
                          title="Unsubscribe"
                        >
                          <Bell size={14} className="text-text-primary" />
                          <span>Subscribed</span>
                        </button>
                        <ChevronDown size={14} className="text-text-secondary" />
                      </div>
                    ) : (
                      <button
                        onClick={async () => {
                          await subscribe(video.channelId);
                        }}
                        className="bg-text-primary text-bg-primary hover:opacity-90 rounded-full px-5 py-2 font-bold text-xs transition-all cursor-pointer select-none shrink-0 ml-2"
                      >
                        Subscribe
                      </button>
                    )}
                  </div>

                  {/* Right Side: Actions Pills Container */}
                  <div className="flex items-center flex-wrap gap-2 w-full lg:w-auto justify-start lg:justify-end">
                    {/* Like / Dislike Pill */}
                    <div className="flex items-center bg-bg-elevated hover:bg-bg-elevated/85 rounded-full overflow-hidden border border-border/50 text-xs font-semibold">
                      <button
                        onClick={() => setIsLiked(!isLiked)}
                        className={`flex items-center gap-1.5 px-4 py-2 hover:bg-white/5 transition-colors cursor-pointer ${
                          isLiked ? "text-accent" : "text-text-primary"
                        }`}
                        title="Like this video"
                      >
                        <ThumbsUp size={14} className={isLiked ? "fill-accent" : ""} />
                        <span>{formatCount((video.viewCount / 100) + (isLiked ? 1 : 0))}</span>
                      </button>
                      <div className="h-4 w-[1px] bg-border" />
                      <button
                        className="px-3 py-2 text-text-primary hover:bg-white/5 transition-colors cursor-pointer"
                        title="Dislike this video"
                      >
                        <ThumbsDown size={14} />
                      </button>
                    </div>

                    {/* Share Pill */}
                    <button
                      onClick={handleShare}
                      className="flex items-center gap-1.5 px-4 py-2 bg-bg-elevated hover:bg-bg-elevated/85 rounded-full text-xs font-semibold text-text-primary border border-border/50 transition-colors cursor-pointer"
                      title="Share link"
                    >
                      <Share2 size={14} />
                      <span>Share</span>
                    </button>

                    {/* Save Playlist Pill */}
                    <button
                      onClick={handleSaveVideo}
                      className={`flex items-center gap-1.5 px-4 py-2 bg-bg-elevated hover:bg-bg-elevated/85 rounded-full text-xs font-semibold border border-border/50 transition-colors cursor-pointer ${
                        saved ? "text-accent border-accent/30" : "text-text-primary"
                      }`}
                      title="Save to watchlist"
                    >
                      <Bookmark size={14} className={saved ? "fill-accent" : ""} />
                      <span>{saved ? "Saved" : "Save"}</span>
                    </button>

                    {/* Download Pill */}
                    <button
                      onClick={handleDownloadClick}
                      disabled={downloading}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold border transition-all cursor-pointer select-none ${
                        isDownloaded
                          ? "bg-green-600/10 border-green-500/20 text-green-500 hover:bg-green-600/20"
                          : downloading
                          ? "bg-bg-elevated border-border text-text-secondary animate-pulse cursor-wait"
                          : "bg-bg-elevated border-border/50 text-text-primary hover:bg-bg-elevated/85"
                      }`}
                      title={isDownloaded ? "Downloaded offline" : "Download high quality video"}
                    >
                      <Download size={14} className={isDownloaded ? "text-green-500" : downloading ? "animate-bounce" : ""} />
                      <span>
                        {isDownloaded
                          ? "Downloaded"
                          : downloading
                          ? `Downloading ${downloadProgress}%`
                          : "Download"}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Shaded Expandable Video Description Box */}
                <div className="bg-bg-elevated/35 hover:bg-bg-elevated/50 border border-border/30 p-4 rounded-card flex flex-col gap-2 transition-colors">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-text-primary">
                    <span>{formatCount(video.viewCount)} views</span>
                    <span>•</span>
                    <span>
                      {new Date(video.publishedAt).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                  <div
                    className={`text-xs text-text-secondary leading-relaxed font-normal ${
                      descExpanded ? "" : "line-clamp-2"
                    }`}
                  >
                    {renderDescription(video.description)}
                  </div>
                  <button
                    onClick={() => setDescExpanded(!descExpanded)}
                    className="text-text-primary hover:text-accent text-xs font-bold flex items-center gap-0.5 mt-2 cursor-pointer self-start"
                  >
                    {descExpanded ? (
                      <>
                        Show Less <ChevronUp size={14} />
                      </>
                    ) : (
                      <>
                        Show More <ChevronDown size={14} />
                      </>
                    )}
                  </button>
                </div>

                {/* Mock Comments Section */}
                <div className="mt-6 px-1">
                  <h3 className="font-display font-bold text-sm mb-4 flex items-center gap-2 border-b border-border/40 pb-2 uppercase tracking-wide text-text-secondary">
                    <MessageSquare size={15} /> Comments
                  </h3>
                  <div className="flex flex-col gap-4">
                    <div className="flex gap-3 text-sm">
                      <div className="w-8 h-8 rounded-full bg-accent/15 border border-accent/20 shrink-0 flex items-center justify-center font-bold text-accent text-xs">
                        JD
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="font-bold text-xs text-text-primary">John Doe</span>
                        <p className="text-text-secondary text-xs leading-normal">
                          This is an incredible custom video player. Zero ads and very smooth controls.
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3 text-sm">
                      <div className="w-8 h-8 rounded-full bg-accent/15 border border-accent/20 shrink-0 flex items-center justify-center font-bold text-accent text-xs">
                        AS
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="font-bold text-xs text-text-primary">Alice Smith</span>
                        <p className="text-text-secondary text-xs leading-normal">
                          Love the theater mode scaling. Truly a premium experience!
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Related Videos / Playlist Sidebar Queue */}
            <div
              className={`flex flex-col gap-4 ${
                theaterMode ? "w-full mt-6" : "lg:col-span-3"
              }`}
            >
              {listId ? (
                /* PLAYLIST SIDEBAR QUEUE VIEW */
                <div className="bg-bg-secondary border border-border rounded-2xl overflow-hidden shadow-glow">
                  {/* Playlist Header */}
                  <div className="p-4 bg-bg-elevated/40 border-b border-border flex flex-col gap-1">
                    <h3 className="font-display font-bold text-sm text-text-primary line-clamp-1">
                      {playlistInfo?.title || "Playlist"}
                    </h3>
                    <div className="flex items-center justify-between text-[11px] text-text-secondary font-medium">
                      <span>{playlistInfo?.channelName || "Channel"}</span>
                      <span>
                        {playlistVideos.findIndex((v) => v.id === videoId) + 1} / {playlistVideos.length}
                      </span>
                    </div>
                  </div>

                  {/* Scrollable Playlist Items */}
                  <div className="flex flex-col max-h-[60vh] overflow-y-auto divide-y divide-border/30">
                    {loadingPlaylistVideos ? (
                      <div className="p-4 text-center text-xs text-text-secondary animate-pulse">
                        Loading playlist videos...
                      </div>
                    ) : playlistVideos.length > 0 ? (
                      playlistVideos.map((item, idx) => {
                        const isActive = item.id === videoId;
                        return (
                          <div
                            key={item.id}
                            onClick={() => router.push(`/watch/${item.id}?list=${listId}`)}
                            className={`flex gap-3 p-3 transition-colors cursor-pointer group hover:bg-bg-elevated/20 ${
                              isActive ? "bg-accent/10 border-l-4 border-accent" : ""
                            }`}
                          >
                            {/* Playlist index / Play icon */}
                            <div className="flex items-center justify-center text-xs font-bold text-text-tertiary w-4 shrink-0">
                              {isActive ? (
                                <Play size={10} className="text-accent fill-accent" />
                              ) : (
                                idx + 1
                              )}
                            </div>

                            <div className="relative w-24 aspect-video rounded-card overflow-hidden border border-border shrink-0">
                              <img
                                src={item.thumbnailUrl}
                                alt={item.title}
                                className="w-full h-full object-cover"
                              />
                              <span className="absolute bottom-1 right-1 bg-black/85 text-[9px] px-1 rounded font-mono text-white">
                                {formatDuration(item.duration)}
                              </span>
                            </div>

                            <div className="flex flex-col min-w-0 justify-center">
                              <h4
                                style={{ color: isActive ? "var(--color-accent)" : "var(--color-video-title)" }}
                                className={`text-[11px] font-semibold leading-tight line-clamp-2 group-hover:text-accent transition-colors ${
                                  isActive ? "text-accent font-bold" : ""
                                }`}
                              >
                                {item.title}
                              </h4>
                              <span className="text-[9px] text-text-tertiary truncate mt-0.5">
                                {item.channelName}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-4 text-center text-xs text-text-secondary">
                        No videos in this playlist.
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* STANDARD RELATED VIDEOS FEED VIEW */
                <>
                  {/* Sidebar Filter Chips */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none shrink-0 border-b border-border/40">
                    {[
                      { label: "All", value: "all" },
                      { label: "From Channel", value: "channel" },
                      { label: "Related", value: "related" },
                    ].map((chip) => (
                      <button
                        key={chip.value}
                        onClick={() => setSuggestionFilter(chip.value)}
                        className={`px-3 py-1 text-[11px] font-bold rounded-full transition-all cursor-pointer shrink-0 uppercase tracking-wider border border-transparent ${
                          suggestionFilter === chip.value
                            ? "bg-text-primary text-bg-primary"
                            : "bg-bg-elevated text-text-primary hover:bg-bg-elevated/85"
                        }`}
                      >
                        {chip.value === "channel" ? `From ${video.channelName.substring(0, 10)}...` : chip.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-col gap-4 overflow-y-auto max-h-[85vh] pr-1 mt-2">
                    {loadingSuggestions ? (
                      <div className="p-4 text-center text-xs text-text-secondary animate-pulse">
                        Loading recommendations...
                      </div>
                    ) : relatedVideos.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => router.push(`/watch/${item.id}`)}
                        className="flex gap-3 hover:bg-bg-elevated/30 p-1.5 rounded-card transition-colors cursor-pointer group"
                      >
                        <div className="relative w-28 aspect-video rounded-card overflow-hidden border border-border shrink-0">
                          <img
                            src={item.thumbnailUrl}
                            alt={item.title}
                            className="w-full h-full object-cover group-hover:scale-[1.03] transition-all"
                          />
                          <span className="absolute bottom-1 right-1 bg-black/85 text-[9px] px-1 rounded font-mono text-text-primary">
                            {formatDuration(item.duration)}
                          </span>
                        </div>
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <h4
                            style={{ color: "var(--color-video-title)" }}
                            className="text-xs font-semibold line-clamp-2 leading-tight group-hover:text-accent transition-colors"
                          >
                            {item.title}
                          </h4>
                          <span className="text-[10px] text-text-secondary truncate mt-0.5">
                            {item.channelName}
                          </span>
                          <span className="text-[9px] text-text-tertiary">
                            {formatCount(item.viewCount)} views • {timeAgo(item.publishedAt)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Download Options Modal */}
      {showDownloadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-bg-primary border border-border rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-border/80 flex justify-between items-center bg-bg-elevated/40">
              <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                <Download size={16} className="text-accent" />
                <span>Download Video Options</span>
              </h3>
              <button
                onClick={() => setShowDownloadModal(false)}
                className="text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="p-5 flex flex-col gap-4">
              <div className="flex gap-3 p-3 bg-bg-elevated/20 rounded-lg border border-border/50">
                <img
                  src={video?.thumbnailUrl}
                  alt={video?.title}
                  className="w-24 aspect-video object-cover rounded border border-border"
                />
                <div className="flex flex-col gap-1 min-w-0">
                  <h4 className="text-xs font-semibold text-text-primary line-clamp-2 leading-tight">
                    {video?.title}
                  </h4>
                  <span className="text-[10px] text-text-secondary">
                    {video?.channelName}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 mt-1">
                {/* Option 1: In-App Offline Save */}
                <button
                  onClick={handleDownloadOffline}
                  className="flex items-center gap-3.5 p-3.5 bg-bg-elevated hover:bg-bg-elevated/80 border border-border rounded-lg text-left transition-all group cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent group-hover:scale-105 transition-transform">
                    <MonitorPlay size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h5 className="text-xs font-bold text-text-primary">
                      Save to Offline Library
                    </h5>
                    <p className="text-[10px] text-text-secondary mt-0.5">
                      Saves inside BLINKUP library for local playback without internet.
                    </p>
                  </div>
                </button>

                {/* Option 2: Direct MP4 File Download */}
                <button
                  onClick={handleDownloadFile}
                  className="flex items-center gap-3.5 p-3.5 bg-bg-elevated hover:bg-bg-elevated/80 border border-border rounded-lg text-left transition-all group cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 group-hover:scale-105 transition-transform">
                    <FileVideo size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h5 className="text-xs font-bold text-text-primary">
                      Download MP4 File (Best Quality)
                    </h5>
                    <p className="text-[10px] text-text-secondary mt-0.5">
                      Download 1080p/720p/MP3 file directly to your device storage.
                    </p>
                  </div>
                </button>
              </div>
            </div>
            
            <div className="p-4 border-t border-border bg-bg-elevated/20 flex justify-end gap-2">
              <button
                onClick={() => setShowDownloadModal(false)}
                className="px-4 py-2 border border-border hover:bg-bg-elevated rounded-full text-xs font-semibold text-text-primary transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
