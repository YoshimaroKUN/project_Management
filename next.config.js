/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone', // Docker用のスタンドアロン出力
  eslint: {
    // ビルド時のESLintエラーを無視（本番ビルド用）
    ignoreDuringBuilds: true,
  },
  typescript: {
    // ビルド時の型エラーを無視（開発中は有効にすること）
    ignoreBuildErrors: true,
  },
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
    // ローカルアップロードファイルは最適化をスキップ
    unoptimized: true,
  },
  experimental: {
    serverComponentsExternalPackages: ['bcryptjs'],
  },
}

module.exports = nextConfig
