import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { cookies } from "next/headers";
import { TimezoneCookie } from "@/components/TimezoneCookie";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta" });

export const metadata: Metadata = {
  title: "Wally",
  description: "Knows where your money goes.",
  appleWebApp: { capable: true, title: "Wally", statusBarStyle: "default" },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-touch-icon.png",
  },
  // iOS still keys full-screen mode off this older tag.
  other: { "apple-mobile-web-app-capable": "yes" },
};

export async function generateViewport(): Promise<Viewport> {
  // Status-bar colour follows the chosen theme, or the system when "System".
  const saved = (await cookies()).get("theme")?.value;
  const light = "#f6f4fb";
  const dark = "#12101b";
  return {
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
    themeColor:
      saved === "light"
        ? light
        : saved === "dark"
          ? dark
          : [
              { media: "(prefers-color-scheme: light)", color: light },
              { media: "(prefers-color-scheme: dark)", color: dark },
            ],
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Light / Dark / System, saved per device by the Appearance setting.
  const saved = (await cookies()).get("theme")?.value;
  const theme = saved === "light" || saved === "dark" ? saved : "system";
  return (
    <html lang="en" className={jakarta.variable} data-theme={theme}>
      <body className="min-h-dvh font-sans antialiased">
        <TimezoneCookie />
        {children}
      </body>
    </html>
  );
}
