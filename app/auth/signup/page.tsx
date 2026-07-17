"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { z } from "zod";
import AuthLayout from "../../../components/auth/AuthLayout";
import { createClient } from "../../../lib/supabase";
import { useToast } from "../../../hooks/useToast";
import { Eye, EyeOff, Loader2 } from "lucide-react";

const signupSchema = z
  .object({
    username: z
      .string()
      .min(3, "Username must be at least 3 characters")
      .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export default function SignupPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{
    username?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const { toast } = useToast();
  const router = useRouter();
  const supabase = createClient();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    const validation = signupSchema.safeParse({
      username,
      email,
      password,
      confirmPassword,
    });

    if (!validation.success) {
      const fieldErrors: typeof errors = {};
      validation.error.issues.forEach((err) => {
        const field = err.path[0] as keyof typeof errors;
        fieldErrors[field] = err.message;
      });
      setErrors(fieldErrors);
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;

      toast("Verification email sent! Check your inbox.", "success");
      router.push("/auth/login");
    } catch (error: any) {
      toast(error.message || "Failed to sign up", "error");
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h2 className="font-display text-3xl font-bold tracking-tight text-white">
            Create an account
          </h2>
          <p className="text-[#AAAAAA] text-sm">
            Enter your details to register for BLINKUP
          </p>
        </div>

        <form onSubmit={handleSignup} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs uppercase tracking-widest text-[#AAAAAA] font-medium">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="username"
              className="w-full bg-[#0F0F0F] border border-[#272727] focus:border-accent rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-[#717171] focus:outline-none transition-colors focus:bg-[#212121]"
            />
            {errors.username && (
              <span className="text-red-400 text-xs mt-1">{errors.username}</span>
            )}
          </div>

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
            <label className="text-xs uppercase tracking-widest text-[#AAAAAA] font-medium">
              Password
            </label>
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

          <div className="flex flex-col gap-1">
            <label className="text-xs uppercase tracking-widest text-[#AAAAAA] font-medium">
              Confirm Password
            </label>
            <input
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-[#0F0F0F] border border-[#272727] focus:border-accent rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-[#717171] focus:outline-none transition-colors focus:bg-[#212121]"
            />
            {errors.confirmPassword && (
              <span className="text-red-400 text-xs mt-1">
                {errors.confirmPassword}
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent hover:bg-accent-hover disabled:bg-accent/50 text-white font-semibold text-sm rounded-full py-3 transition-colors flex items-center justify-center gap-2 mt-2 cursor-pointer shadow-glow"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Registering...
              </>
            ) : (
              "Sign Up"
            )}
          </button>
        </form>

        <p className="text-center text-xs text-[#AAAAAA]">
          Already have an account?{" "}
          <Link
            href="/auth/login"
            className="text-accent hover:text-accent-hover hover:underline font-semibold transition-colors"
          >
            Log In
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
