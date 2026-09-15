import { defineConfig, mergeConfig } from 'vite'
import { appshellConfig } from 'fzl-fund-appshell--lit/vite'

export default defineConfig(
  mergeConfig(
    appshellConfig({
      base: '/legisreader/',
      manifest: {
        name: 'LegisReader',
        short_name: 'LegisReader',
        description: 'Leitor de legislação brasileira para estudantes de direito',
        background_color: '#fffbfe',
        theme_color: '#1f3a5f',
        icons: [
          { src: 'icons/icon-48.png', sizes: '48x48', type: 'image/png' },
          { src: 'icons/icon-72.png', sizes: '72x72', type: 'image/png' },
          { src: 'icons/icon-96.png', sizes: '96x96', type: 'image/png' },
          { src: 'icons/icon-128.png', sizes: '128x128', type: 'image/png' },
          { src: 'icons/icon-144.png', sizes: '144x144', type: 'image/png' },
          { src: 'icons/icon-152.png', sizes: '152x152', type: 'image/png' },
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-384.png', sizes: '384x384', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
    {},
  ),
)
