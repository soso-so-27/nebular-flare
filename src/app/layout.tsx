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

export const metadata: Metadata = {
  title: "NyaruHD (にゃるほど) - 猫のいる暮らしに、余裕と楽しさを",
  description: "猫のいる暮らしに、余裕と楽しさを。家族みんなで猫のお世話を記録・共有。",
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
  viewportFit: 'cover',
  // themeColor removed to prevent iOS status bar conflict
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" style={{ backgroundColor: '#000', margin: 0, padding: 0 }} suppressHydrationWarning>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="NyaruHD" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-icon" href="/icon.svg" />
        <link rel="icon" type="image/svg+xml" href="/icon.svg" />
        <meta name="apple-touch-fullscreen" content="yes" />
        {/* Theme color should match the app background for seamless status bar */}
        <meta name="theme-color" content="#FAF9F7" />
        {/* Inline style in head for earliest possible application */}
        <style dangerouslySetInnerHTML={{
          __html: `
          html, body {
            background-color: #000 !important;
            margin: 0 !important;
            padding: 0 !important;
          }
        `}} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        style={{ backgroundColor: '#000', margin: 0, padding: 0 }}
        suppressHydrationWarning
      >
        <AuthProvider>
          {children}
        </AuthProvider>
        {/* Hidden audio element for iOS audio unlock workaround */}
        <audio id="silent-audio-unlock" preload="auto" src="data:audio/wav;base64,UklGRigIAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQIAAA=" />
        <PwaRegister />
      </body>
    </html>
  );
}
