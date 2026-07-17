import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "../lib/supabase";
import { useAuth } from "../components/auth/AuthProvider";
import { useToast } from "./useToast";
import { getChannelById } from "../lib/youtube";

export function useSubscriptions() {
  const { user } = useAuth();
  const supabase = createClient();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: subscriptions = [], isLoading } = useQuery({
    queryKey: ["subscriptions", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("subscriptions")
        .select("channel_id, channels (*)")
        .eq("user_id", user.id);

      if (error) throw error;
      return data.map((item: any) => item.channels).filter(Boolean);
    },
    enabled: !!user,
  });

  const subscribeMutation = useMutation({
    mutationFn: async (channelId: string) => {
      if (!user) throw new Error("Must be logged in");

      // Check if channel already whitelisted
      const { data: existingChannel } = await supabase
        .from("channels")
        .select("id")
        .eq("id", channelId)
        .maybeSingle();

      if (!existingChannel) {
        const channelDetails = await getChannelById(channelId);
        const { error: channelError } = await supabase.from("channels").insert({
          id: channelDetails.id,
          name: channelDetails.name,
          handle: channelDetails.handle,
          description: channelDetails.description,
          thumbnail_url: channelDetails.thumbnailUrl,
          banner_url: channelDetails.bannerUrl,
          subscriber_count: channelDetails.subscriberCount,
          video_count: channelDetails.videoCount,
          last_synced_at: new Date().toISOString(),
        });
        if (channelError) throw channelError;
      }

      const { error: subError } = await supabase.from("subscriptions").insert({
        user_id: user.id,
        channel_id: channelId,
      });
      if (subError) throw subError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscriptions", user?.id] });
      toast("Subscribed successfully!", "success");
    },
    onError: (err: any) => {
      toast(err.message || "Failed to subscribe", "error");
    },
  });

  const unsubscribeMutation = useMutation({
    mutationFn: async (channelId: string) => {
      if (!user) throw new Error("Must be logged in");
      const { error } = await supabase
        .from("subscriptions")
        .delete()
        .eq("user_id", user.id)
        .eq("channel_id", channelId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscriptions", user?.id] });
      toast("Unsubscribed successfully!", "success");
    },
    onError: (err: any) => {
      toast(err.message || "Failed to unsubscribe", "error");
    },
  });

  const isSubscribed = (channelId: string) => {
    return subscriptions.some((ch: any) => ch.id === channelId);
  };

  return {
    subscriptions,
    isLoading,
    subscribe: subscribeMutation.mutateAsync,
    isSubscribing: subscribeMutation.isPending,
    unsubscribe: unsubscribeMutation.mutateAsync,
    isUnsubscribing: unsubscribeMutation.isPending,
    isSubscribed,
  };
}
