import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// Local, standalone WebGL2 runner: never loads the Apper platform SDK,
// database credentials, authentication routes or the legacy Node game.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(process.cwd(), 'src')
    }
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    open: false
  },
  build: {
    target: 'esnext',
    outDir: 'dist-local',
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(process.cwd(), 'megarush-local.html')
    }
  }
});
