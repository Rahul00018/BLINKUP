import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: "var(--bg-primary)",
          secondary: "var(--bg-secondary)",
          elevated: "var(--bg-elevated)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          glow: "var(--accent-glow)",
          hover: "var(--accent-hover)",
        },
        text: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          tertiary: "var(--text-tertiary)",
        },
        live: "var(--red-live)",
        border: {
          DEFAULT: "var(--border)",
          hover: "var(--border-hover)",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"],
        display: ["var(--font-syne)", "sans-serif"],
      },
      borderRadius: {
        card: "12px",
        btn: "8px",
        badge: "4px",
      },
      boxShadow: {
        glow: "0 0 24px var(--accent-glow)",
      },
      transitionDuration: {
        DEFAULT: "200ms",
      },
    },
  },
  plugins: [],
};
export default config;
