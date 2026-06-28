import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '../', '');
  return {
    base: '',
    plugins: [vue()],
    server: { host: env.BEAVER_FRONTEND_HOST || '127.0.0.1', port: Number(env.BEAVER_FRONTEND_PORT || 4020), strictPort: true },
    preview: { host: env.BEAVER_FRONTEND_HOST || '127.0.0.1', port: Number(env.BEAVER_FRONTEND_PORT || 4020), strictPort: true }
  };
});
