"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Check, Loader2 } from "lucide-react";
import { searchChannels } from "../../lib/youtube";
import { useSubscriptions } from "../../hooks/useSubscriptions";
import { ChannelSearchResult } from "../../types/youtube";
import { formatCount } from "../../lib/utils";

interface ChannelSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ChannelSearchModal({
  isOpen,
  onClose,
}: ChannelSearchModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ChannelSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const { subscribe, isSubscribed } = useSubscriptions();
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setLoading(true);
      try {
        const channels = await searchChannels(query, 15);
        setResults(channels);
      } catch (err) {
        console.error("Error searching channels:", err);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((x) => x !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleAddChannels = async () => {
    setLoading(true);
    try {
      for (const id of selectedIds) {
        if (!isSubscribed(id)) {
          await subscribe(id);
        }
      }
      setSelectedIds([]);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={onClose} />

          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-2xl bg-bg-secondary border border-border rounded-card shadow-glow overflow-hidden z-10 flex flex-col max-h-[85vh]"
          >
            <div className="flex items-center justify-between p-6 border-b border-border">
              <h3 className="font-display text-xl font-bold">Add Channels</h3>
              <button
                onClick={onClose}
                className="text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 border-b border-border">
              <div className="relative">
                <Search
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary"
                  size={18}
                />
                <input
                  type="text"
                  placeholder="Search by YouTube channel name or handle..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full bg-bg-primary border border-border focus:border-accent rounded-btn pl-12 pr-4 py-3 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none transition-colors"
                  autoFocus
                />
              </div>

              {selectedIds.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {selectedIds.map((id) => {
                    const ch = results.find((r) => r.id === id);
                    return (
                      <div
                        key={id}
                        className="bg-accent/15 border border-accent/30 text-accent text-xs rounded-btn px-3 py-1.5 flex items-center gap-2"
                      >
                        <span>{ch?.name || id}</span>
                        <button
                          onClick={() => toggleSelect(id)}
                          className="hover:text-accent-hover transition-colors"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-6 divide-y divide-border/50">
              {loading && results.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3 text-text-secondary text-sm">
                  <Loader2 className="animate-spin text-accent" size={24} />
                  Searching YouTube...
                </div>
              ) : results.length > 0 ? (
                results.map((channel) => {
                  const selected = selectedIds.includes(channel.id);
                  const subbed = isSubscribed(channel.id);

                  return (
                    <div
                      key={channel.id}
                      onClick={() => !subbed && toggleSelect(channel.id)}
                      className={`flex items-center justify-between py-4 px-2 hover:bg-bg-elevated/50 transition-colors rounded-btn cursor-pointer ${
                        subbed ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <img
                          src={channel.thumbnailUrl}
                          alt={channel.name}
                          className="w-12 h-12 rounded-full border border-border object-cover"
                        />
                        <div className="flex flex-col">
                          <span className="font-semibold text-text-primary text-sm">
                            {channel.name}
                          </span>
                          <span className="text-text-secondary text-xs">
                            {channel.handle} •{" "}
                            {formatCount(channel.subscriberCount)} subs
                          </span>
                        </div>
                      </div>

                      {subbed ? (
                        <span className="text-xs uppercase tracking-wider text-text-tertiary font-semibold border border-border rounded-badge px-2.5 py-1">
                          Subscribed
                        </span>
                      ) : (
                        <div
                          className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all ${
                            selected
                              ? "bg-accent border-accent text-text-primary"
                              : "border-border text-transparent hover:border-text-secondary"
                          }`}
                        >
                          <Check size={14} strokeWidth={3} />
                        </div>
                      )}
                    </div>
                  );
                })
              ) : query.trim() ? (
                <div className="text-center py-12 text-text-secondary text-sm">
                  No channels found. Try another search.
                </div>
              ) : (
                <div className="text-center py-12 text-text-secondary text-sm">
                  Start typing to search YouTube channels.
                </div>
              )}
            </div>

            {selectedIds.length > 0 && (
              <div className="p-6 border-t border-border bg-bg-primary/50 flex justify-end">
                <button
                  onClick={handleAddChannels}
                  disabled={loading}
                  className="bg-accent hover:bg-accent-hover text-text-primary font-semibold text-sm px-6 py-2.5 rounded-btn transition-colors cursor-pointer flex items-center gap-2 shadow-glow"
                >
                  {loading && <Loader2 size={16} className="animate-spin" />}
                  Add Selected ({selectedIds.length})
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
