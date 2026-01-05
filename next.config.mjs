/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'wimg.dt.co.kr',
      },
      {
        protocol: 'https',
        hostname: '**.dt.co.kr',
      },
      {
        protocol: 'https',
        hostname: '**.aitimes.com',
      },
      {
        protocol: 'https',
        hostname: '**.aitimes.kr',
      },
      {
        protocol: 'https',
        hostname: '**.koraia.org',
      },
      {
        protocol: 'https',
        hostname: 'image.zdnet.co.kr',
      },
      {
        protocol: 'https',
        hostname: '**.zdnet.co.kr',
      },
      {
        protocol: 'https',
        hostname: 'www.chosun.com',
      },
      {
        protocol: 'https',
        hostname: '**.chosun.com',
      },
    ],
  },
};

export default nextConfig;
