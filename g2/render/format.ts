import type { State, Message } from '../state/contracts'
import { VISIBLE_CHANNELS, DIVIDER } from '../state/constants'

export function buildChannelList(state: State): string {
  const total = state.channels.length
  if (!total) return '(no channels)'

  const half = Math.floor(VISIBLE_CHANNELS / 2)
  let start = Math.max(0, state.selectedChannel - half)
  let end = start + VISIBLE_CHANNELS
  if (end > total) {
    end = total
    start = Math.max(0, end - VISIBLE_CHANNELS)
  }

  return state.channels.slice(start, end).map((ch, i) => {
    const idx = start + i
    const marker = idx === state.selectedChannel ? '\u25CF' : '\u25CB'
    return `${marker} ${ch.name}`
  }).join('\n')
}

export function buildPreview(state: State): string {
  const ch = state.channels[state.selectedChannel]
  if (!ch) return ''
  if (!ch.lastAuthor || !ch.lastMessage) return '(no messages)'
  return `${ch.lastAuthor}:\n${ch.lastMessage.slice(0, 120)}`
}

export function formatMessages(messages: Message[]): string {
  if (!messages.length) return 'No messages'

  // Discord returns newest first, reverse for chronological
  return messages
    .slice()
    .reverse()
    .map((m) => {
      const time = formatTime(m.timestamp)
      return `${m.author} (${time}): ${m.content}`
    })
    .join('\n\n')
}

export function formatTime(ts: string): string {
  try {
    const d = new Date(ts)
    if (isNaN(d.getTime())) return ts.slice(0, 5)
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
  } catch {
    return ts.slice(0, 5)
  }
}

export function buildMessageContent(title: string, pages: string[], pageIndex: number): string {
  const page = pages[pageIndex] ?? ''
  const pageNum = pages.length > 1
    ? ` [${pageIndex + 1}/${pages.length}]`
    : ''
  return `${title}${pageNum}\n${DIVIDER}\n${page}`
}
