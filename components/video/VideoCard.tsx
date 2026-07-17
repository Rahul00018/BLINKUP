"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../auth/AuthProvider";
import { createClient } from "../../lib/supabase";
import { useToast } from "../../hooks/useToast";
import { usePlayerStore } from "../../store/playerStore";
import { formatCount, timeAgo, formatDuration } from "../../lib/utils";
import { MoreVertical, Bookmark, Share2, Play } from "lucide-react";
import YoutubeIcon from "../ui/YoutubeIcon";

export interface VideoCardProps {
  id: string;
  title: string;
  thumbnailUrl: string;
  channelId: string;
  channelName: string;
  channelAvatarUrl?: string;
  viewCount: number;
  publishedAt: string;
  duration: number;
  isLive: boolean;
  onClick?: () => void;
}

export default function VideoCard({
  id,
  title,
  thumbnailUrl,
  channelId,
  channelName,
  channelAvatarUrl,
  viewCount,
  publishedAt,
  duration,
  isLive,
  onClick,
}: VideoCardProps) {
  const [hovered, setHovered] = useState(false);
  const [playPreview, setPlayPreview] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const hoverTimeout = useRef<NodeJS.Timeout | null>(null);
  const { user } = useAuth();
  const supabase = createClient();
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (hovered) {
      hoverTimeout.current = setTimeout(() => {
        setPlayPreview(true);
      }, 1000);
    } else {
      if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
      setPlayPreview(false);
    }

    return () => {
      if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    };
  }, [hovered]);

  useEffect(() => {
    if (!user) return;
    const checkIfSaved = async () => {
      const { data } = await supabase
        .from("saved_videos")
        .select("id")
        .eq("user_id", user.id)
        .eq("video_id", id)
        .maybeSingle();
      if (data) setSaved(true);
    };
    checkIfSaved();
  }, [user, id, supabase]);

  const handleSaveVideo = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setMenuOpen(false);

    if (!user) {
      toast("Please log in to save videos", "warning");
      return;
    }

    try {
      if (saved) {
        const { error } = await supabase
          .from("saved_videos")
          .delete()
          .eq("user_id", user.id)
          .eq("video_id", id);
        if (error) throw error;
        setSaved(false);
        toast("Removed from Saved Videos", "success");
      } else {
        const { error } = await supabase.from("saved_videos").insert({
          user_id: user.id,
          video_id: id,
          channel_id: channelId,
          title,
          thumbnail_url: thumbnailUrl,
        });
        if (error) throw error;
        setSaved(true);
        toast("Saved to Saved Videos!", "success");
      }
    } catch (err: any) {
      toast(err.message || "Failed to modify Saved Videos", "error");
    }
  };

  const handleShareVideo = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setMenuOpen(false);

    const watchUrl = `${window.location.origin}/watch/${id}`;
    navigator.clipboard.writeText(watchUrl);
    toast("Video link copied to clipboard!", "success");
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if (onClick) {
      e.preventDefault();
      onClick();
    } else {
      router.push(`/watch/${id}`);
    }
  };

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        setMenuOpen(false);
      }}
      className="flex flex-col gap-3 group relative cursor-pointer"
      onClick={handleCardClick}
    >
      <div className="relative aspect-video rounded-card overflow-hidden border border-border group-hover:border-accent/40 group-hover:shadow-glow transition-all duration-300">
        {playPreview ? (
          <iframe
            src={`https://www.youtube.com/embed/${id}?autoplay=1&mute=1&controls=0&modestbranding=1&rel=0&iv_load_policy=3&showinfo=0`}
            title={title}
            className="w-full h-full object-cover scale-[1.03] pointer-events-none"
            allow="autoplay; encrypted-media"
            frameBorder="0"
          />
        ) : (
          <img
            src={thumbnailUrl}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
          />
        )}

        {!playPreview && (
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-300">
            <div className="w-12 h-12 rounded-full bg-accent text-text-primary flex items-center justify-center shadow-glow">
              <Play size={20} fill="currentColor" className="ml-1" />
            </div>
          </div>
        )}

        {isLive ? (
          <span className="absolute top-2 left-2 bg-live text-white text-[10px] font-bold uppercase px-2 py-0.5 rounded-badge tracking-wider animate-live flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-white" />
            LIVE
          </span>
        ) : (
          <span className="absolute bottom-2 right-2 bg-black/80 text-text-primary text-[11px] font-medium px-1.5 py-0.5 rounded-badge border border-white/5">
            {formatDuration(duration)}
          </span>
        )}
      </div>

      <div className="flex gap-3 px-1">
        <Link
          href={`/channel/${channelId}`}
          onClick={(e) => e.stopPropagation()}
          className="shrink-0"
        >
          {channelAvatarUrl ? (
            <img
              src={channelAvatarUrl}
              alt={channelName}
              className="w-9 h-9 rounded-full border border-border object-cover"
            />
          ) : (
            <div className="w-9 h-9 rounded-full border border-border bg-bg-elevated flex items-center justify-center text-accent text-xs font-semibold">
              {channelName.substring(0, 2).toUpperCase()}
            </div>
          )}
        </Link>

        <div className="flex-1 flex flex-col gap-1 min-w-0 pr-6 relative">
          <h4
            style={{ color: "var(--color-video-title)" }}
            className="font-semibold text-sm leading-tight group-hover:text-accent transition-colors line-clamp-2 pr-2"
          >
            {title}
          </h4>

          <div className="flex flex-col text-xs text-text-secondary">
            <Link
              href={`/channel/${channelId}`}
              onClick={(e) => e.stopPropagation()}
              className="hover:text-text-primary transition-colors truncate w-full"
            >
              {channelName}
            </Link>
            {!isLive && (
              <span>
                {formatCount(viewCount)} views • {timeAgo(publishedAt)}
              </span>
            )}
          </div>

          <div className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setMenuOpen(!menuOpen);
              }}
              className="text-text-secondary hover:text-text-primary p-1 hover:bg-bg-elevated rounded-full cursor-pointer"
            >
              <MoreVertical size={16} />
            </button>

            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setMenuOpen(false);
                  }}
                />
                <div className="absolute right-0 mt-1 w-40 bg-bg-secondary border border-border rounded-card shadow-glow overflow-hidden z-50 py-1">
                  <button
                    onClick={handleSaveVideo}
                    className="flex items-center gap-2 w-full text-left px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors cursor-pointer"
                  >
                    <Bookmark
                      size={14}
                      className={saved ? "text-accent fill-accent" : ""}
                    />
                    {saved ? "Saved" : "Save Video"}
                  </button>

                  <button
                    onClick={handleShareVideo}
                    className="flex items-center gap-2 w-full text-left px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors cursor-pointer"
                  >
                    <Share2 size={14} />
                    Share Link
                  </button>

                  <Link
                    href={`/channel/${channelId}`}
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-2 px-3 py-2 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors"
                  >
                    <YoutubeIcon size={14} />
                    View Channel
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
