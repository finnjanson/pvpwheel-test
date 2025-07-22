// This file is intentionally left blank as next.config.ts is used.
// If you need to configure Next.js, please use next.config.ts.

/** rest of code here **/
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Add other configurations here if needed
};

export default nextConfig;
