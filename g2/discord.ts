import type { Channel, Message } from './state'

export async function fetchChannels(proxyUrl: string): Promise<Channel[]> {
  const res = await fetch(`${proxyUrl}/api/discord/channels`)
  if (!res.ok) throw new Error(`Failed to fetch channels: ${res.status}`)
  return res.json()
}

export async function fetchMessages(
  proxyUrl: string,
  channelId: string,
  limit = 10,
): Promise<Message[]> {
  const res = await fetch(`${proxyUrl}/api/discord/channels/${channelId}/messages?limit=${limit}`)
  if (!res.ok) throw new Error(`Failed to fetch messages: ${res.status}`)
  return res.json()
}

export async function sendMessage(proxyUrl: string, channelId: string, content: string): Promise<void> {
  const res = await fetch(`${proxyUrl}/api/discord/channels/${channelId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  })
  if (!res.ok) throw new Error(`Failed to send message: ${res.status}`)
}
