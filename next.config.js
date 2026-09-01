/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  eslint: {
    // Linting is run explicitly in CI via `npm run lint`; don't block builds on it.
    ignoreDuringBuilds: false
  }
};

module.exports = nextConfig;
