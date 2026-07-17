"use client";

import React from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body
        style={{
          margin: 0,
          padding: 0,
          minHeight: "100vh",
          background: "#0A0A0F",
          color: "#F0F0F8",
          fontFamily: "system-ui, sans-serif",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            maxWidth: 480,
            textAlign: "center",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            alignItems: "center",
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: "rgba(255,60,60,0.1)",
              border: "1px solid rgba(255,60,60,0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
            }}
          >
            ⚠️
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>
            Application Error
          </h1>
          <p style={{ fontSize: 14, color: "#9494A8", margin: 0 }}>
            A critical error occurred. Please refresh the page to continue.
          </p>
          {error?.message && (
            <p
              style={{
                fontSize: 11,
                fontFamily: "monospace",
                color: "#5A5A72",
                background: "#1A1A24",
                border: "1px solid #1E1E2E",
                borderRadius: 6,
                padding: "8px 12px",
                wordBreak: "break-all",
                textAlign: "left",
                width: "100%",
              }}
            >
              {error.message}
            </p>
          )}
          <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
            <button
              onClick={reset}
              style={{
                background: "#6C63FF",
                color: "white",
                border: "none",
                borderRadius: 8,
                padding: "10px 20px",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Try Again
            </button>
            <button
              onClick={() => (window.location.href = "/")}
              style={{
                background: "#1A1A24",
                color: "#F0F0F8",
                border: "1px solid #1E1E2E",
                borderRadius: 8,
                padding: "10px 20px",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Go Home
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
