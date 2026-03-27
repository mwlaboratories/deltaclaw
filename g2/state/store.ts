import { type State, type Action, buildInitialState } from './contracts'

export type Listener = (state: State, action: Action) => void

let state = buildInitialState()
const listeners: Listener[] = []

export function getState(): State {
  return state
}

export function dispatch(action: Action): void {
  // Notify all listeners - they handle side effects directly (command pattern)
  for (const listener of listeners) {
    listener(state, action)
  }
}

export function subscribe(listener: Listener): () => void {
  listeners.push(listener)
  return () => {
    const idx = listeners.indexOf(listener)
    if (idx >= 0) listeners.splice(idx, 1)
  }
}

// Direct state mutation - the store is not pure, it's a command pattern
export function mutate(fn: (s: State) => void): void {
  fn(state)
}
