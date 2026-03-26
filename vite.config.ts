import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/discord': {
        target: 'https://discord.com/api/v10',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/discord/, ''),
        headers: {
          'User-Agent': 'DiscordBot (https://github.com/deltaclaw, 0.1.0)',
        },
      },
    },
  },
})
