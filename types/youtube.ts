export interface YouTubeChannel {
  id: string;
  name: string;
  handle: string;
  description: string;
  thumbnailUrl: string;
  bannerUrl: string;
  subscriberCount: number;
  videoCount: number;
}

export interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  channelId: string;
  channelName: string;
  channelAvatarUrl?: string;
  viewCount: number;
  publishedAt: string;
  duration: number; // in seconds
  isLive: boolean;
  activeLiveChatId?: string;
}

export interface ChannelSearchResult {
  id: string;
  name: string;
  handle: string;
  description: string;
  thumbnailUrl: string;
  subscriberCount?: number;
}

export interface VideoSearchResult {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  channelId: string;
  channelName: string;
  publishedAt: string;
  isLive: boolean;
}

export interface YouTubePlaylist {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  channelId: string;
  channelName: string;
  videoCount: number;
}
