import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Sheet imports send a few thousand rows to a server action.
  experimental: { serverActions: { bodySizeLimit: "5mb" } },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "lh3.googleusercontent.com" }],
  },
};

export default nextConfig;
