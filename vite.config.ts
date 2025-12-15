import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Carga las variables de entorno para que estén disponibles en process.env durante el build
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [react()],
    define: {
      // Inyección segura de la API KEY para producción
      'process.env.API_KEY': JSON.stringify(env.API_KEY)
    },
    server: {
      host: '0.0.0.0',
    },
    build: {
      outDir: 'dist',
      sourcemap: false
    }
  };
});