import {
  YouTubeChannel,
  YouTubeVideo,
  ChannelSearchResult,
  VideoSearchResult,
  YouTubePlaylist,
} from "../types/youtube";
import { parseDuration } from "./utils";

const API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
const BASE_URL = "https://www.googleapis.com/youtube/v3";

async function fetchFromYouTube(endpoint: string, params: Record<string, string>) {
  const queryParams = new URLSearchParams({
    ...params,
    key: API_KEY || "",
  });

  const res = await fetch(`${BASE_URL}/${endpoint}?${queryParams.toString()}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(
      errorData?.error?.message || `YouTube API error: ${res.statusText}`
    );
  }

  return res.json();
}

// Fetch single or multiple channel details
export async function getChannelById(channelId: string): Promise<YouTubeChannel> {
  try {
    const data = await fetchFromYouTube("channels", {
      part: "snippet,statistics,brandingSettings",
      id: channelId,
    });

    if (!data.items || data.items.length === 0) {
      return getMockChannelByIdFallback(channelId);
    }

    const item = data.items[0];
    return {
      id: item.id,
      name: item.snippet.title,
      handle: item.snippet.customUrl || "",
      description: item.snippet.description || "",
      thumbnailUrl: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url || "",
      bannerUrl: item.brandingSettings?.image?.bannerExternalUrl || "",
      subscriberCount: parseInt(item.statistics.subscriberCount || "0", 10),
      videoCount: parseInt(item.statistics.videoCount || "0", 10),
    };
  } catch (error) {
    console.warn("YouTube API channel fetch failed, returning fallback:", error);
    return getMockChannelByIdFallback(channelId);
  }
}

// Search for channels
export async function searchChannels(
  query: string,
  maxResults = 10
): Promise<ChannelSearchResult[]> {
  try {
    const data = await fetchFromYouTube("search", {
      part: "snippet",
      type: "channel",
      q: query,
      maxResults: maxResults.toString(),
    });

    if (!data.items) return getMockChannelsFallback(query);

    const channelIds = data.items.map((item: any) => item.id.channelId).filter(Boolean);
    let subscriberMap: Record<string, number> = {};

    if (channelIds.length > 0) {
      try {
        const statsData = await fetchFromYouTube("channels", {
          part: "statistics",
          id: channelIds.join(","),
        });
        statsData.items?.forEach((item: any) => {
          subscriberMap[item.id] = parseInt(item.statistics.subscriberCount || "0", 10);
        });
      } catch (e) {
        console.error("Failed to fetch stats for searched channels", e);
      }
    }

    return data.items.map((item: any) => ({
      id: item.id.channelId,
      name: item.snippet.title,
      handle: item.snippet.customUrl || "",
      description: item.snippet.description || "",
      thumbnailUrl: item.snippet.thumbnails?.default?.url || "",
      subscriberCount: subscriberMap[item.id.channelId] || 0,
    }));
  } catch (error) {
    console.warn("YouTube API search failed, returning fallback:", error);
    return getMockChannelsFallback(query);
  }
}

// Fetch details for up to 50 videos
export async function getVideosByIds(videoIds: string[]): Promise<YouTubeVideo[]> {
  if (videoIds.length === 0) return [];

  const data = await fetchFromYouTube("videos", {
    part: "snippet,contentDetails,statistics",
    id: videoIds.join(","),
  });

  if (!data.items) return [];

  return data.items.map((item: any) => {
    const isLive =
      item.snippet.liveBroadcastContent === "live" ||
      item.snippet.liveBroadcastContent === "upcoming";

    return {
      id: item.id,
      title: item.snippet.title,
      description: item.snippet.description || "",
      thumbnailUrl:
        item.snippet.thumbnails?.maxres?.url ||
        item.snippet.thumbnails?.high?.url ||
        item.snippet.thumbnails?.medium?.url ||
        "",
      channelId: item.snippet.channelId,
      channelName: item.snippet.channelTitle,
      viewCount: parseInt(item.statistics.viewCount || "0", 10),
      publishedAt: item.snippet.publishedAt,
      duration: parseDuration(item.contentDetails.duration),
      isLive,
      activeLiveChatId: item.liveStreamingDetails?.activeLiveChatId || undefined,
    };
  });
}

// Get videos for a channel uploads playlist (excl. Shorts)
export async function getChannelVideos(
  channelId: string,
  pageToken?: string
): Promise<{ videos: YouTubeVideo[]; nextPageToken?: string }> {
  try {
    const uploadsPlaylistId = channelId.startsWith("UC")
      ? "UU" + channelId.substring(2)
      : channelId;

    const params: Record<string, string> = {
      part: "snippet,contentDetails",
      playlistId: uploadsPlaylistId,
      maxResults: "24",
    };

    if (pageToken) {
      params.pageToken = pageToken;
    }

    const data = await fetchFromYouTube("playlistItems", params);
    if (!data.items) return { videos: getMockVideosFallback(channelId) };

    const videoIds = data.items.map((item: any) => item.contentDetails.videoId);
    const allVideos = await getVideosByIds(videoIds);

    const filteredVideos = allVideos.filter((v) => v.isLive || v.duration >= 60);

    return {
      videos: filteredVideos,
      nextPageToken: data.nextPageToken,
    };
  } catch (error) {
    console.warn("YouTube API channel videos fetch failed, returning fallback:", error);
    return {
      videos: getMockVideosFallback(channelId),
    };
  }
}

// Get a single video's details
export async function getVideoById(videoId: string): Promise<YouTubeVideo> {
  try {
    const videos = await getVideosByIds([videoId]);
    if (videos.length === 0) {
      return getMockVideoByIdFallback(videoId);
    }
    return videos[0];
  } catch (error) {
    console.warn("YouTube API video fetch failed, returning fallback:", error);
    return getMockVideoByIdFallback(videoId);
  }
}

// Search for videos
export async function searchVideos(
  query: string,
  options?: { channelId?: string; isLive?: boolean; pageToken?: string; maxResults?: number }
): Promise<{ videos: YouTubeVideo[]; nextPageToken?: string }> {
  try {
    const params: Record<string, string> = {
      part: "snippet",
      type: "video",
      q: query,
      maxResults: (options?.maxResults || 24).toString(),
    };

    if (options?.channelId) {
      params.channelId = options.channelId;
    }
    if (options?.isLive) {
      params.eventType = "live";
    }
    if (options?.pageToken) {
      params.pageToken = options.pageToken;
    }

    const data = await fetchFromYouTube("search", params);
    if (!data.items) return { videos: getMockVideosFallback(options?.channelId || "") };

    const videoIds = data.items.map((item: any) => item.id.videoId).filter(Boolean);
    const allVideos = await getVideosByIds(videoIds);

    const filteredVideos = allVideos.filter((v) => v.isLive || v.duration >= 60);

    return {
      videos: filteredVideos,
      nextPageToken: data.nextPageToken,
    };
  } catch (error) {
    console.warn("YouTube API search videos failed, returning fallback:", error);
    return {
      videos: getMockVideosFallback(options?.channelId || ""),
    };
  }
}

// Fetch live and scheduled streams for a channel
export async function getLiveStreams(channelId: string): Promise<YouTubeVideo[]> {
  const params = {
    part: "snippet",
    type: "video",
    channelId,
    eventType: "live",
    maxResults: "10",
  };

  const upcomingParams = {
    part: "snippet",
    type: "video",
    channelId,
    eventType: "upcoming",
    maxResults: "10",
  };

  try {
    const [liveData, upcomingData] = await Promise.all([
      fetchFromYouTube("search", params).catch(() => ({ items: [] })),
      fetchFromYouTube("search", upcomingParams).catch(() => ({ items: [] })),
    ]);

    const videoIds = [
      ...(liveData.items || []).map((item: any) => item.id.videoId),
      ...(upcomingData.items || []).map((item: any) => item.id.videoId),
    ].filter(Boolean);

    return await getVideosByIds(videoIds);
  } catch (error) {
    console.error("Error fetching live streams", error);
    return [];
  }
}

// Fetch playlists created by a channel
export async function getPlaylistsByChannelId(
  channelId: string,
  maxResults = 10
): Promise<YouTubePlaylist[]> {
  try {
    const data = await fetchFromYouTube("playlists", {
      part: "snippet,contentDetails",
      channelId,
      maxResults: maxResults.toString(),
    });

    if (!data.items) return [];

    return data.items.map((item: any) => ({
      id: item.id,
      title: item.snippet.title,
      description: item.snippet.description || "",
      thumbnailUrl:
        item.snippet.thumbnails?.high?.url ||
        item.snippet.thumbnails?.medium?.url ||
        item.snippet.thumbnails?.default?.url ||
        "",
      channelId: item.snippet.channelId,
      channelName: item.snippet.channelTitle,
      videoCount: item.contentDetails?.itemCount || 0,
    }));
  } catch (e) {
    console.error("Error fetching channel playlists", e);
    return [];
  }
}

// Fetch videos inside a playlist
export async function getPlaylistVideos(
  playlistId: string,
  maxResults = 25
): Promise<YouTubeVideo[]> {
  try {
    const data = await fetchFromYouTube("playlistItems", {
      part: "snippet,contentDetails",
      playlistId,
      maxResults: maxResults.toString(),
    });

    if (!data.items) return [];

    const videoIds = data.items.map((item: any) => item.contentDetails.videoId).filter(Boolean);
    return await getVideosByIds(videoIds);
  } catch (e) {
    console.error("Error fetching playlist videos", e);
    return [];
  }
}

// Fetch single playlist details
export async function getPlaylistDetails(
  playlistId: string
): Promise<{ title: string; channelName: string }> {
  try {
    const data = await fetchFromYouTube("playlists", {
      part: "snippet",
      id: playlistId,
    });
    if (data.items && data.items.length > 0) {
      return {
        title: data.items[0].snippet.title,
        channelName: data.items[0].snippet.channelTitle,
      };
    }
  } catch (e) {
    console.error("Error fetching playlist details", e);
  }
  return { title: "Playlist", channelName: "" };
}

// Fallback Mock Data for resilient offline / API quota exhaustion support
const MOCK_CHANNELS: ChannelSearchResult[] = [
  {
    id: "UC8gtmd2pB3GjCqLg7GDFt1A", // JEE Wallah
    name: "JEE Wallah",
    handle: "@jeewallah",
    description: "Your ultimate destination for JEE Preparation. Free lectures, strategy, and motivation.",
    thumbnailUrl: "https://yt3.ggpht.com/i1rWscD0-D6dYyU-k2Z8VzWzO_b5G7Y6D4N-lB2N5P1S=s240-c-k-c0x00ffffff-no-rj",
    subscriberCount: 2450000,
  },
  {
    id: "UCiGyVN_u880o3qiLDYrW8yA", // Physics Wallah
    name: "Physics Wallah - Alakh Pandey",
    handle: "@physicswallah",
    description: "Alakh Pandey talks about Physics, Chemistry, and Math concepts.",
    thumbnailUrl: "https://yt3.ggpht.com/ytc/AIdro_nO=s240-c-k-c0x00ffffff-no-rj",
    subscriberCount: 12200000,
  },
  {
    id: "UCq-Fj5jknLsUf-MWSy4_brA", // T-Series
    name: "T-Series",
    handle: "@tseries",
    description: "Official Channel of T-Series, India's largest Music Label & Movie Studio.",
    thumbnailUrl: "https://yt3.ggpht.com/v_4wsb7V=s240-c-k-c0x00ffffff-no-rj",
    subscriberCount: 265000000,
  },
  {
    id: "UCX6OQ3DkcsbYNE6H8uQQuVA", // MrBeast
    name: "MrBeast",
    handle: "@mrbeast",
    description: "I do crazy videos, charity, and challenges.",
    thumbnailUrl: "https://yt3.ggpht.com/ytc/AL5GRJX-s240-c-k-c0x00ffffff-no-rj",
    subscriberCount: 295000000,
  },
  {
    id: "UC-lHJZR3Gqxm24_Vd_AJ5Yw", // PewDiePie
    name: "PewDiePie",
    handle: "@pewdiepie",
    description: "I make videos.",
    thumbnailUrl: "https://yt3.ggpht.com/ytc/AL5GRJW=s240-c-k-c0x00ffffff-no-rj",
    subscriberCount: 111000000,
  },
];

function getMockChannelsFallback(query: string): ChannelSearchResult[] {
  const cleanQuery = query.toLowerCase().trim();
  if (!cleanQuery) return MOCK_CHANNELS;

  const filtered = MOCK_CHANNELS.filter(
    (ch) =>
      ch.name.toLowerCase().includes(cleanQuery) ||
      ch.description.toLowerCase().includes(cleanQuery) ||
      ch.handle.toLowerCase().includes(cleanQuery)
  );

  return filtered.length > 0 ? filtered : MOCK_CHANNELS;
}

function getMockChannelByIdFallback(channelId: string): YouTubeChannel {
  const found = MOCK_CHANNELS.find((c) => c.id === channelId);
  return {
    id: channelId,
    name: found?.name || "JEE Wallah",
    handle: found?.handle || "@jeewallah",
    description: found?.description || "Curated creators aggregation dashboard on BLINKUP.",
    thumbnailUrl: found?.thumbnailUrl || "https://yt3.ggpht.com/i1rWscD0-D6dYyU-k2Z8VzWzO_b5G7Y6D4N-lB2N5P1S=s240-c-k-c0x00ffffff-no-rj",
    bannerUrl: "",
    subscriberCount: found?.subscriberCount || 2450000,
    videoCount: 1450,
  };
}

const MOCK_VIDEOS: YouTubeVideo[] = [
  {
    id: "kJQP7kiw5Fk",
    title: "G.O.A.T - All PW JEE Batches @ 3***/- 🔥",
    description: "Get ready for the best batch of the year from PW Alakh Pandey.",
    thumbnailUrl: "https://i.ytimg.com/vi/kJQP7kiw5Fk/maxresdefault.jpg",
    channelId: "UC8gtmd2pB3GjCqLg7GDFt1A",
    channelName: "JEE Wallah",
    viewCount: 1250000,
    publishedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    duration: 1320,
    isLive: false,
  },
  {
    id: "dQw4w9WgXcQ",
    title: "Rick Astley - Never Gonna Give You Up (Official Music Video)",
    description: "The official video for Never Gonna Give You Up by Rick Astley.",
    thumbnailUrl: "https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
    channelId: "UCq-Fj5jknLsUf-MWSy4_brA",
    channelName: "T-Series",
    viewCount: 1450000000,
    publishedAt: new Date(Date.now() - 3600000 * 24 * 365).toISOString(),
    duration: 212,
    isLive: false,
  },
  {
    id: "2Vv-BfVoq4g",
    title: "I Survived 100 Days In Extreme Environments",
    description: "This was the hardest challenge yet of surviving extreme weather.",
    thumbnailUrl: "https://i.ytimg.com/vi/2Vv-BfVoq4g/maxresdefault.jpg",
    channelId: "UCX6OQ3DkcsbYNE6H8uQQuVA",
    channelName: "MrBeast",
    viewCount: 89000000,
    publishedAt: new Date(Date.now() - 3600000 * 48).toISOString(),
    duration: 1040,
    isLive: false,
  },
];

function getMockVideosFallback(channelId: string): YouTubeVideo[] {
  const filtered = MOCK_VIDEOS.filter((v) => v.channelId === channelId);
  return filtered.length > 0 ? filtered : MOCK_VIDEOS;
}

function getMockVideoByIdFallback(videoId: string): YouTubeVideo {
  const found = MOCK_VIDEOS.find((v) => v.id === videoId);
  if (found) return found;

  return {
    id: videoId,
    title: "G.O.A.T - All PW JEE Batches @ 3***/- 🔥",
    description: "Welcome to this specialized deep-dive session. We discuss core mechanics and problem solving.",
    thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
    channelId: "UC8gtmd2pB3GjCqLg7GDFt1A",
    channelName: "JEE Wallah",
    viewCount: 350000,
    publishedAt: new Date().toISOString(),
    duration: 3600,
    isLive: false,
  };
}
