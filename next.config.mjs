/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // ⛔ تعطيل ESLint وقت الـ build
  eslint: {
    ignoreDuringBuilds: true,
  },

  // ⛔ تعطيل TypeScript errors وقت الـ build
  typescript: {
    ignoreBuildErrors: true,
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
    ],
  },
};

export default nextConfig;
