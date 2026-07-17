"use client";

import React, { useState, createContext, useContext, useCallback } from "react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  toasts: Toast[];
  toast: (message: string, type?: ToastType) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, type: ToastType = "info") => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => {
        removeToast(id);
      }, 4000);
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ toasts, toast, removeToast }}>
      {children}
      {/* Toast Stack */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none max-w-sm w-full">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto p-4 rounded-btn border glass-panel shadow-glow transition-all duration-300 flex items-center justify-between gap-3 text-sm animate-live ${
              t.type === "success"
                ? "border-emerald-500/30 text-emerald-400 bg-emerald-950/20"
                : t.type === "error"
                ? "border-red-500/30 text-red-400 bg-red-950/20"
                : t.type === "warning"
                ? "border-amber-500/30 text-amber-400 bg-amber-950/20"
                : "border-accent/30 text-accent bg-accent/10"
            }`}
          >
            <span>{t.message}</span>
            <button
              onClick={() => removeToast(t.id)}
              className="text-text-secondary hover:text-text-primary transition-colors text-xs font-semibold px-1"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};
