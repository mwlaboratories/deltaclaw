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
  // Pagination state (moved from renderer module-level vars)
  messagePages: string[]
  messagePage: number
  messageTitle: string
  displayRebuilt: boolean
}

export type Action =
  | { type: 'TAP' }
  | { type: 'DOUBLE_TAP' }
  | { type: 'SCROLL_UP' }
  | { type: 'SCROLL_DOWN' }
  | { type: 'AUDIO_DATA'; pcm: Uint8Array }
  | { type: 'CHANNELS_LOADED'; channels: Channel[] }
  | { type: 'MESSAGES_LOADED'; messages: Message[] }
  | { type: 'TRANSCRIPT_WORD'; word: string }
  | { type: 'POLL_TICK' }
  | { type: 'MESSAGE_SENT' }

const STORAGE_KEY = 'deltaclaw-settings'

function loadSettings(): { sttUrl: string; discordToken: string; guildId: string } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return { sttUrl: 'ws://localhost:8099', discordToken: '', guildId: '' }
}

export function saveSettings(state: State) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    sttUrl: state.sttUrl,
    discordToken: state.discordToken,
    guildId: state.guildId,
  }))
}

export function buildInitialState(): State {
  const saved = loadSettings()
  return {
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
    messagePages: [],
    messagePage: 0,
    messageTitle: '',
    displayRebuilt: false,
  }
}
