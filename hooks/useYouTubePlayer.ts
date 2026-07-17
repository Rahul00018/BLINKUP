"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    onYouTubeIframeAPIReady: (() => void) | undefined;
    YT: any;
  }
}

export function useYouTubePlayer(videoId: string, elementId: string, isPiPActive: boolean = false) {
  const [player, setPlayer] = useState<any>(null);
  const [playerState, setPlayerState] = useState<number>(-1);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(100);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [playbackQuality, setPlaybackQuality] = useState<string>("auto");
  const [availableQualities, setAvailableQualities] = useState<string[]>([]);
  const [isBuffering, setIsBuffering] = useState<boolean>(false);

  const lastTimeRef = useRef<number>(0);

  useEffect(() => {
    lastTimeRef.current = currentTime;
  }, [currentTime]);

  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName("script")[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }
  }, []);

  useEffect(() => {
    let isCurrent = true;
    let ytPlayer: any = null;

    const initPlayer = () => {
      if (!window.YT || !window.YT.Player || !isCurrent) return;

      const originUrl = typeof window !== "undefined" ? window.location.origin : "";

      let element: any = elementId;
      if (typeof window !== "undefined") {
        const found = window.document.getElementById(elementId);
        if (found) {
          element = found;
        } else if ((window as any).documentPictureInPicture?.window) {
          const pipDoc = (window as any).documentPictureInPicture.window.document;
          const pipFound = pipDoc.getElementById(elementId);
          if (pipFound) {
            element = pipFound;
          }
        }
      }

      ytPlayer = new window.YT.Player(element, {
        videoId,
        playerVars: {
          autoplay: 1,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          rel: 0,
          showinfo: 0,
          iv_load_policy: 3,
          origin: originUrl,
          widget_referrer: originUrl,
        },
        events: {
          onReady: (event: any) => {
            if (!isCurrent) {
              try { event.target.destroy(); } catch (e) {}
              return;
            }
            const p = event.target;
            setPlayer(p);
            setDuration(p.getDuration() || 0);
            setVolume(p.getVolume() || 100);
            setIsMuted(p.isMuted() || false);
            setPlaybackRate(p.getPlaybackRate() || 1);
            setAvailableQualities(p.getAvailableQualityLevels() || []);

            if (lastTimeRef.current > 0) {
              p.seekTo(lastTimeRef.current, true);
              p.playVideo();
            }
          },
          onStateChange: (event: any) => {
            if (!isCurrent) return;
            const state = event.data;
            setPlayerState(state);

            const p = event.target;
            if (p && p.getCurrentTime) {
              setCurrentTime(p.getCurrentTime() || 0);
            }
            if (p && p.getDuration) {
              setDuration(p.getDuration() || 0);
            }

            if (state === 1) {
              setIsBuffering(false);
            } else if (state === 3) {
              setIsBuffering(true);
            } else {
              setIsBuffering(false);
            }
          },
          onPlaybackRateChange: (event: any) => {
            if (!isCurrent) return;
            setPlaybackRate(event.data);
          },
          onPlaybackQualityChange: (event: any) => {
            if (!isCurrent) return;
            setPlaybackQuality(event.data);
          },
        },
      });
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      const prevCallback = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (prevCallback) prevCallback();
        initPlayer();
      };
    }

    return () => {
      isCurrent = false;
      if (ytPlayer && ytPlayer.destroy) {
        try { ytPlayer.destroy(); } catch (e){}
      }
      setPlayer(null);
    };
  }, [videoId, elementId, isPiPActive]);

  // Bulletproof time and duration polling loop
  useEffect(() => {
    if (!player) return;

    const interval = setInterval(() => {
      try {
        if (player.getCurrentTime) {
          setCurrentTime(player.getCurrentTime() || 0);
        }
        if (player.getDuration) {
          const d = player.getDuration();
          if (d) setDuration(d);
        }
      } catch (e) {
        // Safe to ignore iframe communication errors
      }
    }, 250);

    return () => clearInterval(interval);
  }, [player]);

  const play = () => {
    if (player) player.playVideo();
  };

  const pause = () => {
    if (player) player.pauseVideo();
  };

  const seekTo = (seconds: number) => {
    if (player) {
      player.seekTo(seconds, true);
      setCurrentTime(seconds);
    }
  };

  const changeVolume = (val: number) => {
    if (player) {
      player.setVolume(val);
      setVolume(val);
      if (val > 0 && isMuted) {
        player.unMute();
        setIsMuted(false);
      }
    }
  };

  const toggleMute = () => {
    if (player) {
      if (isMuted) {
        player.unMute();
        setIsMuted(false);
      } else {
        player.mute();
        setIsMuted(true);
      }
    }
  };

  const changeSpeed = (rate: number) => {
    if (player) {
      player.setPlaybackRate(rate);
      setPlaybackRate(rate);
    }
  };

  const changeQuality = (quality: string) => {
    if (player) {
      player.setPlaybackQuality(quality);
      setPlaybackQuality(quality);
    }
  };

  return {
    play,
    pause,
    seekTo,
    setVolume: changeVolume,
    toggleMute,
    setPlaybackRate: changeSpeed,
    setPlaybackQuality: changeQuality,
    currentTime,
    duration,
    playerState,
    volume,
    isMuted,
    playbackRate,
    playbackQuality,
    availableQualities,
    isBuffering,
    playerInstance: player,
  };
}
