import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { TimezoneCookie } from "@/components/TimezoneCookie";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta" });

export const metadata: Metadata = {
  title: "Wally",
  description: "Knows where your money goes.",
  appleWebApp: { capable: true, title: "Wally", statusBarStyle: "default" },
  icons: { apple: "/apple-touch-icon.png" },
  // iOS still keys full-screen mode off this older tag.
  other: { "apple-mobile-web-app-capable": "yes" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f4fb" },
    { media: "(prefers-color-scheme: dark)", color: "#12101b" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={jakarta.variable}>
      <body className="min-h-dvh font-sans antialiased">
        <TimezoneCookie />
        {children}
      </body>
    </html>
  );
}
