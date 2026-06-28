import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '../', '');
  const headUrl = env.HEAD_PUBLIC_URL || 'http://127.0.0.1:4000';
  return {
    base: '/login/',
    server: {
      host: env.LOGIN_HOST || '127.0.0.1',
      port: Number(env.LOGIN_PORT || 4010),
      strictPort: true,
      proxy: {
        // Allows direct dev testing at http://127.0.0.1:4010/login/.
        // POST /login from the login UI is forwarded to the rev-proxy login endpoint.
        '^/login$': {
          target: headUrl,
          changeOrigin: true,
          secure: false,
        },
        '^/logout$': {
          target: headUrl,
          changeOrigin: true,
          secure: false,
        },
      },
    },
    preview: {
      host: env.LOGIN_HOST || '127.0.0.1',
      port: Number(env.LOGIN_PORT || 4010),
      strictPort: true,
    },
  };
});
