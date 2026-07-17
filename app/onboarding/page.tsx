"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../components/auth/AuthProvider";
import { useSubscriptions } from "../../hooks/useSubscriptions";
import { createClient } from "../../lib/supabase";
import { useToast } from "../../hooks/useToast";
import { searchChannels } from "../../lib/youtube";
import { ChannelSearchResult } from "../../types/youtube";
import { formatCount } from "../../lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Check, Loader2, ArrowRight, Sparkles } from "lucide-react";

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ChannelSearchResult[]>([]);
  const [selectedChannels, setSelectedChannels] = useState<ChannelSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const { user, refreshProfile } = useAuth();
  const { subscribe } = useSubscriptions();
  const supabase = createClient();
  const { toast } = useToast();
  const router = useRouter();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    try {
      const data = await searchChannels(query, 12);
      setResults(data);
    } catch (err) {
      toast("Failed to search channels", "error");
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (channel: ChannelSearchResult) => {
    const isSelected = selectedChannels.some((c) => c.id === channel.id);
    if (isSelected) {
      setSelectedChannels(selectedChannels.filter((c) => c.id !== channel.id));
    } else {
      setSelectedChannels([...selectedChannels, channel]);
    }
  };

  const handleNextStep = () => {
    if (selectedChannels.length === 0) {
      toast("Please select at least one channel to continue", "warning");
      return;
    }
    setStep(3);
  };

  const handleCompleteOnboarding = async () => {
    setLoading(true);
    try {
      if (!user) throw new Error("No user session found");

      // Ensure profile row exists in case trigger was skipped
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();

      if (!existingProfile) {
        const username = user.user_metadata?.username || "User_" + user.id.substring(0, 8);
        const avatarUrl = user.user_metadata?.avatar_url || null;
        const { error: profileError } = await supabase
          .from("profiles")
          .insert({
            id: user.id,
            username,
            avatar_url: avatarUrl,
            onboarding_complete: false,
          });
        if (profileError) throw profileError;
      }

      for (const channel of selectedChannels) {
        await subscribe(channel.id);
      }

      const { error } = await supabase
        .from("profiles")
        .update({ onboarding_complete: true })
        .eq("id", user.id);

      if (error) throw error;

      await refreshProfile();
      toast("Welcome to BLINKUP! Feed successfully created.", "success");
      router.push("/");
      router.refresh();
    } catch (err: any) {
      toast(err.message || "Failed to finalize setup", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute -top-40 left-10 w-96 h-96 rounded-full bg-accent opacity-10 blur-[100px]" />
      <div className="absolute bottom-10 -right-40 w-96 h-96 rounded-full bg-accent-hover opacity-10 blur-[120px]" />

      <div className="w-full max-w-3xl bg-bg-secondary border border-border p-8 md:p-12 rounded-card shadow-glow relative z-10 min-h-[500px] flex flex-col justify-between">
        <div className="flex justify-between items-center mb-8 border-b border-border/50 pb-4">
          <span className="font-display font-bold text-accent tracking-wider text-lg">
            BLINKUP
          </span>
          <div className="flex gap-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`w-8 h-1 rounded-full transition-all duration-300 ${
                  s === step ? "bg-accent w-12" : s < step ? "bg-accent" : "bg-bg-elevated"
                }`}
              />
            ))}
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-center">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-6 text-center max-w-lg mx-auto"
              >
                <div className="w-16 h-16 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center mx-auto text-accent mb-2">
                  <Sparkles size={32} />
                </div>
                <h1 className="font-display text-4xl font-bold leading-tight text-gradient">
                  Let&apos;s build your feed
                </h1>
                <p className="text-text-secondary text-base">
                  Search and subscribe to your favorite YouTube channels to curate a unified,
                  premium watching experience.
                </p>
                <button
                  onClick={() => setStep(2)}
                  className="bg-accent hover:bg-accent-hover text-text-primary font-semibold text-sm rounded-btn py-3 px-8 mt-4 transition-colors cursor-pointer self-center flex items-center gap-2 shadow-glow"
                >
                  Get Started <ArrowRight size={16} />
                </button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-6"
              >
                <div className="flex flex-col gap-1">
                  <h2 className="font-display text-2xl font-bold">Search Channels</h2>
                  <p className="text-text-secondary text-sm">
                    Select the channels you want to add to your custom dashboard
                  </p>
                </div>

                <form onSubmit={handleSearch} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Search e.g. Linus Tech Tips, Marques Brownlee..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="flex-1 bg-bg-primary border border-border focus:border-accent rounded-btn px-4 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none transition-colors"
                  />
                  <button
                    type="submit"
                    className="bg-accent hover:bg-accent-hover text-text-primary text-sm font-semibold rounded-btn px-6 py-2.5 transition-colors flex items-center gap-2 cursor-pointer shadow-glow"
                  >
                    {loading ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Search size={16} />
                    )}
                    Search
                  </button>
                </form>

                {selectedChannels.length > 0 && (
                  <div className="flex flex-wrap gap-2 py-2 border-b border-border/30">
                    <span className="text-xs text-text-secondary font-medium self-center mr-1">
                      Selected ({selectedChannels.length}):
                    </span>
                    {selectedChannels.map((channel) => (
                      <div
                        key={channel.id}
                        className="bg-accent/10 border border-accent/30 text-accent text-xs rounded-btn px-2.5 py-1 flex items-center gap-1.5"
                      >
                        <span>{channel.name}</span>
                        <button
                          onClick={() => toggleSelect(channel)}
                          className="hover:text-accent-hover transition-colors font-bold text-xs"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="max-h-[250px] overflow-y-auto space-y-2 pr-2">
                  {results.length > 0 ? (
                    results.map((channel) => {
                      const selected = selectedChannels.some((c) => c.id === channel.id);
                      return (
                        <div
                          key={channel.id}
                          onClick={() => toggleSelect(channel)}
                          className="flex items-center justify-between p-3 bg-bg-primary hover:bg-bg-elevated border border-border/50 hover:border-border rounded-btn cursor-pointer transition-all"
                        >
                          <div className="flex items-center gap-3">
                            <img
                              src={channel.thumbnailUrl}
                              alt={channel.name}
                              className="w-10 h-10 rounded-full border border-border object-cover"
                            />
                            <div className="flex flex-col">
                              <span className="font-semibold text-sm">
                                {channel.name}
                              </span>
                              <span className="text-text-secondary text-xs">
                                {channel.handle} •{" "}
                                {formatCount(channel.subscriberCount)} subs
                              </span>
                            </div>
                          </div>

                          <div
                            className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all ${
                              selected
                                ? "bg-accent border-accent text-text-primary"
                                : "border-border text-transparent"
                            }`}
                          >
                            <Check size={12} strokeWidth={3} />
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-12 text-text-secondary text-sm">
                      Search for channels above to begin.
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-4 border-t border-border/50">
                  <button
                    onClick={handleNextStep}
                    disabled={selectedChannels.length === 0}
                    className="bg-accent hover:bg-accent-hover disabled:bg-accent/40 text-text-primary font-semibold text-sm rounded-btn py-2.5 px-6 transition-all flex items-center gap-2 cursor-pointer shadow-glow"
                  >
                    Confirm Selection <ArrowRight size={16} />
                  </button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-6"
              >
                <div className="flex flex-col gap-1">
                  <h2 className="font-display text-2xl font-bold">
                    Review Subscriptions
                  </h2>
                  <p className="text-text-secondary text-sm">
                    Confirm your selection of {selectedChannels.length} channels to start building your dashboard:
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[250px] overflow-y-auto p-1">
                  {selectedChannels.map((channel) => (
                    <div
                      key={channel.id}
                      className="bg-bg-primary border border-border p-4 rounded-card flex flex-col items-center gap-3 text-center"
                    >
                      <img
                        src={channel.thumbnailUrl}
                        alt={channel.name}
                        className="w-12 h-12 rounded-full border border-border object-cover"
                      />
                      <div className="flex flex-col gap-1 w-full">
                        <span className="font-semibold text-xs truncate w-full">
                          {channel.name}
                        </span>
                        <span className="text-[10px] text-text-tertiary truncate">
                          {channel.handle}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between pt-6 border-t border-border/50">
                  <button
                    onClick={() => setStep(2)}
                    className="text-text-secondary hover:text-text-primary text-sm font-semibold transition-colors cursor-pointer"
                  >
                    ← Back to Search
                  </button>
                  <button
                    onClick={handleCompleteOnboarding}
                    disabled={loading}
                    className="bg-accent hover:bg-accent-hover text-text-primary font-semibold text-sm rounded-btn py-2.5 px-6 transition-colors flex items-center gap-2 cursor-pointer shadow-glow"
                  >
                    {loading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" /> Saving feed...
                      </>
                    ) : (
                      <>
                        Go to your feed <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
