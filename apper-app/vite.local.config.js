import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// Local, standalone WebGL2 runner: never loads the Apper platform SDK,
// database credentials, authentication routes or the legacy Node game.
// The normal Vite root serves Apper's hosted index.html and can hang on
// "Still loading" when the Apper SDK is not configured in local Termux.
// Redirect root to the independent 3D practice entrypoint instead.
function localMegaRushHome() {
  return {
    name: 'local-megarush-home',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const pathname = (request.url || '/').split('?')[0];
        if (request.method === 'GET' && ['/', '/index.html', '/megarush'].includes(pathname)) {
          response.writeHead(302, {
            Location: '/megarush-local.html',
            'Cache-Control': 'no-store'
          });
          response.end();
          return;
        }
        next();
      });
    }
  };
}

export default defineConfig({
  plugins: [localMegaRushHome(), react()],
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
