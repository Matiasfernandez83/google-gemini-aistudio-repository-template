
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Carga segura del entorno
  const currentDir = (process as any).cwd ? (process as any).cwd() : '.';
  const env = loadEnv(mode, currentDir, '');
  
  // Buscar la API Key en orden de prioridad
  const apiKey = env.VITE_API_KEY || env.API_KEY || process.env.VITE_API_KEY || process.env.API_KEY || '';

  if (apiKey) {
    console.log('\x1b[32m%s\x1b[0m', `✅ API Key detectada durante el build: ${apiKey.substring(0, 5)}...`);
  } else {
    console.log('\x1b[33m%s\x1b[0m', `⚠️ API Key no detectada en build time. Se intentará leer en runtime.`);
  }

  return {
    plugins: [react()],
    define: {
      // Inyección segura. Si apiKey es vacío, inyecta string vacío.
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
