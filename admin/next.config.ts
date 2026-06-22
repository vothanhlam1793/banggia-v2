import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: "/admin",
  async rewrites() {
    return [
      {
        source: "/uploads/:path*",
        destination: "http://localhost:10202/uploads/:path*",
      },
    ];
  },
};

export default nextConfig;
