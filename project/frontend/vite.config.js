import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '../', '');
  const apiTarget = env.BEAVER_API_INTERNAL_URL || 'http://127.0.0.1:4030';
  return {
    base: '/',
    plugins: [vue()],
    server: {
      host: env.BEAVER_FRONTEND_HOST || '127.0.0.1',
      port: Number(env.BEAVER_FRONTEND_PORT || 4020),
      strictPort: true,
      hmr: {
        host: env.BEAVER_FRONTEND_HOST || '127.0.0.1',
        port: Number(env.BEAVER_FRONTEND_PORT || 4020),
        clientPort: Number(env.BEAVER_FRONTEND_PORT || 4020),
        protocol: 'ws',
      },
      proxy: {
        '^/api(/.*)?$': {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api(?=\/|$)/, '') || '/',
        },
      },
    },
    preview: {
      host: env.BEAVER_FRONTEND_HOST || '127.0.0.1',
      port: Number(env.BEAVER_FRONTEND_PORT || 4020),
      strictPort: true,
    },
  };
});
