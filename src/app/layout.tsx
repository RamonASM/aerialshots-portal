import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { PWAInstallBanner, OfflineIndicator } from "@/components/pwa";
import "./globals.css";

// Satoshi - luxury typography for marketing site
const satoshi = localFont({
  src: "../../public/fonts/Satoshi-Variable.woff2",
  variable: "--font-satoshi",
  display: "swap",
  weight: "300 900",
});

// Keep Geist Mono for code blocks
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#0ea5e9",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "Aerial Shots Media Portal",
  description: "Real estate media delivery portal for Central Florida agents. Professional photography, video, drone, and virtual staging.",
  keywords: ["real estate photography", "aerial photography", "drone photography", "virtual staging", "Central Florida"],
  manifest: "/manifest.webmanifest",
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
    <ClerkProvider
      appearance={{
        baseTheme: dark,
        variables: {
          colorPrimary: "#0077ff",
          colorBackground: "#0a0a0a",
          colorInputBackground: "#1c1c1e",
          colorInputText: "#ffffff",
          colorText: "#ffffff",
          colorTextSecondary: "#a1a1a6",
          borderRadius: "0.75rem",
        },
        elements: {
          formButtonPrimary:
            "bg-[#0077ff] hover:bg-[#0066dd] text-white font-medium",
          card: "bg-[#1c1c1e] border border-white/[0.08]",
          headerTitle: "text-white",
          headerSubtitle: "text-[#a1a1a6]",
          socialButtonsBlockButton:
            "border-white/[0.08] text-white hover:bg-white/[0.05]",
          formFieldLabel: "text-[#a1a1a6]",
          formFieldInput:
            "bg-[#1c1c1e] border-white/[0.08] text-white placeholder:text-[#636366]",
          footerActionLink: "text-[#0077ff] hover:text-[#3395ff]",
          identityPreviewEditButton: "text-[#0077ff]",
          userButtonPopoverCard: "bg-[#1c1c1e] border-white/[0.08]",
          userButtonPopoverActionButton: "text-white hover:bg-white/[0.05]",
          userButtonPopoverActionButtonText: "text-white",
          userButtonPopoverFooter: "hidden",
        },
      }}
    >
      <html lang="en">
        <body
          className={`${satoshi.variable} ${geistMono.variable} font-sans antialiased`}
        >
          {children}
          <Toaster richColors position="top-right" />
          <PWAInstallBanner />
          <OfflineIndicator />
        </body>
      </html>
    </ClerkProvider>
  );
}
