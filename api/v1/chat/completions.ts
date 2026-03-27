import type { VercelRequest, VercelResponse } from '@vercel/node'

const DISCORD_API = 'https://discord.com/api/v10'
const POLL_INTERVAL_MS = 500
const POLL_TIMEOUT_MS = 30_000
const MAX_BODY_BYTES = 65536

// --- Discord ---

function discordHeaders() {
  return {
    Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
    'Content-Type': 'application/json',
    'User-Agent': 'DiscordBot (deltaclaw, 0.1.0)',
  }
}

async function sendToDiscord(channelId: string, content: string): Promise<string> {
  const res = await fetch(`${DISCORD_API}/channels/${channelId}/messages`, {
    method: 'POST',
    headers: discordHeaders(),
    body: JSON.stringify({ content }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Discord send failed: ${res.status} ${body}`)
  }
  const msg = (await res.json()) as { id: string }
  return msg.id
}

async function pollForReply(channelId: string, afterMessageId: string): Promise<string> {
  const deadline = Date.now() + POLL_TIMEOUT_MS

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))

    const url = `${DISCORD_API}/channels/${channelId}/messages?after=${afterMessageId}&limit=5`
    const res = await fetch(url, { headers: discordHeaders() })
    if (!res.ok) continue

    const messages = (await res.json()) as Array<{
      id: string
      content: string
      author: { username: string; bot?: boolean }
    }>

    const reply = messages.find((m) => m.author.bot && m.content.trim())
    if (reply) return reply.content
  }

  return 'No response received in time. Please try again.'
}

// --- Resolve #general channel ---

let cachedGeneralChannelId: string | null = null

async function resolveGeneralChannelId(): Promise<string | null> {
  if (cachedGeneralChannelId) return cachedGeneralChannelId

  // Allow explicit override
  if (process.env.DISCORD_GENERAL_CHANNEL_ID) {
    cachedGeneralChannelId = process.env.DISCORD_GENERAL_CHANNEL_ID
    return cachedGeneralChannelId
  }

  const guildId = process.env.DISCORD_GUILD_ID
  if (!guildId) return null

  const res = await fetch(`${DISCORD_API}/guilds/${guildId}/channels`, {
    headers: discordHeaders(),
  })
  if (!res.ok) return null

  const channels = (await res.json()) as Array<{ id: string; name: string; type: number }>
  const targetName = (process.env.DISCORD_CHANNEL_NAME || 'general').toLowerCase()
  const general = channels.find((ch) => ch.type === 0 && ch.name.toLowerCase() === targetName)
  if (general) {
    cachedGeneralChannelId = general.id
    return cachedGeneralChannelId
  }

  return null
}

// --- Response helpers ---

function completion(content: string, id?: string) {
  return {
    id: id || `chatcmpl-${crypto.randomUUID()}`,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: 'deltaclaw',
    choices: [
      {
        index: 0,
        message: { role: 'assistant', content },
        finish_reason: 'stop',
      },
    ],
  }
}

function reply(res: VercelResponse, content: string) {
  return res.status(200).json(completion(content))
}

// --- Handler ---

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Auth
  const token = process.env.DELTACLAW_TOKEN
  const auth = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim()
  if (!token || auth !== token) {
    return reply(res, 'Authentication failed.')
  }

  // Parse body
  const body = req.body
  if (!body || !Array.isArray(body.messages) || body.messages.length === 0) {
    return reply(res, 'No messages provided.')
  }

  // Extract last user message
  let userText = ''
  for (let i = body.messages.length - 1; i >= 0; i--) {
    if (body.messages[i].role === 'user' && typeof body.messages[i].content === 'string') {
      userText = body.messages[i].content.trim()
      break
    }
  }

  if (!userText) {
    return reply(res, 'No user message found.')
  }

  // Check config
  if (!process.env.DISCORD_TOKEN) {
    return reply(res, 'Server not configured.')
  }

  const channelId = await resolveGeneralChannelId()
  if (!channelId) {
    const name = process.env.DISCORD_CHANNEL_NAME || 'general'
    return reply(res, `Could not find #${name} channel. Check DISCORD_GUILD_ID and DISCORD_CHANNEL_NAME.`)
  }

  console.log(`[hey-even] "${userText.slice(0, 80)}"`)

  // Send to Discord #general, wait for bot reply
  try {
    const sentId = await sendToDiscord(channelId, userText)
    const botReply = await pollForReply(channelId, sentId)
    console.log(`[hey-even] reply: "${botReply.slice(0, 80)}"`)
    return reply(res, botReply)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[hey-even] error: ${msg}`)
    return reply(res, 'Failed to get a response. Please try again.')
  }
}
