import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  /* config options here */
  async rewrites() {
    return [
      {
        source: '/api/send-otp',
        destination: 'http://localhost:5005/api/send-otp',
      },
      {
        source: '/api/verify-otp',
        destination: 'http://localhost:5005/api/verify-otp',
      },
    ];
  },
};

export default withNextIntl(nextConfig);
