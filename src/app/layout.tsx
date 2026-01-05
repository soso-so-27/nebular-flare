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
  title: "CatUp - 家族で猫のお世話を共有",
  description: "家族みんなで猫のお世話を記録・共有。誰が何をしたか一目でわかる。",
  manifest: "/manifest.json?v=3",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "CatUp",
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
    <html lang="ja">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-touch-fullscreen" content="yes" />
        {/* Using #000000 to match the expected dark background - status bar will blend with content */}
        <meta name="theme-color" content="#1a1a1a" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          {children}
        </AuthProvider>
        <PwaRegister />
      </body>
    </html>
  );
}
