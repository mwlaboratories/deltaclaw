import { Hono } from 'hono'

const DISCORD_API = 'https://discord.com/api/v10'

function headers(token: string, isBot: boolean) {
  return {
    Authorization: isBot ? `Bot ${token}` : token,
    'Content-Type': 'application/json',
  }
}

export type DiscordChannel = {
  id: string
  name: string
  type: number
  position: number
}

export type DiscordMessage = {
  id: string
  content: string
  author: { username: string }
  timestamp: string
}

export function discordRoutes(token: string, guildId: string, isBot: boolean) {
  const app = new Hono()

  app.get('/channels', async (c) => {
    const res = await fetch(`${DISCORD_API}/guilds/${guildId}/channels`, {
      headers: headers(token, isBot),
    })
    if (!res.ok) return c.json({ error: await res.text() }, res.status as 400)
    const channels = (await res.json()) as DiscordChannel[]
    const text = channels
      .filter((ch) => ch.type === 0)
      .sort((a, b) => a.position - b.position)
      .map(({ id, name, position }) => ({ id, name, position }))
    return c.json(text)
  })

  app.get('/channels/:id/messages', async (c) => {
    const channelId = c.req.param('id')
    const limit = c.req.query('limit') ?? '10'
    const res = await fetch(
      `${DISCORD_API}/channels/${channelId}/messages?limit=${limit}`,
      { headers: headers(token, isBot) },
    )
    if (!res.ok) return c.json({ error: await res.text() }, res.status as 400)
    const messages = (await res.json()) as DiscordMessage[]
    return c.json(
      messages.map(({ id, content, author, timestamp }) => ({
        id,
        content,
        author: author.username,
        timestamp,
      })),
    )
  })

  app.post('/channels/:id/messages', async (c) => {
    const channelId = c.req.param('id')
    const body = await c.req.json<{ content: string }>()
    const res = await fetch(`${DISCORD_API}/channels/${channelId}/messages`, {
      method: 'POST',
      headers: headers(token, isBot),
      body: JSON.stringify({ content: body.content }),
    })
    if (!res.ok) return c.json({ error: await res.text() }, res.status as 400)
    return c.json(await res.json())
  })

  return app
}
