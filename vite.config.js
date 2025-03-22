import { defineConfig } from 'vite';

export default defineConfig({
    base: './',
    publicDir: 'public',
    server: {
        host: true
    },
    build: {
        outDir: 'dist',
        assetsDir: 'assets'
    }
}); 