import type { Channel, Message } from './state'

const DISCORD_API = '/discord'

function headers(token: string) {
  return {
    Authorization: `Bot ${token}`,
    'Content-Type': 'application/json',
  }
}

export async function fetchChannels(token: string, guildId: string): Promise<Channel[]> {
  const res = await fetch(`${DISCORD_API}/guilds/${guildId}/channels`, {
    headers: headers(token),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Failed to fetch channels: ${res.status} ${body}`)
  }
  const channels = (await res.json()) as Array<{ id: string; name: string; type: number; position: number }>
  return channels
    .filter((ch) => ch.type === 0)
    .sort((a, b) => a.position - b.position)
    .map(({ id, name, position }) => ({ id, name, position }))
}

const MOCK_MESSAGES: Record<string, Message[]> = {
  '1': [
    { id: 'm1', content: 'I\'ve analyzed the codebase. The main bottleneck is in the event loop - switching to async dispatch should give us 3x throughput.', author: 'jarvis', timestamp: '2026-03-27T01:30:00Z' },
    { id: 'm2', content: 'check the event loop in the glasses app', author: 'deltaclaw', timestamp: '2026-03-27T01:29:00Z' },
  ],
  '2': [
    { id: 'm1', content: 'Refactored the WebSocket handler. Connection pooling is in, reconnect logic handles edge cases. Tests passing.', author: 'jarvis', timestamp: '2026-03-27T00:45:00Z' },
    { id: 'm2', content: 'refactor the websocket handler and add reconnect', author: 'deltaclaw', timestamp: '2026-03-27T00:40:00Z' },
  ],
  '3': [
    { id: 'm1', content: 'Found 3 relevant papers on AR interaction patterns. Key finding: gesture recognition latency under 100ms is critical for user satisfaction.', author: 'jarvis', timestamp: '2026-03-26T22:15:00Z' },
    { id: 'm2', content: 'research AR interaction patterns', author: 'deltaclaw', timestamp: '2026-03-26T22:10:00Z' },
  ],
  '4': [
    { id: 'm1', content: 'All services healthy. Backup completed successfully. Disk usage at 42%.', author: 'jarvis', timestamp: '2026-03-26T09:00:00Z' },
    { id: 'm2', content: 'status report', author: 'deltaclaw', timestamp: '2026-03-26T08:55:00Z' },
  ],
  '5': [
    { id: 'm1', content: 'The question of consciousness in AI systems remains fundamentally tied to the hard problem - we can model behavior without understanding qualia.', author: 'jarvis', timestamp: '2026-03-26T23:30:00Z' },
    { id: 'm2', content: 'what do you think about AI consciousness?', author: 'deltaclaw', timestamp: '2026-03-26T23:25:00Z' },
  ],
  '6': [
    { id: 'm1', content: 'Meeting with the team moved to Thursday 2pm. Your afternoon today is clear.', author: 'jarvis', timestamp: '2026-03-27T08:00:00Z' },
    { id: 'm2', content: 'reschedule the team meeting', author: 'deltaclaw', timestamp: '2026-03-27T07:55:00Z' },
  ],
}

type RawMessage = {
  id: string
  content: string
  author: { username: string }
  timestamp: string
  embeds?: Array<{ title?: string; description?: string }>
  attachments?: Array<{ filename: string }>
  sticker_items?: Array<{ name: string }>
}

function extractContent(msg: RawMessage): string {
  const parts: string[] = []
  if (msg.content) parts.push(msg.content)
  if (msg.embeds?.length) {
    for (const e of msg.embeds) {
      if (e.title) parts.push(`[${e.title}]`)
      else if (e.description) parts.push(e.description.slice(0, 100))
    }
  }
  if (msg.attachments?.length) {
    parts.push(msg.attachments.map((a) => a.filename).join(', '))
  }
  if (msg.sticker_items?.length) {
    parts.push(msg.sticker_items.map((s) => `[${s.name}]`).join(' '))
  }
  return parts.join(' ') || '[empty]'
}

export async function fetchMessages(
  token: string,
  channelId: string,
  limit = 25,
): Promise<Message[]> {
  if (!token) return MOCK_MESSAGES[channelId] ?? []

  const res = await fetch(`${DISCORD_API}/channels/${channelId}/messages?limit=${limit}`, {
    headers: headers(token),
  })
  if (!res.ok) throw new Error(`Failed to fetch messages: ${res.status}`)
  const messages = (await res.json()) as RawMessage[]
  return messages.map((msg) => ({
    id: msg.id,
    content: extractContent(msg),
    author: msg.author.username,
    timestamp: msg.timestamp,
  }))
}

export async function fetchLatestMessage(
  token: string,
  channelId: string,
): Promise<{ author: string; content: string } | null> {
  if (!token) return null
  try {
    const msgs = await fetchMessages(token, channelId, 1)
    return msgs[0] ? { author: msgs[0].author, content: msgs[0].content } : null
  } catch {
    return null
  }
}

export async function sendMessage(token: string, channelId: string, content: string): Promise<void> {
  const res = await fetch(`${DISCORD_API}/channels/${channelId}/messages`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({ content }),
  })
  if (!res.ok) throw new Error(`Failed to send message: ${res.status}`)
}
