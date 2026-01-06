import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Geist_Mono, Playfair_Display } from "next/font/google";
import { Toaster } from "sonner";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { PWAInstallBanner, OfflineIndicator } from "@/components/pwa";
import "./globals.css";

// Satoshi - premium sans-serif for body text
const satoshi = localFont({
  src: "../../public/fonts/Satoshi-Variable.woff2",
  variable: "--font-satoshi",
  display: "swap",
  weight: "300 900",
});

// Playfair Display - elegant serif for headlines
const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
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

const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

const clerkAppearance = {
  baseTheme: dark,
  variables: {
    colorPrimary: "#A29991",
    colorBackground: "#0a0a0a",
    colorInputBackground: "#1c1c1e",
    colorInputText: "#ffffff",
    colorText: "#ffffff",
    colorTextSecondary: "#B5ADA6",
    borderRadius: "0.5rem",
  },
  elements: {
    formButtonPrimary:
      "bg-[#A29991] hover:bg-[#B5ADA6] text-black font-medium",
    card: "bg-[#0a0a0a] border border-white/[0.06]",
    headerTitle: "text-white",
    headerSubtitle: "text-[#B5ADA6]",
    socialButtonsBlockButton:
      "border-white/[0.06] text-white hover:bg-white/[0.05]",
    formFieldLabel: "text-[#B5ADA6]",
    formFieldInput:
      "bg-[#1c1c1e] border-white/[0.06] text-white placeholder:text-[#6a6765]",
    footerActionLink: "text-[#B5ADA6] hover:text-white",
    identityPreviewEditButton: "text-[#A29991]",
    userButtonPopoverCard: "bg-[#0a0a0a] border border-white/[0.06]",
    userButtonPopoverActionButton: "text-white hover:bg-white/[0.05]",
    userButtonPopoverActionButtonText: "text-white",
    userButtonPopoverFooter: "hidden",
  },
};

function AppProviders({ children }: { children: React.ReactNode }) {
  if (!clerkEnabled) {
    return <>{children}</>;
  }

  return (
    <ClerkProvider appearance={clerkAppearance}>
      {children}
    </ClerkProvider>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AppProviders>
      <html lang="en">
        <body
          className={`${satoshi.variable} ${playfair.variable} ${geistMono.variable} font-sans antialiased`}
        >
          {children}
          <Toaster richColors position="top-right" />
          <PWAInstallBanner />
          <OfflineIndicator />
        </body>
      </html>
    </AppProviders>
  );
}
