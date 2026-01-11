/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // Use default SSR mode for Cloudflare Pages (supports Server Actions)
  // Pages will be on-demand generated
};

module.exports = nextConfig;
