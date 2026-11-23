import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' — чтобы работало на GitHub Pages по адресу /<repo>/
export default defineConfig({ base: './', plugins: [react()] });
