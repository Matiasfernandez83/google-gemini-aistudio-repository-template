
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Cargar variables de entorno. El tercer parámetro '' carga todas las variables, no solo las que empiezan por VITE_
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  // Priorizar API_KEY, pero permitir VITE_API_KEY como fallback común
  const apiKey = env.API_KEY || env.VITE_API_KEY || process.env.API_KEY || '';

  return {
    plugins: [react()],
    define: {
      // Inyección robusta: asegura que process.env.API_KEY siempre tenga un valor string
      'process.env.API_KEY': JSON.stringify(apiKey)
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
