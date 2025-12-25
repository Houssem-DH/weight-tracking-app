// next.config.js - FINAL FIX
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: false,
  images: {
    unoptimized: true,
  },
  experimental: {},
  // Use standalone output for Electron
  output: 'standalone',
  // Disable server features (Electron doesn't need them)
  serverExternalPackages: [],
  
  // Simple webpack config without conflicts
  webpack: (config, { isServer, dev }) => {
    // Only modify for client-side (Electron renderer)
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        http: false,
        https: false,
        zlib: false,
        path: false,
        os: false,
        child_process: false,
        worker_threads: false,
      };
    }
    
    // Handle Neon database serverless driver
    config.externals = [
      ...(config.externals || []),
      { 
        '@neondatabase/serverless': 'commonjs @neondatabase/serverless',
        'pg-native': 'commonjs pg-native'
      }
    ];
    
    return config;
  },
};

module.exports = nextConfig;