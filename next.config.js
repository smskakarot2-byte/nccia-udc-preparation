/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  eslint: {
    // Linting is run explicitly in CI via `npm run lint`; don't block builds on it.
    // Set to true so builds don't fail if ESLint isn't installed in the build environment.
    ignoreDuringBuilds: true
  },
  // Disable static page generation for pages that require database access
  // This prevents build-time database errors when DATABASE_URL is not available
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client']
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      '@': path.resolve(__dirname, 'src')
    };
    return config;
  }
};

module.exports = nextConfig;
