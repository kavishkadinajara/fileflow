/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: [
      'puppeteer',
      'puppeteer-core',
      '@sparticuz/chromium',
      'sharp',
      'docx',
      'mammoth',
    ],
  },
};

export default nextConfig;
