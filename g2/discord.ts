import type { Channel, Message } from './state'

const DISCORD_API = 'https://discord.com/api/v10'

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
  if (!res.ok) throw new Error(`Failed to fetch channels: ${res.status}`)
  const channels = (await res.json()) as Array<{ id: string; name: string; type: number; position: number }>
  return channels
    .filter((ch) => ch.type === 0)
    .sort((a, b) => a.position - b.position)
    .map(({ id, name, position }) => ({ id, name, position }))
}

export async function fetchMessages(
  token: string,
  channelId: string,
  limit = 10,
): Promise<Message[]> {
  const res = await fetch(`${DISCORD_API}/channels/${channelId}/messages?limit=${limit}`, {
    headers: headers(token),
  })
  if (!res.ok) throw new Error(`Failed to fetch messages: ${res.status}`)
  const messages = (await res.json()) as Array<{
    id: string
    content: string
    author: { username: string }
    timestamp: string
  }>
  return messages.map(({ id, content, author, timestamp }) => ({
    id,
    content,
    author: author.username,
    timestamp,
  }))
}

export async function sendMessage(token: string, channelId: string, content: string): Promise<void> {
  const res = await fetch(`${DISCORD_API}/channels/${channelId}/messages`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({ content }),
  })
  if (!res.ok) throw new Error(`Failed to send message: ${res.status}`)
}
