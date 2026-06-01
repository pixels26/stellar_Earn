import type { NextConfig } from 'next';
import { cspHeaders } from './next.config.csp';
import withBundleAnalyzer from '@next/bundle-analyzer';

const nextConfig: NextConfig = {
  async headers() {
    return cspHeaders;
  },
};

const analyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

export default analyzer(nextConfig);