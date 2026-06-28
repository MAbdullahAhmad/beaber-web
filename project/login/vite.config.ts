import { defineConfig, loadEnv } from 'vite';
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '../', '');
  return {
    base: '/login/',
    server: { host: env.LOGIN_HOST || '127.0.0.1', port: Number(env.LOGIN_PORT || 4010), strictPort: true },
    preview: { host: env.LOGIN_HOST || '127.0.0.1', port: Number(env.LOGIN_PORT || 4010), strictPort: true }
  };
});
