import { OsEventTypeList, type EvenHubEvent } from '@evenrealities/even_hub_sdk'
import { state, bridge } from './state'
import { fetchMessages, sendMessage } from './discord'
import { renderWelcome, renderChannelList, renderMessages, renderStt, scrollMessages, refreshMessages, updateChannelSelection } from './renderer'
import { startSttSession, type SttSession } from './stt'
import { appendEventLog } from '../shared/log'

const VIEW_CHANGE_GUARD_MS = 1000
const POLL_INTERVAL_MS = 1000
let lastViewChangeTime = 0
let selectedIndex = 0
let sttSession: SttSession | null = null
let busy = false
let pollTimer: ReturnType<typeof setInterval> | null = null

function startPolling() {
  stopPolling()
  pollTimer = setInterval(() => {
    if (state.view === 'messages' && state.currentChannelId) {
      void refreshMessages(state.discordToken, state.currentChannelId)
    }
  }, POLL_INTERVAL_MS)
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

function changeView(view: 'welcome' | 'channels' | 'messages' | 'stt') {
  state.view = view
  lastViewChangeTime = Date.now()
}

function viewChangeGuarded(): boolean {
  return Date.now() - lastViewChangeTime < VIEW_CHANGE_GUARD_MS
}

function resolveIndex(event: EvenHubEvent): number {
  const idx = event.listEvent?.currentSelectItemIndex
  if (typeof idx === 'number' && idx >= 0) {
    selectedIndex = idx
    return idx
  }
  // SDK omits currentSelectItemIndex for item 0
  return 0
}

function resolveEventType(event: EvenHubEvent): OsEventTypeList | undefined {
  const raw =
    event.listEvent?.eventType ??
    event.textEvent?.eventType ??
    event.sysEvent?.eventType ??
    (event as any).jsonData?.eventType ??
    (event as any).jsonData?.event_type ??
    (event as any).jsonData?.Event_Type ??
    (event as any).jsonData?.type

  if (raw !== undefined && raw !== null) {
    if (typeof raw === 'number') {
      switch (raw) {
        case 0: return OsEventTypeList.CLICK_EVENT
        case 1: return OsEventTypeList.SCROLL_TOP_EVENT
        case 2: return OsEventTypeList.SCROLL_BOTTOM_EVENT
        case 3: return OsEventTypeList.DOUBLE_CLICK_EVENT
        default: return raw
      }
    }
    if (typeof raw === 'string') {
      const s = raw.toUpperCase()
      if (s.includes('DOUBLE')) return OsEventTypeList.DOUBLE_CLICK_EVENT
      if (s.includes('CLICK')) return OsEventTypeList.CLICK_EVENT
      if (s.includes('SCROLL_TOP') || s.includes('UP')) return OsEventTypeList.SCROLL_TOP_EVENT
      if (s.includes('SCROLL_BOTTOM') || s.includes('DOWN')) return OsEventTypeList.SCROLL_BOTTOM_EVENT
    }
  }

  if (event.listEvent || event.textEvent || event.sysEvent) {
    return OsEventTypeList.CLICK_EVENT
  }

  return undefined
}

export function onEvenHubEvent(event: EvenHubEvent) {
  // Handle audio events for STT
  if (event.audioEvent?.audioPcm && sttSession && state.recording) {
    sttSession.sendAudio(event.audioEvent.audioPcm)
    return
  }

  const eventType = resolveEventType(event)
  if (eventType === undefined) return

  if (busy) return

  switch (state.view) {
    case 'welcome':
      void handleWelcomeEvent(eventType)
      break
    case 'channels':
      void handleChannelEvent(event, eventType)
      break
    case 'messages':
      void handleMessageEvent(eventType)
      break
    case 'stt':
      void handleSttEvent(eventType)
      break
  }
}

async function handleWelcomeEvent(type: OsEventTypeList) {
  if (type === OsEventTypeList.CLICK_EVENT || type === OsEventTypeList.DOUBLE_CLICK_EVENT) {
    selectedIndex = 0
    changeView('channels')
    await renderChannelList()
  }
}

async function handleChannelEvent(_event: EvenHubEvent, type: OsEventTypeList) {
  if (viewChangeGuarded()) return

  switch (type) {
    case OsEventTypeList.SCROLL_TOP_EVENT:
      state.selectedChannel = state.selectedChannel > 0
        ? state.selectedChannel - 1
        : state.channels.length - 1
      await updateChannelSelection()
      break

    case OsEventTypeList.SCROLL_BOTTOM_EVENT:
      state.selectedChannel = state.selectedChannel < state.channels.length - 1
        ? state.selectedChannel + 1
        : 0
      await updateChannelSelection()
      break

    case OsEventTypeList.DOUBLE_CLICK_EVENT:
      changeView('welcome')
      await renderWelcome()
      break

    case OsEventTypeList.CLICK_EVENT: {
      if (busy) return
      busy = true
      try {
        const ch = state.channels[state.selectedChannel]
        if (!ch) return
        state.currentChannelId = ch.id
        changeView('messages')
        appendEventLog(`#${ch.name}`)
        try {
          state.messages = await fetchMessages(state.discordToken, ch.id)
          appendEventLog(`${state.messages.length} msgs loaded`)
        } catch (err) {
          appendEventLog(`Error: ${err}`)
          state.messages = []
        }
        await renderMessages()
        startPolling()
      } finally {
        busy = false
      }
      break
    }
  }
}

async function handleMessageEvent(type: OsEventTypeList) {
  if (viewChangeGuarded()) return

  switch (type) {
    case OsEventTypeList.SCROLL_TOP_EVENT:
      scrollMessages('up')
      break

    case OsEventTypeList.SCROLL_BOTTOM_EVENT:
      scrollMessages('down')
      break

    case OsEventTypeList.CLICK_EVENT:
      // Start STT recording
      if (busy) return
      busy = true
      stopPolling()
      try {
        changeView('stt')
        state.transcript = ''
        state.recording = true
        await renderStt()

        if (bridge) {
          await bridge.audioControl(true)
        }

        sttSession = startSttSession(
          state.sttUrl,
          (word) => {
            state.transcript += (state.transcript ? ' ' : '') + word
            void renderStt()
          },
          (msg) => {
            appendEventLog(`STT error: ${msg}`)
          },
        )
      } finally {
        busy = false
      }
      break

    case OsEventTypeList.DOUBLE_CLICK_EVENT:
      // Back to channel list
      stopPolling()
      await stopRecording()
      changeView('channels')
      state.currentChannelId = null
      state.messages = []
      await renderChannelList()
      break
  }
}

async function handleSttEvent(type: OsEventTypeList) {
  if (viewChangeGuarded()) return

  switch (type) {
    case OsEventTypeList.CLICK_EVENT:
      // Send transcript to Discord
      await stopRecording()
      if (state.transcript.trim() && state.currentChannelId) {
        try {
          await sendMessage(state.discordToken, state.currentChannelId, state.transcript.trim())
          appendEventLog(`Sent: ${state.transcript.trim()}`)
        } catch (err) {
          appendEventLog(`Send error: ${err}`)
        }
        state.messages = await fetchMessages(state.discordToken, state.currentChannelId).catch(() => [])
      }
      state.transcript = ''
      changeView('messages')
      await renderMessages()
      break

    case OsEventTypeList.DOUBLE_CLICK_EVENT:
      // Cancel recording, back to messages
      await stopRecording()
      state.transcript = ''
      changeView('messages')
      await renderMessages()
      break
  }
}

async function stopRecording() {
  state.recording = false
  if (bridge) {
    try { await bridge.audioControl(false) } catch {}
  }
  if (sttSession) {
    sttSession.stop()
    sttSession = null
  }
}
