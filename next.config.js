/** @type {import('next').NextConfig} */
const nextConfig = {
  
  // Image optimization for pixel art
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'https',
        hostname: '**.cloudflare.com',
      },
    ],
    // Disable image optimization for pixel art to maintain quality
    unoptimized: true,
  },

  // Canvas and WebAssembly support
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Canvas polyfill for server-side rendering
    if (isServer) {
      config.externals.push('canvas');
    }

    // WebAssembly support for quantization algorithms
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };

    // Support for Web Workers
    config.module.rules.push({
      test: /\.worker\.(js|ts)$/,
      use: {
        loader: 'worker-loader',
        options: {
          filename: 'static/[hash].worker.js',
          publicPath: '/_next/',
        },
      },
    });

    return config;
  },

  // Environment variables for client-side
  env: {
    CANVAS_MAX_ZOOM: process.env.CANVAS_MAX_ZOOM || '1600',
    CANVAS_MIN_ZOOM: process.env.CANVAS_MIN_ZOOM || '50',
    CANVAS_DEFAULT_SIZE: process.env.CANVAS_DEFAULT_SIZE || '32',
    AI_MAX_IMAGE_SIZE: process.env.AI_MAX_IMAGE_SIZE || '512',
    AI_DEFAULT_COLOR_COUNT: process.env.AI_DEFAULT_COLOR_COUNT || '24',
  },

  // Headers for CORS and security
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: process.env.NODE_ENV === 'development' ? '*' : 'https://aipixelarteditor-production.up.railway.app',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
        ],
      },
      {
        // Enable SharedArrayBuffer for WebAssembly
        source: '/(.*)',
        headers: [
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
        ],
      },
    ];
  },

  // Redirects for better UX
  async redirects() {
    return [
      {
        source: '/editor',
        destination: '/',
        permanent: true,
      },
    ];
  },

  // Rewrites for API routes
  async rewrites() {
    return [
      {
        source: '/api/ai/:path*',
        destination: '/api/ai/:path*',
      },
    ];
  },

  // Output configuration for deployment
  output: 'standalone',
  
  // Compression
  compress: true,
  
  // Power by header
  poweredByHeader: false,
  
  // React strict mode
  reactStrictMode: true,
  
  // SWC minify for better performance
  swcMinify: true,

  // Experimental features for better performance
  experimental: {
    optimizePackageImports: ['zustand', 'clsx'],
  },
};

module.exports = nextConfig;