"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { z } from "zod";
import AuthLayout from "../../../components/auth/AuthLayout";
import { createClient } from "../../../lib/supabase";
import { useToast } from "../../../hooks/useToast";
import { Eye, EyeOff, Loader2 } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

function LoginContent() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    const validation = loginSchema.safeParse({ email, password });
    if (!validation.success) {
      const fieldErrors: { email?: string; password?: string } = {};
      validation.error.issues.forEach((err) => {
        if (err.path[0] === "email") fieldErrors.email = err.message;
        if (err.path[0] === "password") fieldErrors.password = err.message;
      });
      setErrors(fieldErrors);
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      toast("Logged in successfully!", "success");

      const redirect = searchParams.get("redirect");
      if (redirect) {
        router.push(redirect);
      } else {
        router.push("/");
      }
      router.refresh();
    } catch (error: any) {
      toast(error.message || "Failed to log in", "error");
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h2 className="font-display text-3xl font-bold tracking-tight text-white">
            Welcome back
          </h2>
          <p className="text-[#AAAAAA] text-sm">
            Enter your credentials to access your BLINKUP dashboard
          </p>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs uppercase tracking-widest text-[#AAAAAA] font-medium">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full bg-[#0F0F0F] border border-[#272727] focus:border-accent rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-[#717171] focus:outline-none transition-colors focus:bg-[#212121]"
            />
            {errors.email && (
              <span className="text-red-400 text-xs mt-1">{errors.email}</span>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <label className="text-xs uppercase tracking-widest text-[#AAAAAA] font-medium">
                Password
              </label>
              <button
                type="button"
                onClick={() => toast("Password reset is not configured yet.", "info")}
                className="text-xs text-accent hover:text-accent-hover hover:underline transition-colors"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#0F0F0F] border border-[#272727] focus:border-accent rounded-xl pl-4 pr-10 py-2.5 text-sm text-white placeholder:text-[#717171] focus:outline-none transition-colors focus:bg-[#212121]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#AAAAAA] hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && (
              <span className="text-red-400 text-xs mt-1">{errors.password}</span>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent hover:bg-accent-hover disabled:bg-accent/50 text-white font-semibold text-sm rounded-full py-3 transition-colors flex items-center justify-center gap-2 mt-2 cursor-pointer shadow-glow"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Logging in...
              </>
            ) : (
              "Log In"
            )}
          </button>
        </form>

        <p className="text-center text-xs text-[#AAAAAA]">
          Don&apos;t have an account?{" "}
          <Link
            href="/auth/signup"
            className="text-accent hover:text-accent-hover hover:underline font-semibold transition-colors"
          >
            Sign Up
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}

import { Suspense } from "react";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-bg-primary flex items-center justify-center text-text-secondary text-sm">
          <Loader2 className="animate-spin text-accent" size={24} />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
