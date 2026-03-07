/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['puppeteer', 'sharp', 'docx', 'mammoth'],
  },
};

export default nextConfig;
