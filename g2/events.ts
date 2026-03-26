import { OsEventTypeList, type EvenHubEvent } from '@evenrealities/even_hub_sdk'
import { state, bridge } from './state'
import { fetchMessages, sendMessage } from './discord'
import { renderChannelList, renderMessages, renderStt, updateChannelSelection } from './renderer'
import { startSttSession, type SttSession } from './stt'
import { appendEventLog } from '../_shared/log'

const SCROLL_COOLDOWN_MS = 300
let lastScrollTime = 0
let sttSession: SttSession | null = null

function resolveEventType(event: EvenHubEvent): OsEventTypeList | undefined {
  // SDK dispatches typed sub-events: textEvent, listEvent, sysEvent
  const raw =
    event.textEvent?.eventType ??
    event.listEvent?.eventType ??
    event.sysEvent?.eventType
  if (raw === undefined || raw === null) return undefined
  return raw
}

function scrollThrottled(): boolean {
  const now = Date.now()
  if (now - lastScrollTime < SCROLL_COOLDOWN_MS) return true
  lastScrollTime = now
  return false
}

export function onEvenHubEvent(event: EvenHubEvent) {
  // Handle audio events for STT
  if (event.audioEvent?.audioPcm && sttSession && state.recording) {
    sttSession.sendAudio(event.audioEvent.audioPcm)
    return
  }

  const eventType = resolveEventType(event)
  if (eventType === undefined) return

  appendEventLog(`Event: ${eventType} view=${state.view}`)

  switch (state.view) {
    case 'channels':
      handleChannelEvent(eventType)
      break
    case 'messages':
      handleMessageEvent(eventType)
      break
    case 'stt':
      handleSttEvent(eventType)
      break
  }
}

async function handleChannelEvent(type: OsEventTypeList) {
  switch (type) {
    case OsEventTypeList.SCROLL_TOP_EVENT:
      if (scrollThrottled()) return
      if (state.selectedChannel > 0) {
        state.selectedChannel--
        await updateChannelSelection()
      }
      break

    case OsEventTypeList.SCROLL_BOTTOM_EVENT:
      if (scrollThrottled()) return
      if (state.selectedChannel < state.channels.length - 1) {
        state.selectedChannel++
        await updateChannelSelection()
      }
      break

    case OsEventTypeList.CLICK_EVENT: {
      const ch = state.channels[state.selectedChannel]
      if (!ch) return
      state.currentChannelId = ch.id
      state.view = 'messages'
      appendEventLog(`Opening #${ch.name}`)
      try {
        state.messages = await fetchMessages(state.discordToken, ch.id)
      } catch (err) {
        appendEventLog(`Error: ${err}`)
        state.messages = []
      }
      await renderMessages()
      break
    }
  }
}

async function handleMessageEvent(type: OsEventTypeList) {
  switch (type) {
    case OsEventTypeList.SCROLL_TOP_EVENT:
      if (scrollThrottled()) return
      // Refresh messages
      if (state.currentChannelId) {
        try {
          state.messages = await fetchMessages(state.discordToken, state.currentChannelId)
          await renderMessages()
        } catch (err) {
          appendEventLog(`Error refreshing: ${err}`)
        }
      }
      break

    case OsEventTypeList.CLICK_EVENT:
      // Start STT recording
      state.view = 'stt'
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
      break

    case OsEventTypeList.DOUBLE_CLICK_EVENT:
      // Back to channel list
      state.view = 'channels'
      state.currentChannelId = null
      state.messages = []
      await renderChannelList()
      break
  }
}

async function handleSttEvent(type: OsEventTypeList) {
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
      state.view = 'messages'
      await renderMessages()
      break

    case OsEventTypeList.DOUBLE_CLICK_EVENT:
      // Cancel recording
      await stopRecording()
      state.transcript = ''
      state.view = 'messages'
      await renderMessages()
      break
  }
}

async function stopRecording() {
  state.recording = false
  if (bridge) {
    await bridge.audioControl(false)
  }
  if (sttSession) {
    sttSession.stop()
    sttSession = null
  }
}
