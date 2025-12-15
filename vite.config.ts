
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Cargar variables de entorno desde .env
  // Fix: Property 'cwd' does not exist on type 'Process'. Casting to any to resolve.
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  // Buscar la API Key
  const apiKey = env.API_KEY || env.VITE_API_KEY || process.env.API_KEY || '';

  if (apiKey) {
    console.log('\x1b[32m%s\x1b[0m', `✅ API Key inyectada: ${apiKey.substring(0, 5)}...`);
  } else {
    console.log('\x1b[31m%s\x1b[0m', `❌ API Key no encontrada. Verifica tu archivo .env`);
  }

  return {
    plugins: [react()],
    define: {
      // Definimos una variable global segura para evitar conflictos con 'process'
      '__API_KEY__': JSON.stringify(apiKey)
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
