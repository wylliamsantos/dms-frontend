import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': '/src'
      }
    },
    server: {
      port: parseInt(env.VITE_PORT ?? '5173', 10)
    },
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version)
    }
  };
});
