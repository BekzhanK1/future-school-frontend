import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    eslint: {
        ignoreDuringBuilds: true,
    },
    typescript: {
        ignoreBuildErrors: true,
    },
    images: {
        remotePatterns: [
            {
                protocol: 'http',
                hostname: 'localhost',
                port: '8000',
                pathname: '/media/**',
            },
            {
                protocol: 'http',
                hostname: 'localhost',
                port: '3000',
                pathname: '/**',
            },
            {
                protocol: 'http',
                hostname: '85.198.89.128',
                port: '8000',
                pathname: '/media/**',
            },
            {
                protocol: 'https',
                hostname: '85.198.89.128',
                port: '8000',
                pathname: '/media/**',
            },
        ],
    },
    output: 'standalone',
};

export default nextConfig;
