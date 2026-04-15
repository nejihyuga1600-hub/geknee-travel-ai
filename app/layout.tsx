import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { SessionProvider } from "next-auth/react";
import GlobalChat from "./components/GlobalChat";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  title: "AI Travel Planner",
  description: "Plan trips step-by-step with AI.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <head>
        {/* Travelpayouts affiliate tracking */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script src="https://tp-em.com/NTE1NTYz.js?t=515563" async />
      </head>
      <body suppressHydrationWarning>
        <SessionProvider>{children}</SessionProvider>
        <GlobalChat />
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
