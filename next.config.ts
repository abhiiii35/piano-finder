import type { NextConfig } from "next";

// CSP is report-only for now: script/style/img origins (Google Maps JS API,
// Cloudinary photo URLs, Google account avatars) are enumerated below on a
// best-effort basis but haven't been exhaustively verified against every
// page, so this only logs violations rather than blocking requests. Move to
// enforcing `Content-Security-Policy` once a violation report has been
// reviewed with nothing unexpected in it.
const CSP_REPORT_ONLY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://maps.googleapis.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://res.cloudinary.com https://*.googleusercontent.com https://*.gstatic.com https://maps.gstatic.com",
  "connect-src 'self' https://maps.googleapis.com",
  "font-src 'self' data:",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          { key: "Content-Security-Policy-Report-Only", value: CSP_REPORT_ONLY },
        ],
      },
    ];
  },
};

export default nextConfig;
