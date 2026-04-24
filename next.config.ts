import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/embed",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "frame-ancestors 'self'",
              "https://www.fromyheart.com",
              "https://fromyheart.com",
              "https://*.myshopify.com",
            ].join(" "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
