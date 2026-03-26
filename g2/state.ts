import type { EvenAppBridge } from '@evenrealities/even_hub_sdk'

export type View = 'channels' | 'messages' | 'stt'

export type Channel = {
  id: string
  name: string
  position: number
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

export const state: State = {
  view: 'channels',
  startupRendered: false,
  channels: [],
  selectedChannel: 0,
  currentChannelId: null,
  messages: [],
  transcript: '',
  recording: false,
  sttUrl: 'ws://localhost:8099',
  discordToken: '',
  guildId: '',
}

export let bridge: EvenAppBridge | null = null
export function setBridge(b: EvenAppBridge) {
  bridge = b
}
