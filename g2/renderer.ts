import {
  CreateStartUpPageContainer,
  RebuildPageContainer,
  TextContainerUpgrade,
  TextContainerProperty,
  ListContainerProperty,
  ListItemContainerProperty,
} from '@evenrealities/even_hub_sdk'
import { state, bridge } from './state'

// G2 display
const W = 576
const H = 288
const MAX_CHARS = 380
const MAX_LINES = 9
const DIVIDER = String.fromCharCode(9472).repeat(28)

// G2 font character widths (from even-bridge calibration)
const CHAR_W: Record<string, number> = {}
for (const c of "jliI!|.:;',`/") CHAR_W[c] = 1
for (const c of "()[]{}") CHAR_W[c] = 1.3
for (const c of "abcdefghknopqrstuvxyz") CHAR_W[c] = 1.75
for (const c of "0123456789$") CHAR_W[c] = 1.8
for (const c of "ABCDEFGHJKLNOPQRSTUVXYZmMwW") CHAR_W[c] = 2.5
const SPACE_PX = 5.3

function textWidth(text: string): number {
  let w = 0
  for (const c of text) w += (CHAR_W[c] ?? 1.75) * SPACE_PX
  return w
}

function centerText(text: string): string {
  const tw = textWidth(text)
  const spaces = Math.max(0, Math.floor((W - tw) / 2 / SPACE_PX))
  return ' '.repeat(spaces) + text
}

let displayRebuilt = false

// -- Low-level helpers --

function textContainer(
  id: number, name: string, content: string,
  opts: { x?: number; y?: number; w?: number; h?: number; capture?: boolean; padding?: number } = {},
): TextContainerProperty {
  return new TextContainerProperty({
    containerID: id,
    containerName: name,
    content,
    xPosition: opts.x ?? 0,
    yPosition: opts.y ?? 0,
    width: opts.w ?? W,
    height: opts.h ?? H,
    isEventCapture: opts.capture ? 1 : 0,
    borderWidth: 0,
    borderColor: 0,
    borderRadius: 0,
    paddingLength: opts.padding ?? 4,
  })
}

function listContainer(
  id: number, name: string, items: string[],
  opts: { x?: number; y?: number; w?: number; h?: number } = {},
): ListContainerProperty {
  return new ListContainerProperty({
    containerID: id,
    containerName: name,
    xPosition: opts.x ?? 0,
    yPosition: opts.y ?? 0,
    width: opts.w ?? W,
    height: opts.h ?? H,
    isEventCapture: 1,
    borderWidth: 1,
    borderColor: 13,
    borderRadius: 6,
    paddingLength: 5,
    itemContainer: new ListItemContainerProperty({
      itemCount: items.length,
      itemWidth: 560,
      isItemSelectBorderEn: 1,
      itemName: items,
    }),
  })
}

async function rebuild(
  count: number,
  textObject: TextContainerProperty[],
  listObject: ListContainerProperty[] = [],
) {
  if (!bridge) return
  displayRebuilt = false

  if (!state.startupRendered) {
    await bridge.createStartUpPageContainer(
      new CreateStartUpPageContainer({ containerTotalNum: count, textObject, listObject }),
    )
    state.startupRendered = true
  } else {
    await bridge.rebuildPageContainer(
      new RebuildPageContainer({ containerTotalNum: count, textObject, listObject }),
    )
  }
  displayRebuilt = true
}

async function updateContent(id: number, name: string, content: string) {
  if (!bridge) return
  await bridge.textContainerUpgrade(
    new TextContainerUpgrade({ containerID: id, containerName: name, content }),
  )
}

// -- Pagination --

// Estimate how many visual lines a logical line occupies after word-wrap
const TEXT_AREA_PX = 520
function visualLineCount(line: string): number {
  if (!line) return 1
  return Math.max(1, Math.ceil(textWidth(line) / TEXT_AREA_PX))
}

function paginate(text: string, maxChars = MAX_CHARS, maxLines = MAX_LINES): string[] {
  const lines = text.split('\n')
  // Build pages back-to-front so the last page (newest messages) is always full
  const pages: string[] = []
  let page = ''
  let lineCount = 0

  for (let i = lines.length - 1; i >= 0; i--) {
    // Skip blank separator lines at page boundaries
    if (!lines[i] && !page) continue
    const vlines = visualLineCount(lines[i])
    const next = page ? lines[i] + '\n' + page : lines[i]
    if (next.length > maxChars || lineCount + vlines > maxLines) {
      if (page) pages.push(page)
      // Don't start a new page with a blank separator line
      if (!lines[i]) { page = ''; lineCount = 0 }
      else { page = lines[i]; lineCount = vlines }
    } else {
      page = next
      lineCount += vlines
    }
  }
  if (page) pages.push(page)
  pages.reverse()
  return pages.length ? pages.map((p) => p.trim()) : ['']
}

// -- Welcome --

export async function renderWelcome() {
  // Single full-screen container for welcome - no split panel
  await rebuild(1, [
    textContainer(1, 'welcome', `\n\n\n${centerText('DELTACLAW')}\n\n${centerText('tap to enter')}`, { capture: true, padding: 0 }),
  ])
}

// -- Channel list with preview --

const LIST_W = 250
const PREVIEW_X = LIST_W + 8
const PREVIEW_W = W - LIST_W - 8
const VISIBLE_CHANNELS = 9

export async function renderChannelList() {
  await rebuild(3, [
    textContainer(1, 'evt', ' ', { capture: true }),
    textContainer(2, 'channels', buildChannelList(), { w: LIST_W }),
    textContainer(3, 'preview', buildPreview(), { x: PREVIEW_X, w: PREVIEW_W }),
  ])
}

function buildChannelList(): string {
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
    const marker = idx === state.selectedChannel ? '>' : ' '
    return `${marker} #${ch.name}`
  }).join('\n')
}

function buildPreview(): string {
  const ch = state.channels[state.selectedChannel]
  if (!ch) return ''
  if (!ch.lastAuthor || !ch.lastMessage) return '(no messages)'
  return `${ch.lastAuthor}:\n${ch.lastMessage.slice(0, 120)}`
}

// -- Messages --

let messagePages: string[] = []
let messagePage = 0

let messageTitle = ''

export async function renderMessages() {
  const ch = state.channels[state.selectedChannel]
  messageTitle = ch ? `#${ch.name}` : 'Messages'

  const body = formatMessages()
  messagePages = paginate(body, MAX_CHARS - 60, 7)

  // Find first page containing the latest message (newest = last in formatted text)
  // Discord returns newest first, we reverse, so messages[0] is newest and appears last
  const latestMsg = state.messages[0]
  if (latestMsg && messagePages.length > 1) {
    const needle = `${latestMsg.author} (${formatTime(latestMsg.timestamp)}):`
    // Search from the end backwards to find where latest msg starts
    let found = -1
    for (let i = 0; i < messagePages.length; i++) {
      if (messagePages[i].includes(needle)) found = i
    }
    messagePage = found >= 0 ? found : messagePages.length - 1
  } else {
    messagePage = messagePages.length - 1
  }

  await rebuild(2, [
    textContainer(1, 'evt', ' ', { capture: true }),
    textContainer(2, 'display', buildMessageContent(), { padding: 4 }),
  ])
}

function buildMessageContent(): string {
  const page = messagePages[messagePage] ?? ''
  const pageNum = messagePages.length > 1
    ? ` [${messagePage + 1}/${messagePages.length}]`
    : ''
  return `${messageTitle}${pageNum}\n${DIVIDER}\n${page}`
}

export function scrollMessages(direction: 'up' | 'down') {
  if (messagePages.length <= 1) return

  if (direction === 'up' && messagePage > 0) {
    messagePage--
  } else if (direction === 'down' && messagePage < messagePages.length - 1) {
    messagePage++
  } else {
    return
  }

  void updateContent(2, 'display', buildMessageContent())
}

function formatMessages(): string {
  if (!state.messages.length) return 'No messages'

  // Discord returns newest first, reverse for chronological
  return state.messages
    .slice()
    .reverse()
    .map((m) => {
      const time = formatTime(m.timestamp)
      return `${m.author} (${time}): ${m.content}`
    })
    .join('\n\n')
}

function formatTime(ts: string): string {
  try {
    const d = new Date(ts)
    if (isNaN(d.getTime())) return ts.slice(0, 5)
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
  } catch {
    return ts.slice(0, 5)
  }
}

// -- STT --

export async function renderStt() {
  const content = `Recording...\n${DIVIDER}\n${state.transcript || '(listening)'}\n\n\n\n\n\n\ntap to send | doubletap to cancel`

  await rebuild(2, [
    textContainer(1, 'evt', ' ', { capture: true }),
    textContainer(2, 'display', content, { padding: 4 }),
  ])
}

export async function updateTranscript() {
  const content = `Recording...\n${DIVIDER}\n${state.transcript || '(listening)'}\n\n\n\n\n\n\ntap to send | doubletap to cancel`

  if (displayRebuilt) {
    await updateContent(2, 'display', content)
  }
}

// -- Live updates --

export async function refreshMessages(token: string, channelId: string) {
  if (state.view !== 'messages') return
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
    if (newMsgs[0]?.id === state.messages[0]?.id) return
    const wasOnLastPage = messagePage === messagePages.length - 1
    state.messages = newMsgs
    messagePages = paginate(formatMessages(), MAX_CHARS - 60, 7)
    if (wasOnLastPage) messagePage = messagePages.length - 1
    await updateContent(2, 'display', buildMessageContent())
  } catch {}
}

// -- Exports for event handler --

export async function updateChannelPreview() {
  if (displayRebuilt) {
    await updateContent(2, 'channels', buildChannelList())
    await updateContent(3, 'preview', buildPreview())
  }
}

export async function updateChannelSelection() {
  await updateChannelPreview()
}
