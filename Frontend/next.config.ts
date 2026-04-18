import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const isMobileBuild = process.env.BUILD_TARGET === "mobile";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  /* config options here */

  // Only enable static export when building for mobile (Capacitor)
  ...(isMobileBuild
    ? {
        output: "export",
        trailingSlash: true,
      }
    : {}),
};

// Skip PWA wrapper for mobile builds — Capacitor handles native features
export default isMobileBuild ? nextConfig : withPWA(nextConfig);
