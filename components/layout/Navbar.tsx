"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../auth/AuthProvider";
import { Search, Bell, Settings, LogOut, Menu, Mic, X, ArrowLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useSubscriptions } from "../../hooks/useSubscriptions";
import { getChannelVideos } from "../../lib/youtube";
import { useUIStore } from "../../store/uiStore";
import { timeAgo } from "../../lib/utils";
import { useToast } from "../../hooks/useToast";

interface NavbarProps {
  onMenuClick?: () => void;
}

export default function Navbar({ onMenuClick }: NavbarProps) {
  const { profile, signOut } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceText, setVoiceText] = useState("Listening...");
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const router = useRouter();

  const { subscriptions } = useSubscriptions();
  const { lastNotificationCheck, setLastNotificationCheck, toggleSidebar, themeMode } = useUIStore();

  // Fetch latest videos from subscribed channels for notifications (limited to last 24h)
  const { data: notificationVideos = [], isLoading: loadingNotifs } = useQuery({
    queryKey: ["notifications", subscriptions.map((s) => s.id)],
    queryFn: async () => {
      if (subscriptions.length === 0) return [];
      
      const promises = subscriptions.slice(0, 8).map(async (sub) => {
        try {
          const { videos } = await getChannelVideos(sub.id);
          return videos.map((v) => ({ ...v, channelAvatar: sub.thumbnail_url }));
        } catch (e) {
          return [];
        }
      });
      
      const results = await Promise.all(promises);
      const allVideos = results.flat();
      
      // Filter: only show videos uploaded within the last 24 hours (single day)
      const oneDayAgo = Date.now() - 24 * 3600 * 1000;
      const singleDayVideos = allVideos.filter(
        (v) => new Date(v.publishedAt).getTime() > oneDayAgo
      );
      
      return singleDayVideos
        .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
        .slice(0, 15);
    },
    enabled: subscriptions.length > 0,
  });

  // Filter visible notifications: only show unread (newer than lastNotificationCheck)
  const displayedNotifs = useMemo(() => {
    if (!notificationVideos || notificationVideos.length === 0) return [];
    if (!lastNotificationCheck) return notificationVideos;
    
    return notificationVideos.filter(
      (v) => new Date(v.publishedAt).getTime() > new Date(lastNotificationCheck).getTime()
    );
  }, [notificationVideos, lastNotificationCheck]);

  // Check if any notifications are unread (newer than lastNotificationCheck)
  const hasUnread = useMemo(() => {
    return displayedNotifs.length > 0;
  }, [displayedNotifs]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  // voice search handler using Web Speech API
  const startVoiceSearch = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      alert("Voice search is not supported in this browser. Please try Google Chrome.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = "en-US";
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
      setVoiceText("Listening...");
    };

    recognition.onerror = (e: any) => {
      console.error("Speech Recognition Error", e);
      setVoiceText("Error occurred. Try again.");
      setTimeout(() => setIsListening(false), 1500);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setVoiceText(transcript);
      setSearchQuery(transcript);
      setTimeout(() => {
        setIsListening(false);
        router.push(`/search?q=${encodeURIComponent(transcript.trim())}`);
      }, 1000);
    };

    recognition.start();
  };

  if (showMobileSearch) {
    return (
      <header className="fixed top-0 left-0 w-full z-50 h-16 border-b border-border bg-bg-primary flex items-center gap-3 px-4 select-none">
        <button
          onClick={() => setShowMobileSearch(false)}
          className="text-text-primary hover:bg-bg-elevated p-2 rounded-full transition-colors cursor-pointer"
          title="Back"
        >
          <ArrowLeft size={20} className="text-text-primary" />
        </button>
        
        <form onSubmit={handleSearchSubmit} className="flex-1 flex items-stretch">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 bg-bg-secondary border border-border/80 rounded-l-full pl-6 pr-4 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent focus:bg-bg-elevated transition-colors"
              autoFocus
            />
          </div>
          <button
            type="submit"
            className="flex items-center justify-center w-16 h-10 border-y border-r border-border/80 bg-bg-elevated/40 hover:bg-bg-elevated rounded-r-full text-text-secondary hover:text-text-primary transition-colors cursor-pointer border-l-0"
            title="Search"
          >
            <Search size={18} />
          </button>
        </form>

        <button
          onClick={startVoiceSearch}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-bg-elevated/50 hover:bg-bg-elevated hover:text-text-primary text-text-secondary transition-colors cursor-pointer shrink-0"
          title="Search with your voice"
        >
          <Mic size={18} />
        </button>
      </header>
    );
  }

  return (
    <header className="fixed top-0 left-0 w-full z-50 h-16 border-b border-border bg-bg-primary flex items-center justify-between px-6 select-none">
      {/* Left: Menu Toggle & Logo */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => {
            if (window.innerWidth < 768 && onMenuClick) {
              onMenuClick();
            } else {
              toggleSidebar();
            }
          }}
          className="text-text-primary hover:bg-bg-elevated p-2 rounded-full transition-colors cursor-pointer"
          title="Navigation menu"
        >
          <Menu size={20} className="text-text-primary" />
        </button>
        <Link
          href="/"
          className="flex items-center gap-2 shrink-0 select-none"
        >
          <img
            src={themeMode === "dark" ? "/logo_dark.png" : "/logo.png"}
            alt="BLINKUP Logo"
            className="h-[24px] w-auto object-contain"
          />
        </Link>
      </div>

      {/* Center: Search Bar & Mic Voice Search (Desktop Only) */}
      <div className="hidden md:flex flex-1 max-w-2xl items-center gap-3 mx-4">
        <form onSubmit={handleSearchSubmit} className="flex-1 flex items-stretch">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 bg-bg-secondary border border-border/80 rounded-l-full pl-6 pr-4 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent focus:bg-bg-elevated transition-colors"
            />
          </div>
          <button
            type="submit"
            className="flex items-center justify-center w-16 h-10 border-y border-r border-border/80 bg-bg-elevated/40 hover:bg-bg-elevated rounded-r-full text-text-secondary hover:text-text-primary transition-colors cursor-pointer border-l-0"
            title="Search"
          >
            <Search size={18} />
          </button>
        </form>

        <button
          onClick={startVoiceSearch}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-bg-elevated/50 hover:bg-bg-elevated hover:text-text-primary text-text-secondary transition-colors cursor-pointer shrink-0"
          title="Search with your voice"
        >
          <Mic size={18} />
        </button>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-4 relative">
        {/* Mobile Search Trigger Icon */}
        <button
          onClick={() => setShowMobileSearch(true)}
          className="md:hidden text-text-secondary hover:text-text-primary p-2 hover:bg-bg-elevated/50 rounded-badge transition-colors cursor-pointer"
          title="Search"
        >
          <Search size={18} />
        </button>

        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => {
              setNotifDropdownOpen(!notifDropdownOpen);
              setDropdownOpen(false);
            }}
            className="text-text-secondary hover:text-text-primary p-2 hover:bg-bg-elevated/50 rounded-badge transition-colors relative cursor-pointer"
          >
            <Bell size={18} />
            {hasUnread && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444] animate-pulse" />
            )}
          </button>

          {notifDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setNotifDropdownOpen(false)}
              />

              <div className="absolute right-0 mt-2 w-80 max-h-[480px] bg-bg-secondary border border-border rounded-card shadow-glow overflow-y-auto z-50 py-1">
                <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                  <span className="text-xs font-bold text-text-primary uppercase tracking-wider">
                    Notifications
                  </span>
                  {displayedNotifs.length > 0 && (
                    <button
                      onClick={() => {
                        setLastNotificationCheck(new Date().toISOString());
                        toast("Marked all as read", "success");
                      }}
                      className="text-[10px] text-accent hover:text-accent-hover font-semibold cursor-pointer select-none"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>

                <div className="divide-y divide-border/40">
                  {loadingNotifs ? (
                    <div className="p-4 text-center text-xs text-text-secondary animate-pulse">
                      Loading uploads...
                    </div>
                  ) : displayedNotifs && displayedNotifs.length > 0 ? (
                    displayedNotifs.map((video) => (
                      <div
                        key={video.id}
                        onClick={() => {
                          setNotifDropdownOpen(false);
                          router.push(`/watch/${video.id}`);
                        }}
                        className="flex gap-3 px-4 py-3 hover:bg-bg-elevated/40 transition-colors cursor-pointer"
                      >
                        <img
                          src={video.channelAvatar || "/default-avatar.png"}
                          alt={video.channelName}
                          className="w-8 h-8 rounded-full object-cover border border-border shrink-0"
                        />
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <p className="text-xs text-text-primary leading-tight line-clamp-2">
                            <span className="font-semibold">{video.channelName}</span> uploaded: {video.title}
                          </p>
                          <span className="text-[9px] text-text-tertiary mt-0.5">
                            {timeAgo(video.publishedAt)}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-xs text-text-secondary">
                      No new uploads from subscriptions.
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* User Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setDropdownOpen(!dropdownOpen);
              setNotifDropdownOpen(false);
            }}
            className="flex items-center gap-2 focus:outline-none cursor-pointer"
          >
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.username || "User"}
                className="w-8 h-8 rounded-full border border-border object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full border border-border bg-bg-elevated flex items-center justify-center text-accent text-sm font-semibold">
                {profile?.username?.substring(0, 2).toUpperCase() || "U"}
              </div>
            )}
          </button>

          {dropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setDropdownOpen(false)}
              />

              <div className="absolute right-0 mt-2 w-48 bg-bg-secondary border border-border rounded-card shadow-glow overflow-hidden z-50">
                <div className="px-4 py-3 border-b border-border">
                  <p className="text-xs text-text-secondary font-medium">
                    Signed in as
                  </p>
                  <p className="text-sm text-text-primary font-semibold truncate">
                    {profile?.username || "User"}
                  </p>
                </div>

                <Link
                  href="/settings"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors"
                >
                  <Settings size={16} />
                  Settings
                </Link>

                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    signOut();
                  }}
                  className="flex items-center gap-3 w-full text-left px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors border-t border-border cursor-pointer"
                >
                  <LogOut size={16} />
                  Log Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Voice Search Listening Overlay */}
      {isListening && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center animate-fade-in">
          <div className="bg-bg-secondary border border-border p-8 rounded-card w-full max-w-sm flex flex-col items-center gap-6 shadow-glow relative">
            <button
              onClick={() => setIsListening(false)}
              className="absolute top-4 right-4 text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
            
            <h3 className="text-base font-bold text-text-primary text-center tracking-wide uppercase">
              Listening
            </h3>
            
            <div className="relative flex items-center justify-center w-24 h-24">
              <div className="absolute inset-0 bg-red-500/20 rounded-full animate-ping" />
              <div className="absolute inset-2 bg-red-500/30 rounded-full animate-pulse" />
              <div className="relative w-16 h-16 rounded-full bg-red-500 flex items-center justify-center shadow-[0_0_20px_rgba(239,68,68,0.4)]">
                <Mic size={26} className="text-white" />
              </div>
            </div>
            
            <p className="text-text-secondary text-sm font-semibold tracking-wide text-center max-w-xs transition-all duration-300">
              &ldquo;{voiceText}&rdquo;
            </p>
          </div>
        </div>
      )}
    </header>
  );
}
