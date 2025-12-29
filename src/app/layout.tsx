import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { PWAInstallBanner, OfflineIndicator } from "@/components/pwa";
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
  title: "Aerial Shots Media Portal",
  description: "Real estate media delivery portal for Central Florida agents. Professional photography, video, drone, and virtual staging.",
  keywords: ["real estate photography", "aerial photography", "drone photography", "virtual staging", "Central Florida"],
  manifest: "/manifest.webmanifest",
  themeColor: "#0ea5e9",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ASM Portal",
  },
  openGraph: {
    title: "Aerial Shots Media Portal",
    description: "Real estate media delivery portal for Central Florida agents",
    type: "website",
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Toaster richColors position="top-right" />
        <PWAInstallBanner />
        <OfflineIndicator />
      </body>
    </html>
  );
}
