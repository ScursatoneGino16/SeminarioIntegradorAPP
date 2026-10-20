import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// El front hace proxy de /api al back: el navegador ve un único origen,
// así la cookie de sesión y el retorno de Steam OpenID funcionan sin CORS.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
  server: {
    port: 5173,
    // IPv4 explícito: si no, Vite puede escuchar solo en [::1] y el navegador rechaza 127.0.0.1
    host: '127.0.0.1',
    proxy: {
      // API_URL permite apuntar a otro back (por ejemplo uno en modo simulado en otro puerto)
      '/api': { target: process.env.API_URL ?? 'http://localhost:3000', changeOrigin: false, xfwd: true },
    },
  },
});
