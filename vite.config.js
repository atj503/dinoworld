import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
    base: './',
    build: {
        outDir: 'dist',
        assetsDir: 'assets',
        sourcemap: true,
        minify: 'terser',
        terserOptions: {
            compress: {
                drop_console: true,
                drop_debugger: true
            }
        },
        rollupOptions: {
            output: {
                manualChunks: {
                    three: ['three']
                }
            }
        }
    },
    publicDir: 'public',
    server: {
        host: true,
        cors: {
            origin: '*', // In production, replace with your actual domain
            methods: ['GET'], // We only need GET for assets
            allowedHeaders: ['Content-Type']
        },
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
            'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization'
        }
    },
    preview: {
        headers: {
            'X-Frame-Options': 'DENY',
            'X-Content-Type-Options': 'nosniff',
            'Referrer-Policy': 'strict-origin-when-cross-origin',
            'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
        }
    },
    resolve: {
        alias: {
            'three': path.resolve(__dirname, 'node_modules/three/build/three.module.js'),
            '@three/examples': path.resolve(__dirname, 'node_modules/three/examples/jsm')
        }
    }
}); 