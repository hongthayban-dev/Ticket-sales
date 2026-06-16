/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['pdfkit', 'sharp', 'jimp'],
  },
  images: {
    domains: ['profile.line-scdn.net', 'drive.google.com', 'lh3.googleusercontent.com'],
  },
  webpack: (config) => {
    config.externals = [...(config.externals || []), { canvas: 'canvas' }];
    return config;
  },
};

export default nextConfig;
