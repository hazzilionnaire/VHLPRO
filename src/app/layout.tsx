import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { SiteHeader } from "@/components/site-header";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "VHL Pro",
    template: "%s · VHL Pro",
  },
  description:
    "Schedule, weekly RSVP, Blue vs White rosters and stats for the VHL Pro hockey league.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <SiteHeader />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-8 pb-16 sm:px-6">
          {children}
        </main>
        <footer className="border-t border-rink-800 px-4 py-6 text-center text-xs text-muted sm:px-6">
          VHL Pro · Blue vs White, every week.
        </footer>
      </body>
    </html>
  );
}
