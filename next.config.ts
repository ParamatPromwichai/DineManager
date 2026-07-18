import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  async headers() {
    return [
      {
        // บังคับใช้กับทุกหน้า
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY', // ป้องกัน Clickjacking
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff', // ป้องกัน MIME Sniffing
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin', 
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload', // บังคับ HTTPS 1 ปี
          }
        ],
      },
    ];
  },
};

export default nextConfig;
