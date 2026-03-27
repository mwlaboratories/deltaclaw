// Compatibility shim for ui.tsx which imports { state, saveSettings } from './state'
// All actual state logic lives in state/contracts.ts and state/store.ts
import { getState } from './state/store'
import { saveSettings as _saveSettings } from './state/contracts'

export type { View, Channel, Message, State } from './state/contracts'

// ui.tsx accesses state.sttUrl, state.discordToken, state.guildId directly
// and mutates them. getState() returns the actual mutable state object.
export const state = getState()

export function saveSettings() {
  _saveSettings(state)
}
