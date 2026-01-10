/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // For Cloudflare Pages compatibility with SSR
  // Using standalone to reduce bundle size
  experimental: {
    isrMemoryCacheSize: 0,
  },
};

module.exports = nextConfig;
