/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Cross-Origin-Opener-Policy",  value: "same-origin"   },
          { key: "Cross-Origin-Embedder-Policy", value: "require-corp"  },
        ],
      },
    ];
  },
  experimental: {
    serverComponentsExternalPackages: [
      'puppeteer',
      'puppeteer-core',
      '@sparticuz/chromium',
      'sharp',
      'docx',
      'mammoth',
      'pdf-parse',
    ],
  },
};

export default nextConfig;
