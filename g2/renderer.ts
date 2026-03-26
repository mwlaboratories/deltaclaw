import {
  CreateStartUpPageContainer,
  RebuildPageContainer,
  TextContainerUpgrade,
  TextContainerProperty,
  ListContainerProperty,
  ListItemContainerProperty,
} from '@evenrealities/even_hub_sdk'
import { state, bridge } from './state'

type ContainerSetup = {
  count: number
  texts?: { id: number; name: string; content: string; x?: number; y?: number; w?: number; h?: number }[]
  lists?: { id: number; name: string; items: string[]; x?: number; y?: number; w?: number; h?: number }[]
}

async function setupContainers(setup: ContainerSetup) {
  if (!bridge) return

  const textObject = (setup.texts ?? []).map(
    (t) =>
      new TextContainerProperty({
        containerID: t.id,
        containerName: t.name,
        content: t.content,
        xPosition: t.x ?? 0,
        yPosition: t.y ?? 0,
        width: t.w ?? 576,
        height: t.h ?? 288,
      }),
  )

  const listObject = (setup.lists ?? []).map(
    (l) =>
      new ListContainerProperty({
        containerID: l.id,
        containerName: l.name,
        xPosition: l.x ?? 0,
        yPosition: l.y ?? 30,
        width: l.w ?? 576,
        height: l.h ?? 258,
        itemContainer: new ListItemContainerProperty({
          itemCount: l.items.length,
          itemWidth: 0,
          isItemSelectBorderEn: 1,
          itemName: l.items,
        }),
        isEventCapture: 1,
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

export async function renderChannelList() {
  const items = state.channels.map((ch) => `#${ch.name}`)

  await setupContainers({
    count: 2,
    texts: [{ id: 1, name: 'header', content: 'Deltaclaw', y: 0, h: 28 }],
    lists: [{ id: 2, name: 'channels', items, y: 30, h: 258 }],
  })
}

export async function renderMessages() {
  const ch = state.channels[state.selectedChannel]
  const header = ch ? `#${ch.name}` : 'Messages'
  const body = state.messages.length
    ? state.messages
        .slice()
        .reverse()
        .map((m) => `${m.author}: ${m.content}`)
        .join('\n')
    : 'No messages'
  const footer = 'Tap to record | Doubletap to return'

  await setupContainers({
    count: 3,
    texts: [
      { id: 1, name: 'header', content: header, y: 0, h: 28 },
      { id: 2, name: 'body', content: tail(body, 480), y: 30, h: 230 },
      { id: 3, name: 'footer', content: footer, y: 262, h: 26 },
    ],
  })
}

export async function renderStt() {
  await setupContainers({
    count: 3,
    texts: [
      { id: 1, name: 'header', content: 'Recording...', y: 0, h: 28 },
      { id: 2, name: 'body', content: state.transcript || '(listening)', y: 30, h: 230 },
      { id: 3, name: 'footer', content: 'Tap: Send  DblTap: Cancel', y: 262, h: 26 },
    ],
  })
}

export async function updateTranscript() {
  await updateText(2, 'body', tail(state.transcript || '(listening)', 480))
}

export async function updateChannelSelection() {
  // With ListContainerProperty, selection is handled by the SDK
  // Re-render the list to update
  await renderChannelList()
}

function tail(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text
  return '...' + text.slice(text.length - maxLen + 3)
}
