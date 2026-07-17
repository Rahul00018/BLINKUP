"use client";

import React, { useState } from "react";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import { useUIStore } from "../../store/uiStore";
import { useAuth } from "../auth/AuthProvider";
import { Loader2 } from "lucide-react";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { loading, user } = useAuth();
  const { sidebarExpanded } = useUIStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center gap-3 text-text-secondary text-sm">
        <Loader2 className="animate-spin text-accent" size={32} />
        <span className="font-display font-semibold tracking-wider text-accent animate-pulse">
          BLINKUP
        </span>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      {/* Global Top Navbar */}
      <Navbar onMenuClick={() => setMobileMenuOpen(true)} />

      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-64 bg-bg-secondary border-r border-border p-4 flex flex-col justify-between">
            <div className="flex-1 flex flex-col">
              <div className="flex items-center justify-between pb-6 border-b border-border mb-6">
                <span className="font-display text-xl font-bold tracking-wider text-accent">
                  BLINKUP
                </span>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-text-secondary hover:text-text-primary p-2"
                >
                  ✕
                </button>
              </div>

              <SidebarLinksMobile onClose={() => setMobileMenuOpen(false)} />
            </div>
          </div>
        </div>
      )}

      {/* Main Panel */}
      <div
        className={`transition-all duration-300 min-h-screen flex flex-col pt-16 ${
          sidebarExpanded ? "md:pl-56" : "md:pl-[72px]"
        }`}
      >
        <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-[1600px] mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}

// Mobile sidebar link renderer
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, History, Bookmark, Search, Settings } from "lucide-react";
import YoutubeIcon from "../ui/YoutubeIcon";

function SidebarLinksMobile({ onClose }: { onClose: () => void }) {
  const pathname = usePathname();
  const navItems = [
    { name: "Home", href: "/", icon: Home },
    { name: "Subscriptions", href: "/subscriptions", icon: YoutubeIcon },
    { name: "History", href: "/history", icon: History },
    { name: "Saved", href: "/saved", icon: Bookmark },
    { name: "Search", href: "/search", icon: Search },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  return (
    <nav className="space-y-1">
      {navItems.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClose}
            className={`flex items-center gap-4 px-3 py-3 rounded-btn text-sm font-medium transition-all ${
              active
                ? "bg-accent/10 text-accent border-l-2 border-accent"
                : "text-text-secondary hover:text-text-primary hover:bg-bg-elevated"
            }`}
          >
            <item.icon
              size={20}
              className={active ? "text-accent" : "text-text-secondary"}
            />
            <span>{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}
