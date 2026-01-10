/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // Export as static site for Cloudflare Pages
  output: 'export',
  // Disable dynamic features for static export
  dynamicParams: true,
};

module.exports = nextConfig;
