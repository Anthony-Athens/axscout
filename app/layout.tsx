import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { SITE_URL } from "@/lib/site";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "AXScout | Baseball Intelligence Platform",
    template: "%s | AXScout",
  },
  description:
    "AXScout is a baseball intelligence platform delivering advanced team analytics, player intelligence, scouting reports, Statcast insights, predictions, and data-driven MLB analysis.",
  alternates: { canonical: SITE_URL },
  openGraph: {
    title: "AXScout | Baseball Intelligence Platform",
    description:
      "AXScout is a baseball intelligence platform delivering advanced team analytics, player intelligence, scouting reports, Statcast insights, predictions, and data-driven MLB analysis.",
    siteName: "AXScout",
    type: "website",
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "AXScout | Baseball Intelligence Platform",
    description:
      "AXScout is a baseball intelligence platform delivering advanced team analytics, player intelligence, scouting reports, Statcast insights, predictions, and data-driven MLB analysis.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-slate-50 text-slate-950 antialiased`}
      >
        <Navbar />

        <main className="mx-auto min-h-screen max-w-7xl px-6 py-10">
          {children}
        </main>

        <Footer />
      </body>
    </html>
  );
}
