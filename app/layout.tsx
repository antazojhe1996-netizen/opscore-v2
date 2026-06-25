import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// 👉 DITO ILALAGAY
import RegisterServiceWorker from "../components/RegisterServiceWorker";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OPSCORE V3",
  description: "Operations Management System",
  manifest: "/manifest.webmanifest",
  themeColor: "#0f172a",
  appleWebApp: {
    capable: true,
    title: "OPSCORE",
    statusBarStyle: "black-translucent",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="h-full" suppressHydrationWarning>
        <RegisterServiceWorker />
        {children}
      </body>
    </html>
  );
}


