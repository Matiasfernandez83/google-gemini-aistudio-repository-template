
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Carga segura del entorno
  const currentDir = (process as any).cwd ? (process as any).cwd() : '.';
  const env = loadEnv(mode, currentDir, '');
  
  // -----------------------------------------------------------------------
  // SI NO ENCUENTRAS EL ARCHIVO .env, PEGA TU CLAVE DE GOOGLE AQUI ABAJO:
  // EJEMPLO: const MANUAL_KEY = "AIzaSyDT9WS5rJZYFnqS-8TLHnFiofa-jhK46hM";
  // -----------------------------------------------------------------------
  const MANUAL_KEY = "AIzaSyDT9WS5rJZYFnqS-8TLHnFiofa-jhK46hM"; 

  // Buscar la API Key en orden de prioridad (Manual > .env > Process)
  const apiKey = MANUAL_KEY || env.VITE_API_KEY || env.API_KEY || process.env.VITE_API_KEY || process.env.API_KEY || '';

  if (apiKey) {
    console.log('\x1b[32m%s\x1b[0m', `✅ API Key detectada: ${apiKey.substring(0, 5)}...`);
  } else {
    console.log('\x1b[33m%s\x1b[0m', `⚠️ API Key no detectada. Edita vite.config.ts y agrégala en MANUAL_KEY.`);
  }

  return {
    plugins: [react()],
    define: {
      // Inyección segura.
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
