/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  eslint: {
    // Linting is run explicitly in CI via `npm run lint`; don't block builds on it.
    ignoreDuringBuilds: false
  },
  // Disable static page generation for pages that require database access
  // This prevents build-time database errors when DATABASE_URL is not available
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client']
  }
};

module.exports = nextConfig;
