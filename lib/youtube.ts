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
  const data = await fetchFromYouTube("channels", {
    part: "snippet,statistics,brandingSettings",
    id: channelId,
  });

  if (!data.items || data.items.length === 0) {
    throw new Error("Channel not found");
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
}

// Search for channels
export async function searchChannels(
  query: string,
  maxResults = 10
): Promise<ChannelSearchResult[]> {
  const data = await fetchFromYouTube("search", {
    part: "snippet",
    type: "channel",
    q: query,
    maxResults: maxResults.toString(),
  });

  if (!data.items) return [];

  // Batch query to get subscriber counts for search results
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
  // Shortcut: uploads playlist ID is UC... replaced with UU...
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
  if (!data.items) return { videos: [] };

  const videoIds = data.items.map((item: any) => item.contentDetails.videoId);
  const allVideos = await getVideosByIds(videoIds);

  // Filter out shorts (duration < 60s) unless it is live
  const filteredVideos = allVideos.filter((v) => v.isLive || v.duration >= 60);

  return {
    videos: filteredVideos,
    nextPageToken: data.nextPageToken,
  };
}

// Get a single video's details
export async function getVideoById(videoId: string): Promise<YouTubeVideo> {
  const videos = await getVideosByIds([videoId]);
  if (videos.length === 0) {
    throw new Error("Video not found");
  }
  return videos[0];
}

// Search for videos
export async function searchVideos(
  query: string,
  options?: { channelId?: string; isLive?: boolean; pageToken?: string; maxResults?: number }
): Promise<{ videos: YouTubeVideo[]; nextPageToken?: string }> {
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
  if (!data.items) return { videos: [] };

  const videoIds = data.items.map((item: any) => item.id.videoId).filter(Boolean);
  const allVideos = await getVideosByIds(videoIds);

  // Filter out shorts unless live
  const filteredVideos = allVideos.filter((v) => v.isLive || v.duration >= 60);

  return {
    videos: filteredVideos,
    nextPageToken: data.nextPageToken,
  };
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
