/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@devflow/shared-types', '@devflow/event-schemas', '@devflow/ui'],
  output: 'standalone',
};

export default nextConfig;
