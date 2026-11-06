import type { NextConfig } from 'next';

// Baseline security headers (the app shows personal data of minors). A strict
// CSP needs per-request nonces for Next's inline scripts — left as a follow-up.
const SECURITY_HEADERS = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

const nextConfig: NextConfig = {
  // Same deployment shape as prosecutor_dtp_next: `node server.js` from .next/standalone.
  output: 'standalone',
  async headers() {
    return [{ source: '/:path*', headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
