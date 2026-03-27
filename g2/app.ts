import type { AppActions, SetStatus } from '../shared/app-types'
import { appendEventLog } from '../shared/log'
import { getState, dispatch, subscribe, mutate } from './state/store'
import type { Action } from './state/contracts'
import { MAX_CHARS, POLL_INTERVAL_MS, DIVIDER } from './state/constants'
import { paginate } from './render/text'
import { formatMessages, formatTime, buildChannelList, buildPreview, buildMessageContent } from './render/format'
import { composeWelcomePage, composeChannelListPage, composeMessagesPage, composeSttPage } from './render/composer'
import { initBridge, renderPage, updateText, updateImage, setAudioCapture, onEvent } from './evenhub/bridge'
import { mapEvent, notifyViewChange } from './input/actions'
import { fetchChannels, fetchMessages, fetchLatestMessage, sendMessage } from './discord/api'
import { startSttSession, type SttSession } from './stt/session'
import { LOGO_PNG } from './logo-data'
import { initUI } from './ui'

let sttSession: SttSession | null = null
let busy = false
let pollTimer: ReturnType<typeof setInterval> | null = null

function changeView(view: 'welcome' | 'channels' | 'messages' | 'stt') {
  mutate((s) => { s.view = view })
  notifyViewChange()
}

function startPolling() {
  stopPolling()
  async function poll() {
    const s = getState()
    if (s.view === 'messages' && s.currentChannelId) {
      await refreshMessages(s.discordToken, s.currentChannelId).catch(() => {})
    }
    if (pollTimer !== null) {
      pollTimer = setTimeout(poll, POLL_INTERVAL_MS) as any
    }
  }
  pollTimer = setTimeout(poll, POLL_INTERVAL_MS) as any
}

function stopPolling() {
  if (pollTimer !== null) {
    clearTimeout(pollTimer as any)
    pollTimer = null
  }
}

async function refreshMessages(token: string, channelId: string) {
  const s = getState()
  if (s.view !== 'messages') return
  try {
    const res = await fetch(`/discord/channels/${channelId}/messages?limit=25`, {
      headers: { Authorization: `Bot ${token}`, 'Content-Type': 'application/json' },
    })
    if (!res.ok) return
    const raw = await res.json()
    const newMsgs = raw.map((m: any) => ({
      id: m.id,
      content: m.content || '[attachment]',
      author: m.author.username,
      timestamp: m.timestamp,
    }))
    if (newMsgs[0]?.id === s.messages[0]?.id) return
    const wasOnLastPage = s.messagePage === s.messagePages.length - 1
    mutate((s) => {
      s.messages = newMsgs
      s.messagePages = paginate(formatMessages(newMsgs), MAX_CHARS - 60, 7)
      if (wasOnLastPage) s.messagePage = s.messagePages.length - 1
    })
    const updated = getState()
    await updateText(2, 'display', buildMessageContent(updated.messageTitle, updated.messagePages, updated.messagePage))
  } catch {}
}

async function stopRecording() {
  mutate((s) => { s.recording = false })
  try { await setAudioCapture(false) } catch {}
  if (sttSession) {
    sttSession.stop()
    sttSession = null
  }
}

// -- Render helpers --

async function doRenderWelcome() {
  const config = composeWelcomePage()
  const wasRendered = getState().startupRendered
  const nowRendered = await renderPage(config, wasRendered)
  mutate((s) => {
    s.startupRendered = nowRendered
    s.displayRebuilt = true
  })
  await updateImage(2, 'logo', LOGO_PNG)
}

async function doRenderChannelList() {
  const s = getState()
  const config = composeChannelListPage(s)
  mutate((s) => { s.displayRebuilt = false })
  const nowRendered = await renderPage(config, s.startupRendered)
  mutate((s) => {
    s.startupRendered = nowRendered
    s.displayRebuilt = true
  })
}

async function doRenderMessages() {
  const s = getState()
  const ch = s.channels[s.selectedChannel]
  const title = ch ? ch.name : 'Messages'

  const body = formatMessages(s.messages)
  const pages = paginate(body, MAX_CHARS - 60, 7)

  // Find first page containing the latest message
  const latestMsg = s.messages[0]
  let page = pages.length - 1
  if (latestMsg && pages.length > 1) {
    const needle = `${latestMsg.author} (${formatTime(latestMsg.timestamp)}):`
    let found = -1
    for (let i = 0; i < pages.length; i++) {
      if (pages[i].includes(needle)) found = i
    }
    page = found >= 0 ? found : pages.length - 1
  }

  mutate((s) => {
    s.messageTitle = title
    s.messagePages = pages
    s.messagePage = page
    s.displayRebuilt = false
  })

  const updated = getState()
  const config = composeMessagesPage(updated)
  const nowRendered = await renderPage(config, updated.startupRendered)
  mutate((s) => {
    s.startupRendered = nowRendered
    s.displayRebuilt = true
  })
}

async function doRenderStt() {
  const s = getState()
  mutate((s) => { s.displayRebuilt = false })
  const config = composeSttPage(s)
  const nowRendered = await renderPage(config, s.startupRendered)
  mutate((s) => {
    s.startupRendered = nowRendered
    s.displayRebuilt = true
  })
}

async function doUpdateTranscript() {
  const s = getState()
  const content = `Recording...\n${DIVIDER}\n${s.transcript || '(listening)'}\n\n\n\n\n\n\ntap to send | doubletap to cancel`
  if (s.displayRebuilt) {
    await updateText(2, 'display', content)
  }
}

async function doUpdateChannelPreview() {
  const s = getState()
  if (s.displayRebuilt) {
    await updateText(2, 'channels', buildChannelList(s))
    await updateText(3, 'preview', buildPreview(s))
  }
}

// -- Event handling --

async function handleWelcomeEvent(action: Action) {
  if (action.type === 'TAP' || action.type === 'DOUBLE_TAP') {
    changeView('channels')
    await doRenderChannelList()
  }
}

async function handleChannelEvent(action: Action) {
  switch (action.type) {
    case 'SCROLL_UP': {
      const s = getState()
      mutate((s) => {
        s.selectedChannel = s.selectedChannel > 0
          ? s.selectedChannel - 1
          : s.channels.length - 1
      })
      await doUpdateChannelPreview()
      break
    }

    case 'SCROLL_DOWN': {
      const s = getState()
      mutate((s) => {
        s.selectedChannel = s.selectedChannel < s.channels.length - 1
          ? s.selectedChannel + 1
          : 0
      })
      await doUpdateChannelPreview()
      break
    }

    case 'DOUBLE_TAP':
      // No back from channels - this is the top-level view
      break

    case 'TAP': {
      if (busy) return
      busy = true
      try {
        const s = getState()
        const ch = s.channels[s.selectedChannel]
        if (!ch) return
        mutate((s) => { s.currentChannelId = ch.id })
        changeView('messages')
        appendEventLog(`#${ch.name}`)
        try {
          const msgs = await fetchMessages(s.discordToken, ch.id)
          mutate((s) => { s.messages = msgs })
          appendEventLog(`${msgs.length} msgs loaded`)
        } catch (err) {
          appendEventLog(`Error: ${err}`)
          mutate((s) => { s.messages = [] })
        }
        await doRenderMessages()
        startPolling()
      } finally {
        busy = false
      }
      break
    }
  }
}

async function handleMessageEvent(action: Action) {
  switch (action.type) {
    case 'SCROLL_UP': {
      const s = getState()
      if (s.messagePages.length <= 1) return
      if (s.messagePage > 0) {
        mutate((s) => { s.messagePage-- })
        const updated = getState()
        void updateText(2, 'display', buildMessageContent(updated.messageTitle, updated.messagePages, updated.messagePage))
      }
      break
    }

    case 'SCROLL_DOWN': {
      const s = getState()
      if (s.messagePages.length <= 1) return
      if (s.messagePage < s.messagePages.length - 1) {
        mutate((s) => { s.messagePage++ })
        const updated = getState()
        void updateText(2, 'display', buildMessageContent(updated.messageTitle, updated.messagePages, updated.messagePage))
      }
      break
    }

    case 'TAP': {
      // Start STT recording
      if (busy) return
      busy = true
      stopPolling()
      try {
        changeView('stt')
        mutate((s) => {
          s.transcript = ''
          s.recording = true
        })
        await doRenderStt()
        await setAudioCapture(true)

        const s = getState()
        sttSession = startSttSession(
          s.sttUrl,
          (word) => {
            mutate((s) => {
              s.transcript += (s.transcript ? ' ' : '') + word
            })
            void doUpdateTranscript()
          },
          (msg) => {
            appendEventLog(`STT error: ${msg}`)
          },
        )
      } finally {
        busy = false
      }
      break
    }

    case 'DOUBLE_TAP': {
      // Back to channel list
      stopPolling()
      await stopRecording()
      changeView('channels')
      mutate((s) => {
        s.currentChannelId = null
        s.messages = []
      })
      await doRenderChannelList()
      break
    }
  }
}

async function handleSttEvent(action: Action) {
  switch (action.type) {
    case 'TAP': {
      // Send transcript to Discord
      await stopRecording()
      const s = getState()
      if (s.transcript.trim() && s.currentChannelId) {
        try {
          await sendMessage(s.discordToken, s.currentChannelId, s.transcript.trim())
          appendEventLog(`Sent: ${s.transcript.trim()}`)
        } catch (err) {
          appendEventLog(`Send error: ${err}`)
        }
        const msgs = await fetchMessages(s.discordToken, s.currentChannelId).catch(() => [] as any[])
        mutate((s) => { s.messages = msgs })
      }
      mutate((s) => { s.transcript = '' })
      changeView('messages')
      await doRenderMessages()
      break
    }

    case 'DOUBLE_TAP': {
      // Cancel recording, back to messages
      await stopRecording()
      mutate((s) => { s.transcript = '' })
      changeView('messages')
      await doRenderMessages()
      break
    }
  }
}

// -- Main dispatch subscriber --

subscribe((state, action) => {
  // Handle audio data directly - no view routing needed
  if (action.type === 'AUDIO_DATA') {
    if (sttSession && state.recording) {
      sttSession.sendAudio(action.pcm)
    }
    return
  }

  if (busy && action.type !== 'AUDIO_DATA') return

  switch (state.view) {
    case 'welcome':
      void handleWelcomeEvent(action)
      break
    case 'channels':
      void handleChannelEvent(action)
      break
    case 'messages':
      void handleMessageEvent(action)
      break
    case 'stt':
      void handleSttEvent(action)
      break
  }
})

// -- Channel preview loading --

async function loadChannelPreviews() {
  const s = getState()
  if (!s.discordToken) return
  for (const ch of s.channels) {
    const msg = await fetchLatestMessage(s.discordToken, ch.id)
    if (msg) {
      ch.lastAuthor = msg.author
      ch.lastMessage = msg.content
    }
  }
  if (getState().view === 'channels') {
    await doUpdateChannelPreview()
  }
}

// -- Public API --

export function createDeltaclawActions(setStatus: SetStatus): AppActions {
  initUI()
  let connected = false

  return {
    async connect() {
      setStatus('Connecting to glasses...')
      try {
        await initBridge(6000)

        onEvent((event) => {
          const s = getState()
          const action = mapEvent(event, s.view)
          if (action) dispatch(action)
        })

        connected = true
        appendEventLog('Bridge connected')

        // Show welcome screen
        await doRenderWelcome()
        setStatus('Connected. Tap glasses to enter.')

        // Load channels in background
        try {
          const s = getState()
          if (s.discordToken && s.guildId) {
            const channels = await fetchChannels(s.discordToken, s.guildId)
            mutate((s) => { s.channels = channels })
          } else {
            mutate((s) => {
              s.channels = [
                { id: '1', name: 'general', position: 0, lastAuthor: 'jarvis', lastMessage: 'I\'ve analyzed the codebase. The main bottleneck is in the event loop.' },
                { id: '2', name: 'coder', position: 1, lastAuthor: 'jarvis', lastMessage: 'WebSocket handler refactored with connection pooling and exponential backoff.' },
                { id: '3', name: 'researcher', position: 2, lastAuthor: 'jarvis', lastMessage: 'Found 3 papers on AR interaction patterns.' },
                { id: '4', name: 'home-server', position: 3, lastAuthor: 'jarvis', lastMessage: 'Nightly backup completed. All 7 services healthy. Disk at 42%.' },
                { id: '5', name: 'philosopher', position: 4, lastAuthor: 'jarvis', lastMessage: 'A is A. The glasses exist. You are wearing them. Deal with it.' },
                { id: '6', name: 'scheduler', position: 5, lastAuthor: 'jarvis', lastMessage: 'Meeting moved to Thursday 2pm. Afternoon clear for deep work.' },
                { id: '7', name: 'second-brain', position: 6, lastAuthor: 'jarvis', lastMessage: 'The extended-mind cluster is dense - Clark & Chalmers links to your daily notes.' },
              ]
            })
          }
          appendEventLog(`Loaded ${getState().channels.length} channels`)
          loadChannelPreviews()
        } catch (err) {
          setStatus(`Channel load failed: ${err}`)
          appendEventLog(`Error: ${err}`)
        }
      } catch {
        setStatus('Bridge not found. Running in mock mode.')
        appendEventLog('Bridge timeout - mock mode')
      }
    },

    async action() {
      if (!connected) {
        setStatus('Not connected')
        return
      }
      try {
        const s = getState()
        const channels = await fetchChannels(s.discordToken, s.guildId)
        mutate((s) => { s.channels = channels })
        await doRenderChannelList()
        setStatus(`Refreshed: ${channels.length} channels`)
        loadChannelPreviews()
      } catch (err) {
        setStatus(`Refresh failed: ${err}`)
      }
    },
  }
}
