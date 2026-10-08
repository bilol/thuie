/** @type {import('next').NextConfig} */
// The browser talks only to the Next origin (:3001); this rewrite proxies to the
// NestJS API (:5000) server-side, so no backend CORS change is required.
const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:5000";

const nextConfig = {
  // Emits .next/standalone — the lean, self-contained server used by Dockerfile.
  // No effect on `next dev`; only trims the production/container image.
  output: "standalone",
  reactStrictMode: true,
  async rewrites() {
    return [
      { source: "/api/v1/:path*", destination: `${BACKEND_URL}/api/v1/:path*` },
    ];
  },
};

export default nextConfig;
