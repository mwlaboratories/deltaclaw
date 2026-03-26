import { waitForEvenAppBridge } from '@evenrealities/even_hub_sdk'
import type { AppActions, SetStatus } from '../_shared/app-types'
import { appendEventLog } from '../_shared/log'
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
          state.channels = await fetchChannels(state.discordToken, state.guildId)
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
