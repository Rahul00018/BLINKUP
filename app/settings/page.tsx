"use client";

import React, { useState } from "react";
import AppLayout from "../../components/layout/AppLayout";
import { useAuth } from "../../components/auth/AuthProvider";
import { useUIStore, ACCENT_PRESETS, AccentPreset } from "../../store/uiStore";
import { usePlayerStore } from "../../store/playerStore";
import { useToast } from "../../hooks/useToast";
import { createClient } from "../../lib/supabase";
import {
  User as UserIcon,
  Palette,
  Play,
  Shield,
  Loader2,
  Check,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

type TabType = "account" | "appearance" | "playback" | "privacy";

export default function SettingsPage() {
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const {
    accent,
    setAccent,
    themeMode,
    setThemeMode,
    customAccentColor,
    setCustomAccentColor,
    logoColor,
    setLogoColor,
    watchNowColor,
    setWatchNowColor,
    videoTitleColor,
    setVideoTitleColor,
  } = useUIStore();
  const { autoplayEnabled, setAutoplayEnabled } = usePlayerStore();
  const supabase = createClient();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<TabType>("account");
  const [username, setUsername] = useState(profile?.username || "");
  const [email, setEmail] = useState(user?.email || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Playback local preferences (simulating defaults)
  const [defaultSpeed, setDefaultSpeed] = useState("1");
  const [defaultQuality, setDefaultQuality] = useState("auto");

  const handleUpdateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!user) throw new Error("No user session");

      // 1. Update username in profiles table
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ username })
        .eq("id", user.id);

      if (profileError) throw profileError;

      // 2. Update email/password if filled
      if (email !== user.email || password) {
        const updateParams: any = {};
        if (email !== user.email) updateParams.email = email;
        if (password) {
          if (password !== confirmPassword) {
            throw new Error("Passwords do not match");
          }
          updateParams.password = password;
        }

        const { error: authError } = await supabase.auth.updateUser(updateParams);
        if (authError) throw authError;
      }

      await refreshProfile();
      toast("Account updated successfully!", "success");
      setPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast(err.message || "Failed to update account", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = async () => {
    if (!confirm("Are you sure you want to clear your watch history?")) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from("watch_history")
        .delete()
        .eq("user_id", user?.id);

      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["watchHistory", user?.id] });
      toast("Watch history cleared successfully!", "success");
    } catch (e) {
      toast("Failed to clear history", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleClearSaved = async () => {
    if (!confirm("Are you sure you want to clear all saved videos?")) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from("saved_videos")
        .delete()
        .eq("user_id", user?.id);

      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["savedVideosFullPage", user?.id] });
      toast("Saved videos cleared successfully!", "success");
    } catch (e) {
      toast("Failed to clear saved videos", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 pb-12 max-w-4xl">
        <div className="flex flex-col gap-1 border-b border-border/40 pb-4">
          <h1 className="font-display text-2xl font-bold">Settings</h1>
          <p className="text-text-secondary text-sm">
            Manage your account details and app preferences
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 items-start">
          {/* Vertical Tabs navigation */}
          <div className="flex flex-row md:flex-col gap-1 bg-bg-secondary p-1 rounded-card border border-border md:col-span-1 overflow-x-auto">
            {(
              [
                { id: "account", label: "Account", icon: UserIcon },
                { id: "appearance", label: "Appearance", icon: Palette },
                { id: "playback", label: "Playback", icon: Play },
                { id: "privacy", label: "Privacy", icon: Shield },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-3 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider rounded-btn transition-colors cursor-pointer justify-center md:justify-start shrink-0 ${
                  activeTab === t.id
                    ? "bg-accent text-text-primary shadow-glow"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                <t.icon size={16} />
                {t.label}
              </button>
            ))}
          </div>

          {/* Form Content container */}
          <div className="glass-panel p-6 rounded-card md:col-span-3">
            {/* Account Tab */}
            {activeTab === "account" && (
              <form onSubmit={handleUpdateAccount} className="flex flex-col gap-5">
                <h3 className="font-display font-bold text-lg border-b border-border/50 pb-2">
                  Account Details
                </h3>

                <div className="flex flex-col gap-1">
                  <label className="text-xs uppercase tracking-widest text-text-secondary font-medium">
                    Username
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="bg-bg-primary border border-border focus:border-accent rounded-btn px-4 py-2.5 text-sm text-text-primary focus:outline-none transition-colors"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs uppercase tracking-widest text-text-secondary font-medium">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-bg-primary border border-border focus:border-accent rounded-btn px-4 py-2.5 text-sm text-text-primary focus:outline-none transition-colors"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs uppercase tracking-widest text-text-secondary font-medium">
                    New Password
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-bg-primary border border-border focus:border-accent rounded-btn px-4 py-2.5 text-sm text-text-primary focus:outline-none transition-colors"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs uppercase tracking-widest text-text-secondary font-medium">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="bg-bg-primary border border-border focus:border-accent rounded-btn px-4 py-2.5 text-sm text-text-primary focus:outline-none transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="bg-accent hover:bg-accent-hover disabled:bg-accent/50 text-text-primary font-semibold text-sm rounded-btn py-2.5 px-6 self-start transition-colors cursor-pointer flex items-center gap-2 shadow-glow"
                >
                  {loading && <Loader2 size={16} className="animate-spin" />}
                  Save Changes
                </button>
              </form>
            )}

            {/* Appearance Tab */}
            {activeTab === "appearance" && (
              <div className="flex flex-col gap-6">
                <h3 className="font-display font-bold text-lg border-b border-border/50 pb-2">
                  Appearance Settings
                </h3>

                {/* Theme Mode Toggle */}
                <div className="flex flex-col gap-3">
                  <span className="text-xs uppercase tracking-widest text-text-secondary font-medium">
                    Theme Mode
                  </span>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setThemeMode("dark")}
                      className={`flex-1 py-3 px-4 rounded-btn border font-semibold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                        themeMode === "dark"
                          ? "bg-bg-elevated border-accent text-text-primary shadow-glow"
                          : "bg-bg-primary border-border text-text-secondary hover:text-text-primary"
                      }`}
                    >
                      Dark Mode (Grey-Black)
                    </button>
                    <button
                      onClick={() => setThemeMode("light")}
                      className={`flex-1 py-3 px-4 rounded-btn border font-semibold text-xs uppercase tracking-wider transition-all cursor-pointer ${
                        themeMode === "light"
                          ? "bg-bg-elevated border-accent text-text-primary shadow-glow"
                          : "bg-bg-primary border-border text-text-secondary hover:text-text-primary"
                      }`}
                    >
                      Light Mode
                    </button>
                  </div>
                </div>

                {/* Accent presets */}
                <div className="flex flex-col gap-3">
                  <span className="text-xs uppercase tracking-widest text-text-secondary font-medium">
                    Accent Color Presets
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {Object.keys(ACCENT_PRESETS).map((key) => {
                      const colorPreset = key as AccentPreset;
                      const active = accent === colorPreset && !customAccentColor;
                      const presetInfo = ACCENT_PRESETS[colorPreset];

                      return (
                        <button
                          key={key}
                          onClick={() => setAccent(colorPreset)}
                          className={`flex items-center justify-between p-3.5 rounded-btn border text-left cursor-pointer transition-all ${
                            active
                              ? "bg-bg-elevated border-accent shadow-glow"
                              : "bg-bg-primary border-border hover:border-text-tertiary"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="w-4 h-4 rounded-full"
                              style={{ backgroundColor: presetInfo.color }}
                            />
                            <span className="text-xs font-semibold capitalize text-text-primary">
                              {colorPreset}
                            </span>
                          </div>
                          {active && <Check size={14} className="text-accent" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Hex Color Picker (1000+ choices) */}
                <div className="flex flex-col gap-3 border-t border-border/40 pt-4">
                  <span className="text-xs uppercase tracking-widest text-text-secondary font-medium">
                    Custom Theme Accent Color (1,000+ Options)
                  </span>
                  <div className="flex items-center gap-4 bg-bg-primary p-4 rounded-card border border-border">
                    <div className="relative w-12 h-12 rounded-full overflow-hidden border border-border cursor-pointer shrink-0">
                      <input
                        type="color"
                        value={customAccentColor || ACCENT_PRESETS[accent]?.color || "#6C63FF"}
                        onChange={(e) => setCustomAccentColor(e.target.value)}
                        className="absolute inset-0 w-full h-full scale-150 cursor-pointer appearance-none bg-transparent border-0 outline-none"
                      />
                    </div>
                    <div className="flex flex-col gap-1 flex-1">
                      <span className="text-xs font-semibold text-text-primary">
                        Manual Hex Picker
                      </span>
                      <input
                        type="text"
                        placeholder="#FFFFFF"
                        value={customAccentColor || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "" || val.startsWith("#")) {
                            setCustomAccentColor(val || null);
                          }
                        }}
                        className="bg-bg-secondary border border-border focus:border-accent rounded-btn px-3 py-1.5 text-xs text-text-primary font-mono max-w-[120px] outline-none transition-colors"
                      />
                    </div>
                    {customAccentColor && (
                      <button
                        onClick={() => setCustomAccentColor(null)}
                        className="text-xs font-semibold text-accent hover:underline cursor-pointer"
                      >
                        Reset to Preset
                      </button>
                    )}
                  </div>
                </div>

                {/* Specific Custom Element Colors */}
                <div className="flex flex-col gap-4 border-t border-border/40 pt-6">
                  <span className="text-xs font-bold uppercase tracking-widest text-text-secondary">
                    Custom Component Colors
                  </span>

                  {/* 1. Logo Color */}
                  <div className="flex items-center justify-between p-4 bg-bg-primary rounded-card border border-border gap-4">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-semibold text-text-primary">Logo Color</span>
                      <span className="text-[10px] text-text-secondary">Change the BLINKUP logo branding color.</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={logoColor}
                        onChange={(e) => setLogoColor(e.target.value)}
                        className="w-8 h-8 rounded-full overflow-hidden border border-border cursor-pointer appearance-none bg-transparent"
                      />
                      <button
                        onClick={() => setLogoColor("#FF0000")}
                        className="text-[10px] font-semibold bg-bg-secondary hover:bg-bg-elevated border border-border rounded px-2.5 py-1 transition-colors cursor-pointer text-text-primary"
                      >
                        YouTube Red
                      </button>
                    </div>
                  </div>

                  {/* 2. Watch Now Color */}
                  <div className="flex items-center justify-between p-4 bg-bg-primary rounded-card border border-border gap-4">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-semibold text-text-primary">Watch Now Button Color</span>
                      <span className="text-[10px] text-text-secondary">Change the hero spotlight action button color.</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={watchNowColor}
                        onChange={(e) => setWatchNowColor(e.target.value)}
                        className="w-8 h-8 rounded-full overflow-hidden border border-border cursor-pointer appearance-none bg-transparent"
                      />
                      <button
                        onClick={() => setWatchNowColor("#FF0000")}
                        className="text-[10px] font-semibold bg-bg-secondary hover:bg-bg-elevated border border-border rounded px-2.5 py-1 transition-colors cursor-pointer text-text-primary"
                      >
                        YouTube Red
                      </button>
                    </div>
                  </div>

                  {/* 3. Video Title Color */}
                  <div className="flex items-center justify-between p-4 bg-bg-primary rounded-card border border-border gap-4">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-semibold text-text-primary">Video Title Color</span>
                      <span className="text-[10px] text-text-secondary">Change the video header text colors.</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={videoTitleColor}
                        onChange={(e) => setVideoTitleColor(e.target.value)}
                        className="w-8 h-8 rounded-full overflow-hidden border border-border cursor-pointer appearance-none bg-transparent"
                      />
                      <button
                        onClick={() => setVideoTitleColor(themeMode === "light" ? "#000000" : "#F1F1F1")}
                        className="text-[10px] font-semibold bg-bg-secondary hover:bg-bg-elevated border border-border rounded px-2.5 py-1 transition-colors cursor-pointer text-text-primary"
                      >
                        YouTube Default
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Playback Tab */}
            {activeTab === "playback" && (
              <div className="flex flex-col gap-5">
                <h3 className="font-display font-bold text-lg border-b border-border/50 pb-2">
                  Playback Settings
                </h3>

                <div className="flex items-center justify-between py-2 border-b border-border/30">
                  <div className="flex flex-col">
                    <span className="text-xs uppercase tracking-widest text-text-primary font-medium">
                      Autoplay next video
                    </span>
                    <span className="text-[11px] text-text-secondary">
                      Automatically play the next video in queue when a video ends.
                    </span>
                  </div>
                  <button
                    onClick={() => setAutoplayEnabled(!autoplayEnabled)}
                    className={`w-12 h-6 rounded-full p-1 transition-colors cursor-pointer ${
                      autoplayEnabled ? "bg-accent" : "bg-bg-primary border border-border"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-text-primary transition-transform ${
                        autoplayEnabled ? "translate-x-6" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs uppercase tracking-widest text-text-secondary font-medium">
                    Default playback speed
                  </label>
                  <select
                    value={defaultSpeed}
                    onChange={(e) => setDefaultSpeed(e.target.value)}
                    className="bg-bg-primary border border-border text-sm rounded-btn px-3 py-2 text-text-primary focus:outline-none focus:border-accent cursor-pointer"
                  >
                    <option value="0.5">0.5x</option>
                    <option value="0.75">0.75x</option>
                    <option value="1">Normal (1x)</option>
                    <option value="1.25">1.25x</option>
                    <option value="1.5">1.5x</option>
                    <option value="2">2x</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs uppercase tracking-widest text-text-secondary font-medium">
                    Default video quality
                  </label>
                  <select
                    value={defaultQuality}
                    onChange={(e) => setDefaultQuality(e.target.value)}
                    className="bg-bg-primary border border-border text-sm rounded-btn px-3 py-2 text-text-primary focus:outline-none focus:border-accent cursor-pointer"
                  >
                    <option value="auto">Auto (Default)</option>
                    <option value="highres">1080p / High Definition</option>
                    <option value="medium">480p / Standard Definition</option>
                    <option value="small">360p / Low Bandwidth</option>
                  </select>
                </div>
              </div>
            )}

            {/* Privacy Tab */}
            {activeTab === "privacy" && (
              <div className="flex flex-col gap-6">
                <h3 className="font-display font-bold text-lg border-b border-border/50 pb-2">
                  Privacy Settings
                </h3>

                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between py-2 border-b border-border/30">
                    <div className="flex flex-col">
                      <span className="text-xs uppercase tracking-widest text-text-primary font-medium">
                        Clear Watch History
                      </span>
                      <span className="text-[11px] text-text-secondary">
                        Delete all entries in your history table. This cannot be undone.
                      </span>
                    </div>
                    <button
                      onClick={handleClearHistory}
                      className="bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/20 text-xs font-semibold uppercase tracking-wider px-4 py-2 rounded-btn transition-colors cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>

                  <div className="flex items-center justify-between py-2 border-b border-border/30">
                    <div className="flex flex-col">
                      <span className="text-xs uppercase tracking-widest text-text-primary font-medium">
                        Clear Saved Videos
                      </span>
                      <span className="text-[11px] text-text-secondary">
                        Delete all videos in your saved items queue.
                      </span>
                    </div>
                    <button
                      onClick={handleClearSaved}
                      className="bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/20 text-xs font-semibold uppercase tracking-wider px-4 py-2 rounded-btn transition-colors cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>

                  <div className="flex items-center justify-between py-2 border-b border-border/30">
                    <div className="flex flex-col">
                      <span className="text-xs uppercase tracking-widest text-text-primary font-medium text-red-400">
                        Delete account
                      </span>
                      <span className="text-[11px] text-text-secondary">
                        Permanently close your account and wipe all profile data.
                      </span>
                    </div>
                    <button
                      onClick={() => alert("Account deletion is disabled for safety.")}
                      className="bg-red-500 text-white hover:bg-red-600 text-xs font-semibold uppercase tracking-wider px-4 py-2 rounded-btn transition-colors cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
