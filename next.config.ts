import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [{ source: "/dang-ky-hoat-dong", destination: "/dang-ky", permanent: true }];
  },
};

export default nextConfig;
