"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUIStore } from "../../store/uiStore";
import { useSubscriptions } from "../../hooks/useSubscriptions";
import { useAuth } from "../auth/AuthProvider";
import ChannelSearchModal from "../channel/ChannelSearchModal";
import { useQuery } from "@tanstack/react-query";
import { getChannelVideos } from "../../lib/youtube";
import {
  Home,
  History,
  Settings,
  Plus,
  LogOut,
  User,
  ListVideo,
  Clock,
  ThumbsUp,
  PlaySquare,
  Download,
} from "lucide-react";
import YoutubeIcon from "../ui/YoutubeIcon";

export default function Sidebar() {
  const pathname = usePathname();
  const { sidebarExpanded, lastNotificationCheck } = useUIStore();
  const { subscriptions, isLoading } = useSubscriptions();
  const { signOut } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);

  // Group 1: Core Navigation Items (Removed Shorts)
  const coreNavItems = [
    { name: "Home", href: "/", icon: Home },
  ];

  // Group 2: "You" Items
  const youNavItems = [
    { name: "Your channel", href: "/settings?tab=account", icon: User },
    { name: "History", href: "/history", icon: History },
    { name: "Playlists", href: "/saved", icon: ListVideo },
    { name: "Watch later", href: "/saved", icon: Clock },
    { name: "Liked videos", href: "/saved", icon: ThumbsUp },
    { name: "Your videos", href: "/settings?tab=account", icon: PlaySquare },
    { name: "Downloads", href: "/downloads", icon: Download },
  ];

  // Collapsed View Items (Removed Shorts)
  const collapsedNavItems = [
    { name: "Home", href: "/", icon: Home },
    { name: "Subscriptions", href: "/subscriptions", icon: YoutubeIcon },
    { name: "You", href: "/settings", icon: User },
  ];

  // Query notifications to show blue dot upload indicators in subscriptions
  const { data: notificationVideos } = useQuery<any[]>({
    queryKey: ["notifications", subscriptions.map((s: any) => s.id)],
    queryFn: async () => {
      if (subscriptions.length === 0) return [];
      const promises = subscriptions.slice(0, 8).map(async (sub) => {
        try {
          const { videos } = await getChannelVideos(sub.id);
          return videos;
        } catch (e) {
          return [];
        }
      });
      const results = await Promise.all(promises);
      return results.flat();
    },
    enabled: subscriptions.length > 0,
  });

  // Calculate which channels have uploads newer than lastNotificationCheck
  const channelsWithNewUploads = useMemo(() => {
    if (!notificationVideos || notificationVideos.length === 0 || !lastNotificationCheck) {
      return new Set<string>();
    }
    const unread = new Set<string>();
    notificationVideos.forEach((video) => {
      if (new Date(video.publishedAt).getTime() > new Date(lastNotificationCheck).getTime()) {
        unread.add(video.channelId);
      }
    });
    return unread;
  }, [notificationVideos, lastNotificationCheck]);

  return (
    <aside
      className={`fixed top-16 left-0 z-40 h-[calc(100vh-64px)] border-r border-border bg-bg-secondary transition-all duration-300 flex flex-col justify-between hidden md:flex ${
        sidebarExpanded ? "w-56" : "w-[72px]"
      }`}
    >
      <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden py-3">
        {/* Collapsed Sidebar View */}
        {!sidebarExpanded ? (
          <nav className="px-1.5 space-y-1.5">
            {collapsedNavItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex flex-col items-center justify-center gap-1.5 py-3.5 rounded-xl text-text-primary hover:bg-bg-elevated/50 transition-all group ${
                    active ? "bg-bg-elevated font-semibold" : ""
                  }`}
                >
                  <item.icon
                    size={20}
                    className={active ? "text-text-primary" : "text-text-secondary group-hover:text-text-primary transition-colors"}
                  />
                  <span className="text-[10px] font-medium tracking-normal text-center truncate w-full px-1">
                    {item.name}
                  </span>
                </Link>
              );
            })}
          </nav>
        ) : (
          /* Expanded Sidebar View */
          <div className="space-y-4">
            {/* Group 1: Core Links */}
            <nav className="px-3 space-y-0.5">
              {coreNavItems.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center gap-6 px-4 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                      active
                        ? "bg-bg-elevated text-text-primary font-bold"
                        : "text-text-primary hover:bg-bg-elevated/50"
                    }`}
                  >
                    <item.icon
                      size={20}
                      className={active ? "text-text-primary shrink-0" : "text-text-secondary group-hover:text-text-primary transition-colors shrink-0"}
                    />
                    <span className="truncate text-[13.5px] tracking-wide">{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="border-t border-border/40 mx-3" />

            {/* Group 2: Subscriptions Section */}
            <div className="flex flex-col gap-1 px-3">
              <Link
                href="/subscriptions"
                className="px-4 py-1 flex items-center justify-between text-xs font-bold text-text-primary hover:text-accent transition-colors group/sub-header"
              >
                <span className="tracking-normal text-[14px]">Subscriptions</span>
                <span className="text-text-tertiary group-hover/sub-header:text-accent transition-colors font-bold text-[10px]">&gt;</span>
              </Link>

              <div className="space-y-0.5 max-h-[220px] overflow-y-auto pr-1">
                {isLoading ? (
                  <div className="px-4 py-2 text-xs text-text-tertiary animate-pulse">
                    Loading channels...
                  </div>
                ) : subscriptions.length > 0 ? (
                  subscriptions.map((ch: any) => {
                    const active = pathname === `/channel/${ch.id}`;
                    const isNewUpload = channelsWithNewUploads.has(ch.id);
                    return (
                      <Link
                        key={ch.id}
                        href={`/channel/${ch.id}`}
                        className={`flex items-center justify-between px-4 py-2 rounded-xl transition-colors group ${
                          active
                            ? "bg-bg-elevated text-text-primary font-bold"
                            : "text-text-primary hover:bg-bg-elevated/50"
                        }`}
                      >
                        <div className="flex items-center gap-6 min-w-0">
                          <img
                            src={ch.thumbnail_url}
                            alt={ch.name}
                            className="w-6 h-6 rounded-full border border-border/30 object-cover shrink-0"
                          />
                          <span className="truncate text-[13px] font-medium">{ch.name}</span>
                        </div>
                        {isNewUpload && (
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 ml-auto mr-1" />
                        )}
                      </Link>
                    );
                  })
                ) : (
                  <div className="px-4 py-2 text-xs text-text-tertiary font-medium">
                    No subscriptions yet.
                  </div>
                )}
              </div>

              <button
                onClick={() => setModalOpen(true)}
                className="flex items-center gap-3 w-full rounded-full text-xs font-semibold text-accent bg-accent/5 hover:bg-accent/10 border border-accent/20 px-4 py-2 transition-all cursor-pointer mt-1"
              >
                <Plus size={15} className="shrink-0" />
                <span className="truncate">Add Channels</span>
              </button>
            </div>

            <div className="border-t border-border/40 mx-3" />

            {/* Group 3: "You" Section */}
            <div className="flex flex-col gap-1 px-3">
              <Link
                href="/settings"
                className="px-4 py-1 flex items-center justify-between text-xs font-bold text-text-primary hover:text-accent transition-colors group/you-header"
              >
                <span className="tracking-normal text-[14px]">You</span>
                <span className="text-text-tertiary group-hover/you-header:text-accent transition-colors font-bold text-[10px]">&gt;</span>
              </Link>

              <nav className="space-y-0.5">
                {youNavItems.map((item) => {
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`flex items-center gap-6 px-4 py-2 rounded-xl text-sm font-medium transition-all group ${
                        active
                          ? "bg-bg-elevated text-text-primary font-bold"
                          : "text-text-primary hover:bg-bg-elevated/50"
                      }`}
                    >
                      <item.icon
                        size={18}
                        className={active ? "text-text-primary shrink-0" : "text-text-secondary group-hover:text-text-primary transition-colors shrink-0"}
                      />
                      <span className="truncate text-[13px] font-medium">{item.name}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Panel */}
      <div className="p-4 border-t border-border">
        <button
          onClick={signOut}
          className={`flex items-center w-full rounded-xl text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors cursor-pointer ${
            sidebarExpanded ? "justify-start px-4 py-2.5 gap-6" : "justify-center p-3"
          }`}
          title="Log Out"
        >
          <LogOut size={20} className="shrink-0" />
          {sidebarExpanded && <span className="truncate text-[13px]">Log Out</span>}
        </button>
      </div>

      <ChannelSearchModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </aside>
  );
}
