import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/providers/auth-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

import { PwaRegister } from "@/components/pwa-register";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "にゃるほど - ねこのいる暮らしを、ためて、とどけて、ふりかえる",
  description: "ねこの足あとアプリ「にゃるほど」。ねこのいる暮らしを、ためて、とどけて、ふりかえる。",
  manifest: "/manifest.json?v=4",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "NyaruHD",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

import { QueryProvider } from "@/providers/query-provider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="bg-[#FAF8F5]" suppressHydrationWarning>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="NyaruHD" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-icon" href="/icon.svg" />
        <link rel="icon" type="image/svg+xml" href="/icon.svg" />
        <meta name="apple-touch-fullscreen" content="yes" />
        <meta name="theme-color" content="#FAF8F5" />
        <style dangerouslySetInnerHTML={{
          __html: `
          /* Iron Root v16: Inline constraints removed for iOS 18 native behavior */
        `}} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased scrollbar-hide`}
        style={{ backgroundColor: '#FAF8F5', margin: 0, padding: 0 }}
        suppressHydrationWarning
      >
        <QueryProvider>
          <AuthProvider>
            <div id="main-viewport" className="iron-viewport">
              {children}
            </div>
            <Toaster />
          </AuthProvider>
        </QueryProvider>
        {/* Hidden audio element for iOS audio unlock workaround */}
        <audio id="silent-audio-unlock" preload="auto" src="data:audio/wav;base64,UklGRigIAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQIAAA=" />
        <PwaRegister />
      </body>
    </html>
  );
}
