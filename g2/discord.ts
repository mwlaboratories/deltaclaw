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
    { id: 'm1', content: 'Daily summary ready. 3 PRs merged, 2 pending review.', author: 'digest-bot', timestamp: '08:00' },
    { id: 'm2', content: 'Coder finished the auth refactor. Researcher found 4 new leads.', author: 'digest-bot', timestamp: '08:01' },
  ],
  '2': [
    { id: 'm1', content: 'Trending: new Claude model dropped, 17k likes in 2h', author: 'alert-bot', timestamp: '14:22' },
    { id: 'm2', content: 'Competitor launched a similar feature, check #researcher', author: 'alert-bot', timestamp: '15:10' },
  ],
  '3': [
    { id: 'm1', content: 'Deployed v2.3 to staging. Auth flow updated.', author: 'coder', timestamp: '11:30' },
    { id: 'm2', content: 'you: looks good, ship it to prod', author: 'you', timestamp: '11:45' },
    { id: 'm3', content: 'Done. Production deploy complete, no errors.', author: 'coder', timestamp: '11:47' },
  ],
  '4': [
    { id: 'm1', content: 'Nginx config updated. SSL certs renewed.', author: 'coder', timestamp: '09:00' },
    { id: 'm2', content: 'Backup job failed last night, investigating.', author: 'coder', timestamp: '09:15' },
    { id: 'm3', content: 'Fixed. Disk was at 95%, cleaned up old logs.', author: 'coder', timestamp: '09:30' },
  ],
  '5': [
    { id: 'm1', content: 'Prototype ready. Basic UI working, needs API integration.', author: 'coder', timestamp: '16:00' },
    { id: 'm2', content: 'Added three endpoints, tests passing.', author: 'coder', timestamp: '17:20' },
  ],
  '6': [
    { id: 'm1', content: 'Refactored the event loop. 40% faster now.', author: 'coder', timestamp: '13:00' },
    { id: 'm2', content: 'Working on the WebSocket reconnect logic next.', author: 'coder', timestamp: '13:45' },
  ],
  '7': [
    { id: 'm1', content: 'Found 3 competitors with similar pricing models.', author: 'researcher', timestamp: '10:00' },
    { id: 'm2', content: 'Full report pinned. Key insight: none support offline mode.', author: 'researcher', timestamp: '10:30' },
  ],
  '8': [
    { id: 'm1', content: 'Captured meeting notes from standup.', author: 'org-agent', timestamp: '09:30' },
    { id: 'm2', content: 'Reminder: dentist appointment Thursday 2pm', author: 'org-agent', timestamp: '10:00' },
    { id: 'm3', content: 'Added 3 new tasks to your agenda for this week.', author: 'org-agent', timestamp: '10:05' },
  ],
  '9': [
    { id: 'm1', content: 'Rescheduled Friday meeting to Monday 10am.', author: 'scheduler', timestamp: '11:00' },
    { id: 'm2', content: 'Your afternoon is clear. Want me to block focus time?', author: 'scheduler', timestamp: '11:15' },
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
