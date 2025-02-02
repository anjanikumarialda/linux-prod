import type { NextConfig } from "next";

/** @type {import('next').NextConfig} */
const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,  // This will ignore all ESLint errors during build
  },
  /* config options here */
};

export default nextConfig;
