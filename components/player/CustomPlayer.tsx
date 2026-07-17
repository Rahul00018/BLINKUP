"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useYouTubePlayer } from "../../hooks/useYouTubePlayer";
import { useToast } from "../../hooks/useToast";
import { usePlayerStore } from "../../store/playerStore";
import { useUIStore } from "../../store/uiStore";
import { formatDuration } from "../../lib/utils";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Settings,
  Maximize,
  Minimize,
  Tv,
  HelpCircle,
  X,
  Loader2,
  RotateCcw,
  Mic,
} from "lucide-react";

const QUALITY_OPTIONS = [
  { label: "Auto", value: "default" },
  { label: "1080p HD", value: "hd1080" },
  { label: "720p HD", value: "hd720" },
  { label: "480p", value: "large" },
  { label: "360p", value: "medium" },
  { label: "240p", value: "small" },
  { label: "144p", value: "tiny" },
];

interface CustomPlayerProps {
  videoId: string;
  description?: string;
  onVideoEnd?: () => void;
}

interface Chapter {
  time: number;
  title: string;
}

export default function CustomPlayer({
  videoId,
  description = "",
  onVideoEnd,
}: CustomPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const { toast } = useToast();
  const pipPlaceholderRef = useRef<HTMLDivElement>(null);
  const originalParentRef = useRef<HTMLElement | null>(null);

  const { theaterMode, setTheaterMode } = usePlayerStore();
  const { themeMode } = useUIStore();
  const [isPiPActive, setIsPiPActive] = useState(false);
  const player = useYouTubePlayer(videoId, "youtube-iframe-player", isPiPActive);

  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [selectedQuality, setSelectedQuality] = useState("default");
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPosition, setHoverPosition] = useState<number>(0);
  const [chapters, setChapters] = useState<Chapter[]>([]);

  // Synchronize playback quality from player
  useEffect(() => {
    if (player.playbackQuality) {
      setSelectedQuality(player.playbackQuality);
    }
  }, [player.playbackQuality]);

  // Voice Command control state
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [voiceCommandText, setVoiceCommandText] = useState("");
  const [showVoiceBanner, setShowVoiceBanner] = useState(false);

  const controlsTimeout = useRef<NodeJS.Timeout | null>(null);

  // Parse Chapters from video description
  useEffect(() => {
    if (!description || !player.duration) return;
    const lines = description.split("\n");
    const parsedChapters: Chapter[] = [];
    const timeRegex = /(?:(\d{1,2}):)?(\d{1,2}):(\d{2})/;

    lines.forEach((line) => {
      const match = line.match(timeRegex);
      if (match) {
        const parts = match[0].split(":");
        let seconds = 0;
        if (parts.length === 3) {
          seconds =
            parseInt(parts[0], 10) * 3600 +
            parseInt(parts[1], 10) * 60 +
            parseInt(parts[2], 10);
        } else {
          seconds = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
        }

        const title = line.replace(match[0], "").replace(/[-:|]/g, "").trim();
        if (seconds < player.duration) {
          parsedChapters.push({ time: seconds, title: title || "Chapter" });
        }
      }
    });

    setChapters(parsedChapters.sort((a, b) => a.time - b.time));
  }, [description, player.duration]);

  // Autoplay next video on end
  useEffect(() => {
    if (player.playerState === 0) {
      if (onVideoEnd) onVideoEnd();
    }
  }, [player.playerState, onVideoEnd]);

  // Listen to external seek and time query events
  useEffect(() => {
    const handleSeek = (e: Event) => {
      const seconds = (e as CustomEvent).detail;
      player.seekTo(seconds);
      player.play();
    };

    const handleGetTime = () => {
      if (player.playerInstance) {
        window.dispatchEvent(
          new CustomEvent("report-player-time", {
            detail: {
              currentTime: player.currentTime,
              duration: player.duration,
            },
          })
        );
      }
    };

    window.addEventListener("seek-player", handleSeek);
    window.addEventListener("get-player-time", handleGetTime);

    return () => {
      window.removeEventListener("seek-player", handleSeek);
      window.removeEventListener("get-player-time", handleGetTime);
    };
  }, [player]);

  // Auto-hide controls
  const resetControlsTimeout = useCallback(() => {
    setShowControls(true);
    if (controlsTimeout.current) clearTimeout(controlsTimeout.current);

    if (player.playerState === 1) {
      controlsTimeout.current = setTimeout(() => {
        setShowControls(false);
        setShowSpeedMenu(false);
        setShowQualityMenu(false);
      }, 3000);
    }
  }, [player.playerState]);

  useEffect(() => {
    const handleMouseMove = () => resetControlsTimeout();
    const container = containerRef.current;
    if (container) {
      container.addEventListener("mousemove", handleMouseMove);
    }

    resetControlsTimeout();

    return () => {
      if (container) {
        container.removeEventListener("mousemove", handleMouseMove);
      }
      if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
    };
  }, [resetControlsTimeout]);

  // Fullscreen toggle helper
  const toggleFullscreen = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container
        .requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch((err) => console.error("Error enabling fullscreen", err));
    } else {
      document
        .exitFullscreen()
        .then(() => setIsFullscreen(false))
        .catch((err) => console.error("Error exiting fullscreen", err));
    }
  }, []);

  // Listen to fullscreen changes outside hotkeys
  useEffect(() => {
    const handleFSChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFSChange);
    return () => document.removeEventListener("fullscreenchange", handleFSChange);
  }, []);

  // Picture in Picture
  const togglePiP = async () => {
    try {
      const container = containerRef.current;
      if (!container) return;

      if (isPiPActive) {
        if ((window as any).documentPictureInPicture?.window) {
          (window as any).documentPictureInPicture.window.close();
        } else {
          setIsPiPActive(false);
        }
        return;
      }

      if ("documentPictureInPicture" in window) {
        const pip = (window as any).documentPictureInPicture;
        const pipWindow = await pip.requestWindow({
          width: 560,
          height: 315,
        });

        setIsPiPActive(true);
        originalParentRef.current = container.parentElement;

        if (pipPlaceholderRef.current) {
          pipPlaceholderRef.current.style.display = "block";
        }

        // Copy styles
        Array.from(document.styleSheets).forEach((styleSheet) => {
          try {
            const cssRules = Array.from(styleSheet.cssRules).map((rule: any) => rule.cssText).join("");
            const style = document.createElement("style");
            style.textContent = cssRules;
            pipWindow.document.head.appendChild(style);
          } catch (e) {
            if (styleSheet.href) {
              const link = document.createElement("link");
              link.rel = "stylesheet";
              link.href = styleSheet.href;
              pipWindow.document.head.appendChild(link);
            }
          }
        });

        container.classList.add("pip-active");
        pipWindow.document.body.appendChild(container);
        pipWindow.document.body.style.margin = "0";
        pipWindow.document.body.style.backgroundColor = "#0F0F0F";
        pipWindow.document.body.style.overflow = "hidden";

        pipWindow.addEventListener("pagehide", () => {
          setIsPiPActive(false);
          container.classList.remove("pip-active");
          if (originalParentRef.current && pipPlaceholderRef.current) {
            originalParentRef.current.insertBefore(container, pipPlaceholderRef.current);
            pipPlaceholderRef.current.style.display = "none";
          }
        });

        toast("Picture-in-Picture window opened!", "success");
      } else {
        setIsPiPActive(true);
        toast("Floating mini-player activated!", "success");
      }
    } catch (e) {
      console.error(e);
      toast("Picture-in-Picture failed", "error");
    }
  };

  // Keyboard Shortcuts handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName.toLowerCase();
      if (tag === "input" || tag === "textarea") return;

      const key = e.key.toLowerCase();

      switch (e.key) {
        case " ":
        case "k":
        case "K":
          e.preventDefault();
          player.playerState === 1 ? player.pause() : player.play();
          resetControlsTimeout();
          break;
        case "f":
        case "F":
          e.preventDefault();
          toggleFullscreen();
          break;
        case "m":
        case "M":
          e.preventDefault();
          player.toggleMute();
          break;
        case "t":
        case "T":
          e.preventDefault();
          setTheaterMode(!theaterMode);
          break;
        case "i":
        case "I":
          e.preventDefault();
          togglePiP();
          break;
        case "?":
          e.preventDefault();
          setShowShortcutsHelp((prev) => !prev);
          break;
        case "ArrowRight":
          e.preventDefault();
          player.seekTo(Math.min(player.currentTime + 5, player.duration));
          resetControlsTimeout();
          break;
        case "ArrowLeft":
          e.preventDefault();
          player.seekTo(Math.max(player.currentTime - 5, 0));
          resetControlsTimeout();
          break;
        case "j":
        case "J":
          e.preventDefault();
          player.seekTo(Math.max(player.currentTime - 10, 0));
          resetControlsTimeout();
          break;
        case "l":
        case "L":
          e.preventDefault();
          player.seekTo(Math.min(player.currentTime + 10, player.duration));
          resetControlsTimeout();
          break;
        case "ArrowUp":
          e.preventDefault();
          player.setVolume(Math.min(player.volume + 10, 100));
          resetControlsTimeout();
          break;
        case "ArrowDown":
          e.preventDefault();
          player.setVolume(Math.max(player.volume - 10, 0));
          resetControlsTimeout();
          break;
        default:
          if (/[1-9]/.test(key)) {
            const percentage = parseInt(key, 10) * 10;
            const targetSeconds = (player.duration * percentage) / 100;
            player.seekTo(targetSeconds);
            resetControlsTimeout();
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [player, theaterMode, setTheaterMode, toggleFullscreen, resetControlsTimeout]);

  // Voice command playback control
  const startVoiceControl = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast("Voice control is not supported in this browser. Try Google Chrome.", "warning");
      return;
    }

    if (isVoiceActive) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsVoiceActive(false);
      setShowVoiceBanner(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.continuous = true;
    recognition.lang = "en-US";
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsVoiceActive(true);
      setShowVoiceBanner(true);
      setVoiceCommandText("Voice control active! Say 'Play', 'Pause', 'Mute', 'Unmute'...");
    };

    recognition.onerror = (e: any) => {
      console.error("Player voice command error", e);
      setIsVoiceActive(false);
      setShowVoiceBanner(false);
    };

    recognition.onend = () => {
      setIsVoiceActive(false);
      setShowVoiceBanner(false);
    };

    recognition.onresult = (event: any) => {
      const resultIndex = event.resultIndex;
      const command = event.results[resultIndex][0].transcript.toLowerCase().trim();
      setVoiceCommandText(`Command detected: "${command}"`);

      // Match commands
      if (command.includes("pause") || command.includes("stop")) {
        player.pause();
        toast("Paused by voice command", "success");
      } else if (command.includes("play") || command.includes("start") || command.includes("resume")) {
        player.play();
        toast("Playing by voice command", "success");
      } else if (command.includes("unmute") || command.includes("sound on")) {
        if (player.isMuted) player.toggleMute();
        toast("Unmuted by voice command", "success");
      } else if (command.includes("mute") || command.includes("silence")) {
        if (!player.isMuted) player.toggleMute();
        toast("Muted by voice command", "success");
      } else if (command.includes("next") || command.includes("skip")) {
        if (onVideoEnd) {
          onVideoEnd();
          toast("Skipping to next video", "success");
        }
      }
    };

    recognition.start();
  };

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // Scrubbing calculations
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || !player.duration) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    player.seekTo(pos * player.duration);
  };

  const handleProgressMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || !player.duration) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    setHoverTime(pos * player.duration);
    setHoverPosition(e.clientX - rect.left);
  };

  const handleProgressMouseLeave = () => {
    setHoverTime(null);
  };

  const progressPercent = player.duration
    ? (player.currentTime / player.duration) * 100
    : 0;

  return (
    <>
      {/* Placeholder to keep layout spacing when player goes fixed-floating */}
      <div
        ref={pipPlaceholderRef}
        className="w-full aspect-video rounded-card bg-bg-secondary hidden shrink-0"
      />
      <div
        ref={containerRef}
        className={`relative bg-black border border-border/80 overflow-hidden select-none group w-full ${
          isPiPActive && !("documentPictureInPicture" in window)
            ? "fixed bottom-6 right-6 w-[360px] aspect-video z-[9999] shadow-glow border border-accent rounded-xl"
            : theaterMode && !isFullscreen
            ? "aspect-[21/9] max-h-[75vh]"
            : "aspect-video max-h-[65vh]"
        } rounded-card transition-all duration-300 shadow-glow`}
      >
      {/* 1. Underlying YouTube Player IFrame */}
      <div className="absolute inset-0 w-full h-full pointer-events-none">
        <div key={isPiPActive ? "pip" : "normal"} id="youtube-iframe-player" className="w-full h-full scale-[1.01]" />
      </div>

      {/* 2. Backdrop click handler for Play/Pause */}
      <div
        className="absolute inset-0 z-10 cursor-pointer"
        onClick={() => {
          player.playerState === 1 ? player.pause() : player.play();
          resetControlsTimeout();
        }}
      />

      {/* 3. Buffering / Loading State */}
      {player.isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-20 pointer-events-none">
          <Loader2 className="w-12 h-12 text-red-500 animate-spin" />
        </div>
      )}

      {/* Voice Control Top Bar */}
      {showVoiceBanner && (
        <div className="absolute top-4 left-4 z-40 bg-black/85 border border-red-500/30 text-white rounded-badge px-4 py-2 flex items-center gap-3 text-xs shadow-lg animate-pulse">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
          <span>{voiceCommandText}</span>
        </div>
      )}

      {/* Mini Always-Visible Progress Line at bottom (visible when controls are hidden) */}
      {!showControls && (
        <div className="absolute bottom-0 left-0 w-full h-[3px] bg-white/20 z-20 pointer-events-none">
          <div
            className={`h-full transition-all duration-100 ${
              themeMode === "light" ? "bg-white" : "bg-red-600"
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      {/* 5. Custom Overlay Controls Container */}
      <div
        ref={controlsRef}
        className={`absolute inset-x-0 bottom-0 z-30 transition-all duration-300 flex flex-col p-4 bg-gradient-to-t from-black/95 via-black/50 to-transparent ${
          showControls ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3 pointer-events-none"
        }`}
      >
        {/* Scrubber Preview Time */}
        {hoverTime !== null && (
          <div
            className="absolute bottom-16 bg-bg-secondary border border-border text-white px-2 py-1 rounded-badge text-xs font-semibold -translate-x-1/2 shadow-glow"
            style={{ left: `${hoverPosition}px` }}
          >
            {formatDuration(hoverTime)}
          </div>
        )}

        {/* Custom Progress Bar (Scrubber) */}
        <div
          ref={progressBarRef}
          onClick={handleProgressClick}
          onMouseMove={handleProgressMouseMove}
          onMouseLeave={handleProgressMouseLeave}
          className="relative w-full h-1 bg-white/30 hover:h-1.5 cursor-pointer mb-3.5 transition-all flex items-center group/progress"
        >
          {/* Progress fill */}
          <div
            className={`h-full rounded-full relative transition-colors ${
              themeMode === "light" ? "bg-white" : "bg-red-600"
            }`}
            style={{ width: `${progressPercent}%` }}
          >
            {/* Scrubber Knob Handle */}
            <div className={`absolute -right-1.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border scale-0 group-hover/progress:scale-100 transition-transform shadow-glow shrink-0 ${
              themeMode === "light" ? "bg-white border-black" : "bg-red-600 border-white"
            }`} />
          </div>

          {/* Chapter Markers */}
          {chapters.map((chapter, idx) => {
            const position = (chapter.time / player.duration) * 100;
            return (
              <div
                key={idx}
                className="absolute w-[2px] h-full bg-black/60"
                style={{ left: `${position}%` }}
                title={chapter.title}
              />
            );
          })}
        </div>

        {/* Lower Controls Panel - ALWAYS White Icons for visibility */}
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-4">
            {/* Play/Pause */}
            <button
              onClick={() => {
                player.playerState === 1 ? player.pause() : player.play();
                resetControlsTimeout();
              }}
              className="text-white hover:text-red-500 transition-colors cursor-pointer"
            >
              {player.playerState === 1 ? (
                <Pause size={20} fill="currentColor" />
              ) : (
                <Play size={20} fill="currentColor" />
              )}
            </button>

            {/* Next queue video */}
            {onVideoEnd && (
              <button
                onClick={onVideoEnd}
                className="text-white hover:text-red-500 transition-colors cursor-pointer"
                title="Next video"
              >
                <RotateCcw className="scale-x-[-1]" size={18} />
              </button>
            )}

            {/* Volume controls */}
            <div className="flex items-center gap-2 group/volume">
              <button
                onClick={() => player.toggleMute()}
                className="text-white hover:text-red-500 transition-colors cursor-pointer"
              >
                {player.isMuted || player.volume === 0 ? (
                  <VolumeX size={20} />
                ) : (
                  <Volume2 size={20} />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="100"
                value={player.isMuted ? 0 : player.volume}
                onChange={(e) => player.setVolume(parseInt(e.target.value))}
                className="w-0 group-hover/volume:w-20 transition-all duration-300 h-1 accent-red-600 bg-white/20 rounded-full cursor-pointer appearance-none outline-none"
              />
            </div>

            {/* Time Stamp */}
            <div className="text-xs text-white/80 font-medium">
              <span>{formatDuration(player.currentTime)}</span>
              <span className="mx-1.5 text-white/50">/</span>
              <span className="text-white/60">{formatDuration(player.duration)}</span>
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-4 relative">
            {/* Player voice command mic button */}
            <button
              onClick={startVoiceControl}
              className={`p-1 rounded-full transition-colors cursor-pointer ${
                isVoiceActive
                  ? "text-red-500 bg-red-500/10 border border-red-500/30 animate-pulse"
                  : "text-white hover:text-red-500"
              }`}
              title="Voice Control (say Pause/Play/Mute/Next)"
            >
              <Mic size={18} />
            </button>

            {/* Playback speed selector */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowSpeedMenu(!showSpeedMenu);
                  setShowQualityMenu(false);
                }}
                className="text-xs font-bold hover:text-red-500 transition-colors cursor-pointer px-2 py-0.5 rounded bg-white/10 text-white"
              >
                {player.playbackRate}x
              </button>

              {showSpeedMenu && (
                <div className="absolute bottom-10 right-0 bg-bg-elevated border border-border rounded-card shadow-glow overflow-hidden z-50 py-1 w-24">
                  {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((rate) => (
                    <button
                      key={rate}
                      onClick={() => {
                        player.setPlaybackRate(rate);
                        setShowSpeedMenu(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 text-xs hover:bg-bg-secondary text-white transition-colors ${
                        player.playbackRate === rate ? "text-red-500 font-bold" : ""
                      }`}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Quality Selector */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowQualityMenu(!showQualityMenu);
                  setShowSpeedMenu(false);
                }}
                className="text-xs font-bold hover:text-red-500 transition-colors cursor-pointer px-2 py-0.5 rounded bg-white/10 text-white flex items-center gap-1"
                title="Select Quality"
              >
                <Settings size={12} />
                <span>
                  {QUALITY_OPTIONS.find((opt) => opt.value === selectedQuality)?.label.replace(" HD", "") || "Auto"}
                </span>
              </button>

              {showQualityMenu && (
                <div className="absolute bottom-10 right-0 bg-bg-elevated border border-border rounded-card shadow-glow overflow-hidden z-50 py-1 w-36">
                  <div className="px-3 py-1.5 border-b border-border text-[10px] font-semibold uppercase tracking-widest text-text-secondary">
                    Quality
                  </div>
                  {QUALITY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        player.setPlaybackQuality(opt.value);
                        setSelectedQuality(opt.value);
                        setShowQualityMenu(false);
                        toast(`Quality set to ${opt.label}`, "success");
                      }}
                      className={`w-full text-left px-3 py-1.5 text-xs hover:bg-bg-secondary text-white transition-colors flex items-center justify-between ${
                        selectedQuality === opt.value ? "text-red-500 font-bold" : ""
                      }`}
                    >
                      <span>{opt.label}</span>
                      {selectedQuality === opt.value && (
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* PiP */}
            <button
              onClick={togglePiP}
              className="text-white hover:text-red-500 transition-colors cursor-pointer"
              title="Picture in Picture"
            >
              <Tv size={18} />
            </button>

            {/* Theater Mode */}
            <button
              onClick={() => setTheaterMode(!theaterMode)}
              className="text-white hover:text-red-500 transition-colors cursor-pointer hidden md:block"
              title="Theater Mode (T)"
            >
              <Minimize size={18} className={theaterMode ? "scale-x-[-1]" : "hidden"} />
              <Maximize size={18} className={theaterMode ? "hidden" : ""} />
            </button>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="text-white hover:text-red-500 transition-colors cursor-pointer"
              title="Fullscreen (F)"
            >
              {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
            </button>

            {/* Shortcuts Guide Button */}
            <button
              onClick={() => setShowShortcutsHelp(true)}
              className="text-white/70 hover:text-red-500 transition-colors cursor-pointer"
              title="Keyboard Shortcuts (?)"
            >
              <HelpCircle size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* 6. Keyboard Shortcuts Modal Overlay */}
      {showShortcutsHelp && (
        <div className="absolute inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-6 text-white">
          <div className="w-full max-w-md bg-bg-secondary border border-border p-6 rounded-card shadow-glow relative">
            <button
              onClick={() => setShowShortcutsHelp(false)}
              className="absolute top-4 right-4 text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
            <h3 className="font-display font-bold text-lg mb-4 flex items-center gap-2 text-white">
              <HelpCircle size={18} className="text-red-500" /> Keyboard Shortcuts
            </h3>
            <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs text-white/90">
              <div className="flex justify-between border-b border-border/50 pb-1.5">
                <span className="text-text-secondary">Play / Pause</span>
                <kbd className="bg-bg-elevated px-1.5 py-0.5 rounded border border-border font-bold">
                  Space / K
                </kbd>
              </div>
              <div className="flex justify-between border-b border-border/50 pb-1.5">
                <span className="text-text-secondary">Mute Toggle</span>
                <kbd className="bg-bg-elevated px-1.5 py-0.5 rounded border border-border font-bold">
                  M
                </kbd>
              </div>
              <div className="flex justify-between border-b border-border/50 pb-1.5">
                <span className="text-text-secondary">Seek ±5s</span>
                <kbd className="bg-bg-elevated px-1.5 py-0.5 rounded border border-border font-bold">
                  ← / →
                </kbd>
              </div>
              <div className="flex justify-between border-b border-border/50 pb-1.5">
                <span className="text-text-secondary">Seek ±10s</span>
                <kbd className="bg-bg-elevated px-1.5 py-0.5 rounded border border-border font-bold">
                  J / L
                </kbd>
              </div>
              <div className="flex justify-between border-b border-border/50 pb-1.5">
                <span className="text-text-secondary">Volume ±10%</span>
                <kbd className="bg-bg-elevated px-1.5 py-0.5 rounded border border-border font-bold">
                  ↑ / ↓
                </kbd>
              </div>
              <div className="flex justify-between border-b border-border/50 pb-1.5">
                <span className="text-text-secondary">Seek to 10%-90%</span>
                <kbd className="bg-bg-elevated px-1.5 py-0.5 rounded border border-border font-bold">
                  1 - 9
                </kbd>
              </div>
              <div className="flex justify-between border-b border-border/50 pb-1.5">
                <span className="text-text-secondary">Theater Mode</span>
                <kbd className="bg-bg-elevated px-1.5 py-0.5 rounded border border-border font-bold">
                  T
                </kbd>
              </div>
              <div className="flex justify-between border-b border-border/50 pb-1.5">
                <span className="text-text-secondary">Fullscreen</span>
                <kbd className="bg-bg-elevated px-1.5 py-0.5 rounded border border-border font-bold">
                  F
                </kbd>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
}
