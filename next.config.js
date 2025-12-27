/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone', // Docker用のスタンドアロン出力
  images: {
    domains: ['localhost'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.ngrok-free.app',
      },
      {
        protocol: 'https',
        hostname: '*.ngrok.io',
      },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ['bcryptjs'],
  },
}

module.exports = nextConfig
