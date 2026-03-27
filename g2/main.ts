import { waitForEvenAppBridge } from '@evenrealities/even_hub_sdk'
import type { AppActions, SetStatus } from '../shared/app-types'
import { appendEventLog } from '../shared/log'
import { state, setBridge } from './state'
import { fetchChannels, fetchLatestMessage } from './discord'
import { renderWelcome, renderChannelList, updateChannelPreview } from './renderer'
import { onEvenHubEvent } from './events'
import { initUI } from './ui'

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
    promise
      .then(resolve)
      .catch(reject)
      .finally(() => window.clearTimeout(timer))
  })
}

async function loadChannelPreviews(setStatus: SetStatus) {
  if (!state.discordToken) return
  for (const ch of state.channels) {
    const msg = await fetchLatestMessage(state.discordToken, ch.id)
    if (msg) {
      ch.lastAuthor = msg.author
      ch.lastMessage = msg.content
    }
  }
  if (state.view === 'channels') {
    await updateChannelPreview()
  }
}

export function createDeltaclawActions(setStatus: SetStatus): AppActions {
  initUI()
  let connected = false

  return {
    async connect() {
      setStatus('Connecting to glasses...')
      try {
        const bridge = await withTimeout(waitForEvenAppBridge(), 6000)
        setBridge(bridge)

        bridge.onEvenHubEvent((event) => {
          onEvenHubEvent(event)
        })

        connected = true
        appendEventLog('Bridge connected')

        // Show welcome screen
        await renderWelcome()
        setStatus('Connected. Tap glasses to enter.')

        // Load channels in background
        try {
          if (state.discordToken && state.guildId) {
            state.channels = await fetchChannels(state.discordToken, state.guildId)
          } else {
            state.channels = [
              { id: '1', name: 'algemeen', position: 0, lastAuthor: 'jarvis', lastMessage: 'I\'ve analyzed the codebase. The main bottleneck is in the event loop.' },
              { id: '2', name: 'coder', position: 1, lastAuthor: 'jarvis', lastMessage: 'Refactored the WebSocket handler. 40% faster now.' },
              { id: '3', name: 'researcher', position: 2, lastAuthor: 'jarvis', lastMessage: 'Found 3 papers on AR interaction patterns.' },
              { id: '4', name: 'home-server', position: 3, lastAuthor: 'jarvis', lastMessage: 'Backup completed. All services healthy.' },
              { id: '5', name: 'philosopher', position: 4, lastAuthor: 'jarvis', lastMessage: 'The question of consciousness in AI systems...' },
              { id: '6', name: 'scheduler', position: 5, lastAuthor: 'jarvis', lastMessage: 'Meeting with the team moved to Thursday.' },
            ]
          }
          appendEventLog(`Loaded ${state.channels.length} channels`)
          loadChannelPreviews(setStatus)
        } catch (err) {
          setStatus(`Channel load failed: ${err}`)
          appendEventLog(`Error: ${err}`)
        }
      } catch {
        setStatus('Bridge not found. Running in mock mode.')
        appendEventLog('Bridge timeout — mock mode')
      }
    },

    async action() {
      if (!connected) {
        setStatus('Not connected')
        return
      }
      try {
        state.channels = await fetchChannels(state.discordToken, state.guildId)
        await renderChannelList()
        setStatus(`Refreshed: ${state.channels.length} channels`)
        loadChannelPreviews(setStatus)
      } catch (err) {
        setStatus(`Refresh failed: ${err}`)
      }
    },
  }
}
