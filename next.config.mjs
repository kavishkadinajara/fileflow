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
      // Client-only inference libs: keep the server compile from bundling their
      // Node builds (onnxruntime-node ships native .node binaries webpack can't parse).
      '@huggingface/transformers',
      'onnxruntime-node',
    ],
  },
};

export default nextConfig;
