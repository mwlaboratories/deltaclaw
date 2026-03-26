import type { EvenAppBridge } from '@evenrealities/even_hub_sdk'

export type View = 'welcome' | 'channels' | 'messages' | 'stt'

export type Channel = {
  id: string
  name: string
  position: number
  lastMessage?: string
  lastAuthor?: string
}

export type Message = {
  id: string
  content: string
  author: string
  timestamp: string
}

export type State = {
  view: View
  startupRendered: boolean
  channels: Channel[]
  selectedChannel: number
  currentChannelId: string | null
  messages: Message[]
  transcript: string
  recording: boolean
  sttUrl: string
  discordToken: string
  guildId: string
}

const STORAGE_KEY = 'deltaclaw-settings'

function loadSettings(): { sttUrl: string; discordToken: string; guildId: string } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return { sttUrl: 'ws://localhost:8099', discordToken: '', guildId: '' }
}

export function saveSettings() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    sttUrl: state.sttUrl,
    discordToken: state.discordToken,
    guildId: state.guildId,
  }))
}

const saved = loadSettings()

export const state: State = {
  view: 'welcome',
  startupRendered: false,
  channels: [],
  selectedChannel: 0,
  currentChannelId: null,
  messages: [],
  transcript: '',
  recording: false,
  sttUrl: saved.sttUrl,
  discordToken: saved.discordToken,
  guildId: saved.guildId,
}

export let bridge: EvenAppBridge | null = null
export function setBridge(b: EvenAppBridge) {
  bridge = b
}
