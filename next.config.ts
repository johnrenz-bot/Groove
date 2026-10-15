import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "i.ytimg.com" },
      { protocol: "https", hostname: "img.youtube.com" },
      { protocol: "https", hostname: "images.squarespace-cdn.com" },
      { protocol: "https", hostname: "static1.squarespace.com" },
      { protocol: "https", hostname: "www.redbull.com" },
      { protocol: "https", hostname: "resources.redbull.com" },
      { protocol: "https", hostname: "www.steezy.com" },
      { protocol: "https", hostname: "www.worldofdance.com" },
      { protocol: "https", hostname: "www.hiphopinternational.com" },
      { protocol: "https", hostname: "www.thedancelebague.com" },
      { protocol: "https", hostname: "www.justedebout.com" },
      { protocol: "https", hostname: "www.udodanceworld.com" },
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
    ],
  },
};

export default nextConfig;
