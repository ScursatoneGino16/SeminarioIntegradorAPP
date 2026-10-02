import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// El front hace proxy de /api al back: el navegador ve un único origen,
// así la cookie de sesión y el retorno de Steam OpenID funcionan sin CORS.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: false, xfwd: true },
    },
  },
});
