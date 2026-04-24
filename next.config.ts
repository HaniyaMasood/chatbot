import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Embed framing headers are set in middleware.ts for /embed (single CSP, easier to extend).
};

export default nextConfig;
