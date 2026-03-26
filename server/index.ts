import 'dotenv/config'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serve } from '@hono/node-server'
import { WebSocketServer } from 'ws'
import { discordRoutes } from './discord-proxy.js'
import { handleSttConnection } from './stt-relay.js'

const token = process.env.DISCORD_TOKEN
const guildId = process.env.GUILD_ID
const isBot = process.env.DISCORD_AUTH === 'bot'

if (!token || !guildId) {
  console.error('Missing DISCORD_TOKEN or GUILD_ID. Copy server/.env.example to .env')
  process.exit(1)
}

const app = new Hono()
app.use('*', cors())

app.get('/health', (c) => c.json({ status: 'ok', provider: process.env.STT_PROVIDER || 'moshi' }))
app.route('/api/discord', discordRoutes(token, guildId, isBot))

const server = serve({ fetch: app.fetch, port: 3001 }, (info) => {
  console.log(`[deltaclaw] Proxy listening on http://localhost:${info.port}`)
  console.log(`[deltaclaw] STT provider: ${process.env.STT_PROVIDER || 'moshi'}`)
})

const wss = new WebSocketServer({ noServer: true })

server.on('upgrade', (request, socket, head) => {
  if (request.url === '/stt') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request)
    })
  } else {
    socket.destroy()
  }
})

wss.on('connection', handleSttConnection)
