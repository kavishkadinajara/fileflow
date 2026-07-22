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
  webpack: (config, { isServer, webpack }) => {
    if (!isServer) {
      // onnxruntime-web ships pre-minified ESM bundles that transformers.js
      // references via `new URL(...)`; they land in static/media and Next's
      // minifier then fails on their top-level `import.meta`. Next's vendored
      // terser plugin skips assets flagged `minimized`, so mark them as such —
      // they ARE already minified upstream.
      config.plugins.push({
        apply(compiler) {
          compiler.hooks.compilation.tap("MarkOrtPreminified", (compilation) => {
            compilation.hooks.processAssets.tap(
              { name: "MarkOrtPreminified", stage: webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONS },
              () => {
                for (const name of Object.keys(compilation.assets)) {
                  if (/ort\.[\w.-]*\.mjs$/i.test(name)) {
                    compilation.updateAsset(name, compilation.assets[name], { minimized: true });
                  }
                }
              },
            );
          });
        },
      });
    }
    return config;
  },
};

export default nextConfig;
