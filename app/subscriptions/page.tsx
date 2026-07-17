"use client";

import React, { useState } from "react";
import AppLayout from "../../components/layout/AppLayout";
import { useSubscriptions } from "../../hooks/useSubscriptions";
import ChannelSearchModal from "../../components/channel/ChannelSearchModal";
import { formatCount } from "../../lib/utils";
import { Trash2, Plus, ArrowUpDown, Loader2 } from "lucide-react";
import YoutubeIcon from "../../components/ui/YoutubeIcon";
import Link from "next/link";

type SortType = "name" | "subscribers";

export default function SubscriptionsPage() {
  const { subscriptions, isLoading, unsubscribe } = useSubscriptions();
  const [modalOpen, setModalOpen] = useState(false);
  const [sortBy, setSortBy] = useState<SortType>("name");
  const [unsubscribingId, setUnsubscribingId] = useState<string | null>(null);

  const handleUnsubscribe = async (channelId: string) => {
    setUnsubscribingId(channelId);
    try {
      await unsubscribe(channelId);
    } catch (e) {
      console.error(e);
    } finally {
      setUnsubscribingId(null);
    }
  };

  const getSortedSubscriptions = () => {
    const list = [...subscriptions];
    if (sortBy === "name") {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === "subscribers") {
      list.sort((a, b) => b.subscriber_count - a.subscriber_count);
    }
    return list;
  };

  const sortedList = getSortedSubscriptions();

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/40 pb-4">
          <div className="flex flex-col gap-1">
            <h1 className="font-display text-2xl font-bold">Subscriptions</h1>
            <p className="text-text-secondary text-sm">
              Manage your curated list of {subscriptions.length} YouTube channels
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Sort Dropdown */}
            <div className="flex items-center gap-2">
              <ArrowUpDown size={14} className="text-text-secondary" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortType)}
                className="bg-bg-secondary border border-border text-xs rounded-btn px-3 py-1.5 text-text-primary focus:outline-none focus:border-accent cursor-pointer"
              >
                <option value="name">A-Z</option>
                <option value="subscribers">Most Subscribed</option>
              </select>
            </div>

            {/* Add More button */}
            <button
              onClick={() => setModalOpen(true)}
              className="bg-accent hover:bg-accent-hover text-text-primary font-semibold text-xs uppercase tracking-wider px-4 py-2 rounded-btn transition-colors cursor-pointer flex items-center gap-2 shadow-glow"
            >
              <Plus size={14} /> Add Channels
            </button>
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="bg-bg-secondary border border-border rounded-card p-6 animate-pulse flex flex-col items-center gap-4"
              >
                <div className="w-16 h-16 rounded-full bg-bg-elevated" />
                <div className="h-4 w-2/3 bg-bg-elevated rounded" />
                <div className="h-3.5 w-1/2 bg-bg-elevated rounded" />
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && sortedList.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center max-w-sm mx-auto gap-4">
            <YoutubeIcon size={48} className="text-text-tertiary" />
            <h3 className="font-display text-xl font-bold">No Subscriptions</h3>
            <p className="text-text-secondary text-sm font-medium">
              Subscribe to some YouTube channels to customize your feed dashboard!
            </p>
            <button
              onClick={() => setModalOpen(true)}
              className="bg-accent hover:bg-accent-hover text-text-primary font-semibold text-sm px-6 py-2.5 rounded-btn transition-colors mt-2 shadow-glow cursor-pointer"
            >
              Add Channels
            </button>
          </div>
        )}

        {/* Channels Grid */}
        {!isLoading && sortedList.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {sortedList.map((channel) => (
              <div
                key={channel.id}
                className="bg-bg-secondary border border-border hover:border-border-hover rounded-card p-6 flex flex-col items-center gap-4 text-center relative group transition-all"
              >
                {/* Link to channel */}
                <Link
                  href={`/channel/${channel.id}`}
                  className="flex flex-col items-center gap-3 w-full"
                >
                  <img
                    src={channel.thumbnail_url}
                    alt={channel.name}
                    className="w-20 h-20 rounded-full border border-border object-cover group-hover:scale-105 transition-transform"
                  />
                  <div className="flex flex-col gap-1 w-full min-w-0">
                    <span className="font-display font-bold text-sm text-text-primary group-hover:text-accent transition-colors truncate">
                      {channel.name}
                    </span>
                    <span className="text-text-secondary text-xs truncate">
                      {channel.handle}
                    </span>
                  </div>
                </Link>

                {/* Sub Counter */}
                <span className="text-[11px] text-text-secondary uppercase tracking-wider bg-bg-elevated px-2.5 py-1 rounded-badge">
                  {formatCount(channel.subscriber_count)} subscribers
                </span>

                {/* Unsubscribe overlay button */}
                <button
                  onClick={() => handleUnsubscribe(channel.id)}
                  disabled={unsubscribingId === channel.id}
                  className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white p-2 rounded-btn cursor-pointer"
                  title="Unsubscribe"
                >
                  {unsubscribingId === channel.id ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Trash2 size={14} />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <ChannelSearchModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </AppLayout>
  );
}
