"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase";
import type { User } from "@supabase/supabase-js";

export type Profile = {
  id: string;
  username: string | null;
  avatar_url: string | null;
  onboarding_complete: boolean;
  created_at: string;
};

type AuthContextType = {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        // If profile does not exist, insert it on the fly
        if (error.code === "PGRST116") {
          const { data: { user: authUser } } = await supabase.auth.getUser();
          const username = authUser?.user_metadata?.username || "User_" + userId.substring(0, 8);
          const avatarUrl = authUser?.user_metadata?.avatar_url || null;

          const { data: newProfile, error: insertError } = await supabase
            .from("profiles")
            .insert({
              id: userId,
              username,
              avatar_url: avatarUrl,
              onboarding_complete: false,
            })
            .select()
            .single();

          if (insertError) throw insertError;
          setProfile(newProfile);
          return;
        }
        throw error;
      }
      setProfile(data);
    } catch (err) {
      console.error("Error fetching/creating profile:", err);
      setProfile(null);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  useEffect(() => {
    let mounted = true;

    const getInitialSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (mounted) {
          if (session) {
            setUser(session.user);
            await fetchProfile(session.user.id);
          } else {
            setUser(null);
            setProfile(null);
          }
        }
      } catch (err) {
        console.error("Error getting session:", err);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    getInitialSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (session) {
        setUser(session.user);
        await fetchProfile(session.user.id);
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);

      if (event === "SIGNED_IN") {
        router.refresh();
      }
      if (event === "SIGNED_OUT") {
        setUser(null);
        setProfile(null);
        router.push("/auth/login");
        router.refresh();
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, router]);

  const signOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    router.push("/auth/login");
    router.refresh();
    setLoading(false);
  };

  return (
    <AuthContext.Provider
      value={{ user, profile, loading, signOut, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
