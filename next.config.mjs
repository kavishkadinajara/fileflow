/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Cross-Origin-Opener-Policy",   value: "same-origin"   },
          { key: "Cross-Origin-Embedder-Policy", value: "require-corp"  },
          { key: "Cross-Origin-Resource-Policy", value: "cross-origin"  },
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
    ],
  },
};

export default nextConfig;
