import { waitForEvenAppBridge } from '@evenrealities/even_hub_sdk'
import type { AppActions, SetStatus } from '../shared/app-types'
import { appendEventLog } from '../shared/log'
import { state, setBridge } from './state'
import { fetchChannels } from './discord'
import { renderChannelList } from './renderer'
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
        setStatus('Connected. Loading channels...')
        appendEventLog('Bridge connected')

        try {
          if (state.discordToken && state.guildId) {
            state.channels = await fetchChannels(state.discordToken, state.guildId)
          } else {
            state.channels = [
              { id: '1', name: 'daily-digest', position: 0 },
              { id: '2', name: 'alerts', position: 1 },
              { id: '3', name: 'webapp', position: 2 },
              { id: '4', name: 'home-server', position: 3 },
              { id: '5', name: 'side-project', position: 4 },
              { id: '6', name: 'coder', position: 5 },
              { id: '7', name: 'researcher', position: 6 },
              { id: '8', name: 'org-agent', position: 7 },
              { id: '9', name: 'scheduler', position: 8 },
            ]
          }
          appendEventLog(`Loaded ${state.channels.length} channels`)
          await renderChannelList()
          setStatus(`${state.channels.length} channels. Scroll+tap to select.`)
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
      } catch (err) {
        setStatus(`Refresh failed: ${err}`)
      }
    },
  }
}
