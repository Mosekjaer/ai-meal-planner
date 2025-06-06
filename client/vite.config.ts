import path from "path"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), VitePWA({
    manifest: {
      name: "Meal Planner",
      short_name: "MealPlan",
      description: "Your personal meal planner to make planning the meals for the week easier.",
      icons: [
        {
          "src": "icons/icon-48x48.png",
          "sizes": "48x48",
          "type": "image/png"
        },
        {
          "src": "icons/icon-72x72.png",
          "sizes": "72x72",
          "type": "image/png"
        },
        {
          "src": "icons/icon-96x96.png",
          "sizes": "96x96",
          "type": "image/png"
        },
        {
          "src": "icons/icon-128x128.png",
          "sizes": "128x128",
          "type": "image/png"
        },
        {
          "src": "icons/icon-144x144.png",
          "sizes": "144x144",
          "type": "image/png"
        },
        {
          "src": "icons/icon-152x152.png",
          "sizes": "152x152",
          "type": "image/png"
        },
        {
          "src": "icons/icon-192x192.png",
          "sizes": "192x192",
          "type": "image/png"
        },
        {
          "src": "icons/icon-256x256.png",
          "sizes": "256x256",
          "type": "image/png"
        },
        {
          "src": "icons/icon-384x384.png",
          "sizes": "384x384",
          "type": "image/png"
        },
        {
          "src": "icons/icon-512x512.png",
          "sizes": "512x512",
          "type": "image/png"
        }
      ],
    },
    workbox: {
      runtimeCaching: [
        {
          urlPattern: ({ url}) => {
            return url.pathname.startsWith('/api/') || url.pathname.startsWith('/static/');
          },
          handler: 'CacheFirst' as const,
          options: {
            cacheName: 'api-cache',
            cacheableResponse: {
              statuses: [0, 200],
            }
          }
        }
      ]
    }
  })],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  preview: {
    allowedHosts: process.env.VITE_ALLOWED_HOSTS?.split(',') || []
  }
})
