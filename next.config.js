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
  },
  // Force all routes to be rendered at request time (not build time)
  // This allows the app to build without DATABASE_URL and work on Render
  trailingSlash: false,
  // Mark pages that use DB as dynamic
  async headers() {
    return [
      {
        source: '/admin/:path*',
        headers: [
          {
            key: 'x-nextjs-dynamic',
            value: 'force-dynamic'
          }
        ]
      }
    ];
  }
};

module.exports = nextConfig;
