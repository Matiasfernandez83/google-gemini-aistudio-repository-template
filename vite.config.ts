
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Cargar variables de entorno. El tercer parámetro '' carga todas las variables.
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  // Buscar la API Key en varias fuentes posibles
  const apiKey = env.API_KEY || env.VITE_API_KEY || process.env.API_KEY || '';

  // DIAGNÓSTICO EN TERMINAL: Esto te mostrará si la clave se está leyendo al iniciar
  if (apiKey) {
    console.log('\x1b[32m%s\x1b[0m', `✅ API Key detectada correctamente: ${apiKey.substring(0, 10)}...`);
  } else {
    console.log('\x1b[31m%s\x1b[0m', `❌ CRÍTICO: API Key NO detectada.`);
    console.log('\x1b[33m%s\x1b[0m', `   Asegúrate de crear un archivo .env en la raíz con: API_KEY=tu_clave_aqui`);
  }

  return {
    plugins: [react()],
    define: {
      // Inyección robusta: asegura que process.env.API_KEY esté disponible en el navegador
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
