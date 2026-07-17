"use client";

import React from "react";
import { motion } from "framer-motion";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0F0F0F] grid grid-cols-1 md:grid-cols-12 text-[#F1F1F1] overflow-hidden relative">
      {/* Left side: Premium Branding & Ambient Image (Cols 1-7) */}
      <div className="relative hidden md:flex md:col-span-7 flex-col justify-between p-16 overflow-hidden">
        {/* Background Image of high-tech studio / workspace */}
        <div 
          className="absolute inset-0 bg-cover bg-center transition-transform duration-10000 scale-105 hover:scale-100"
          style={{ 
            backgroundImage: "url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80')",
          }}
        />
        {/* Color-graded immersive gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-tr from-[#0F0F0F] via-[#0F0F0F]/95 to-accent/20 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0F0F0F] via-transparent to-transparent opacity-90" />
        
        {/* Animated background floating orbs */}
        <motion.div
          className="absolute -top-20 -left-20 w-80 h-80 rounded-full bg-accent opacity-20 blur-[120px]"
          animate={{
            x: [0, 60, 0],
            y: [0, 40, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        <div className="z-10">
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center"
          >
            <img
              src="/logo.png"
              alt="BLINKUP Logo"
              className="h-10 w-auto object-contain brightness-100"
            />
          </motion.div>
        </div>

        <div className="z-10 flex flex-col gap-6 max-w-lg">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="font-display text-4xl lg:text-5xl xl:text-6xl font-bold leading-tight tracking-tight text-white"
          >
            Your Channels. <br />
            <span className="text-gradient">One Unified Feed.</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-[#AAAAAA] text-base lg:text-lg leading-relaxed"
          >
            Curate your YouTube feeds without distraction. Organize channels, watch streams, and view uploads in a premium custom-controlled cinematic environment.
          </motion.p>
        </div>

        <div className="z-10 text-xs text-[#717171]">
          © {new Date().getFullYear()} BLINKUP. Premium Aggregator Platform.
        </div>
      </div>

      {/* Right side: Form (Cols 8-12 / Full on mobile) */}
      <div className="flex items-center justify-center p-6 md:p-12 md:col-span-5 relative overflow-y-auto bg-[#0F0F0F]">
        {/* Background ambient light */}
        <div className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full bg-accent opacity-10 blur-[100px] pointer-events-none" />
        
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="w-full max-w-md z-10 p-8 rounded-2xl bg-[#161616] border border-[#272727] shadow-[0_0_40px_rgba(0,0,0,0.5)]"
        >
          {children}
        </motion.div>
      </div>
    </div>
  );
}
