/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'prisma'],
  },
  basePath: process.env.NEXT_BASE_PATH || undefined,
  distDir: process.env.NEXT_DIST_DIR || '.next',
}
module.exports = nextConfig
