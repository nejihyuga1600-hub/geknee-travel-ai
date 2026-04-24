import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Fraunces, Inter_Tight } from "next/font/google";
import "./globals.css";

// Design-session tokens (see .planning/design-2026-04-24/prototype/shared.jsx):
//   Fraunces = editorial serif for titles / magic moments
//   Inter Tight = geometric sans for UI
// Exposed at the root so any route can opt in via CSS vars. Geist stays the
// default; individual routes upgrade by referencing var(--font-display) or
// var(--font-ui). Non-breaking.
const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
  weight: ["400", "500", "600", "700", "800", "900"],
});
const interTight = Inter_Tight({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-ui",
  weight: ["300", "400", "500", "600", "700", "800"],
});
import { SessionProvider } from "next-auth/react";
import GlobalChat from "./components/GlobalChat";
import { ToastProvider } from "./components/Toast";
import PostHogProvider from "./components/PostHogProvider";
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
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable} ${fraunces.variable} ${interTight.variable}`}>
      <head>
        {/* Travelpayouts affiliate tracking */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script src="https://tp-em.com/NTE1NTYz.js?t=515563" async />
      </head>
      <body suppressHydrationWarning>
        <SessionProvider>
          <PostHogProvider>
            <ToastProvider>
              <div style={{ animation: 'pageFadeIn 0.35s ease-out' }}>{children}</div>
            </ToastProvider>
          </PostHogProvider>
        </SessionProvider>
        <GlobalChat />
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
