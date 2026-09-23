import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// Basis-Pfad: lokal "/", auf GitHub Pages z. B. "/SusakCity/"
const base = process.env.VITE_BASE ?? '/';

export default defineConfig({
  base,
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png'],
      manifest: {
        name: 'Susak City Slots',
        short_name: 'Susak City',
        description: '5×5 Neon-Slot mit Pick-Up- und Blackjack-Bonus – nur Spielgeld.',
        lang: 'de',
        display: 'fullscreen',
        orientation: 'portrait',
        background_color: '#07050d',
        theme_color: '#07050d',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Alles vorab in den Cache legen – das Spiel läuft danach offline
        globPatterns: ['**/*.{js,css,html,webp,png,svg,woff,woff2}'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        navigateFallback: `${base}index.html`,
      },
      devOptions: { enabled: false },
    }),
  ],
});
