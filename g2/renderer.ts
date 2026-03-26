import {
  CreateStartUpPageContainer,
  RebuildPageContainer,
  TextContainerUpgrade,
  TextContainerProperty,
  ListContainerProperty,
  ListItemContainerProperty,
} from '@evenrealities/even_hub_sdk'
import { state, bridge } from './state'

// G2 display: 576x288
const W = 576
const H = 288
const HEADER_H = 28
const FOOTER_H = 26
const GAP = 4
const BODY_TOP = HEADER_H + GAP
const BODY_H = H - HEADER_H - FOOTER_H - GAP * 2

// Dual panel
const LIST_W = 260
const PREVIEW_X = LIST_W + GAP
const PREVIEW_W = W - LIST_W - GAP

type TextSetup = {
  id: number; name: string; content: string
  x?: number; y?: number; w?: number; h?: number
  capture?: boolean
}

type ListSetup = {
  id: number; name: string; items: string[]
  x?: number; y?: number; w?: number; h?: number
}

type ContainerSetup = {
  count: number
  texts?: TextSetup[]
  lists?: ListSetup[]
}

async function rebuild(setup: ContainerSetup) {
  if (!bridge) return

  const textObject = (setup.texts ?? []).map(
    (t) =>
      new TextContainerProperty({
        containerID: t.id,
        containerName: t.name,
        content: t.content,
        xPosition: t.x ?? 0,
        yPosition: t.y ?? 0,
        width: t.w ?? W,
        height: t.h ?? H,
        isEventCapture: t.capture ? 1 : 0,
        paddingLength: 4,
      }),
  )

  const listObject = (setup.lists ?? []).map(
    (l) =>
      new ListContainerProperty({
        containerID: l.id,
        containerName: l.name,
        xPosition: l.x ?? 0,
        yPosition: l.y ?? BODY_TOP,
        width: l.w ?? W,
        height: l.h ?? BODY_H,
        borderWidth: 1,
        borderColor: 5,
        borderRdaius: 4,
        paddingLength: 4,
        isEventCapture: 1,
        itemContainer: new ListItemContainerProperty({
          itemCount: l.items.length,
          itemWidth: (l.w ?? W) - 10,
          isItemSelectBorderEn: 1,
          itemName: l.items,
        }),
      }),
  )

  if (!state.startupRendered) {
    await bridge.createStartUpPageContainer(
      new CreateStartUpPageContainer({ containerTotalNum: setup.count, textObject, listObject }),
    )
    state.startupRendered = true
  } else {
    await bridge.rebuildPageContainer(
      new RebuildPageContainer({ containerTotalNum: setup.count, textObject, listObject }),
    )
  }
}

async function updateText(id: number, name: string, content: string) {
  if (!bridge) return
  await bridge.textContainerUpgrade(
    new TextContainerUpgrade({ containerID: id, containerName: name, content }),
  )
}

// -- Welcome --

export async function renderWelcome() {
  await rebuild({
    count: 1,
    texts: [
      { id: 1, name: 'welcome', content: '\n\n\n      DELTACLAW\n\n      tap to enter', w: W, h: H, capture: true },
    ],
  })
}

// -- Channel browser --
// List on left (SDK handles scroll natively), preview on right (no event capture = no scroll bars)

export async function renderChannelList() {
  const items = state.channels.map((ch) => `#${ch.name}`)

  await rebuild({
    count: 4,
    texts: [
      { id: 1, name: 'header', content: 'Deltaclaw', y: 0, h: HEADER_H },
      { id: 3, name: 'preview', content: buildPreview(), x: PREVIEW_X, y: BODY_TOP, w: PREVIEW_W, h: BODY_H },
      { id: 4, name: 'footer', content: 'Tap: open | DblTap: home', y: H - FOOTER_H, h: FOOTER_H },
    ],
    lists: [
      { id: 2, name: 'channels', items, x: 0, y: BODY_TOP, w: LIST_W, h: BODY_H },
    ],
  })
}

function buildPreview(): string {
  const ch = state.channels[state.selectedChannel]
  if (!ch) return ''
  if (!ch.lastAuthor || !ch.lastMessage) return `#${ch.name}\n\n(no messages)`
  return `#${ch.name}\n\n${ch.lastAuthor}:\n${truncate(ch.lastMessage, 60)}`
}

export async function updateChannelPreview() {
  await updateText(3, 'preview', buildPreview())
}

export async function updateChannelSelection() {
  await updateChannelPreview()
}

// -- Messages --

export async function renderMessages() {
  const ch = state.channels[state.selectedChannel]
  const header = ch ? `#${ch.name}` : 'Messages'

  await rebuild({
    count: 3,
    texts: [
      { id: 1, name: 'header', content: header, y: 0, h: HEADER_H },
      { id: 2, name: 'body', content: formatMessages(), y: BODY_TOP, h: BODY_H, capture: true },
      { id: 3, name: 'footer', content: 'Tap: record | DblTap: back', y: H - FOOTER_H, h: FOOTER_H },
    ],
  })
}

function formatMessages(): string {
  if (!state.messages.length) return 'No messages'
  return state.messages
    .slice(0, 8)
    .reverse()
    .map((m) => `${m.author}: ${truncate(m.content, 80)}`)
    .join('\n')
}

// -- STT --

export async function renderStt() {
  await rebuild({
    count: 3,
    texts: [
      { id: 1, name: 'header', content: 'Recording...', y: 0, h: HEADER_H },
      { id: 2, name: 'body', content: state.transcript || '(listening)', y: BODY_TOP, h: BODY_H, capture: true },
      { id: 3, name: 'footer', content: 'Tap: send | DblTap: back', y: H - FOOTER_H, h: FOOTER_H },
    ],
  })
}

export async function updateTranscript() {
  await updateText(2, 'body', state.transcript || '(listening)')
}

// --

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text
  return text.slice(0, maxLen - 3) + '...'
}
