import type { Metadata } from "next";
import { Inter, Syne } from "next/font/google";
import ClientProviders from "../components/layout/ClientProviders";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
  weight: ["700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "BLINKUP — Premium YouTube Channel Aggregator",
  description: "Curate your own YouTube channel feeds and watch in a premium YouTube-style custom experience.",
  icons: {
    icon: "/icon.png",
    shortcut: "/favicon.ico",
    apple: "/icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${syne.variable}`}>
      <body className="font-sans antialiased bg-bg-primary text-text-primary">
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}

