import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: "/admin",
  output: "standalone",
  async rewrites() {
    return [
      {
        source: "/uploads/:path*",
        destination: `${process.env.BACKEND_INTERNAL_URL || "http://localhost:10202"}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;
