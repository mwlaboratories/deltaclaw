import {
  CreateStartUpPageContainer,
  RebuildPageContainer,
  TextContainerUpgrade,
  TextContainerProperty,
} from '@evenrealities/even_hub_sdk'
import { state, bridge } from './state'

async function setupContainers(count: number, texts: { id: number; name: string; content: string }[]) {
  if (!bridge) return
  const textObject = texts.map(
    (t) => new TextContainerProperty({ containerID: t.id, containerName: t.name, content: t.content }),
  )

  if (!state.startupRendered) {
    await bridge.createStartUpPageContainer(
      new CreateStartUpPageContainer({ containerTotalNum: count, textObject }),
    )
    state.startupRendered = true
  } else {
    await bridge.rebuildPageContainer(
      new RebuildPageContainer({ containerTotalNum: count, textObject }),
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
  const lines = state.channels.map((ch, i) => {
    const marker = i === state.selectedChannel ? '> ' : '  '
    return `${marker}#${ch.name}`
  })
  const body = lines.join('\n') || 'No channels found'

  await setupContainers(2, [
    { id: 1, name: 'header', content: 'Discord Channels' },
    { id: 2, name: 'body', content: body },
  ])
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
  const footer = 'Tap=Record  DblTap=Back'

  await setupContainers(3, [
    { id: 1, name: 'header', content: header },
    { id: 2, name: 'body', content: tail(body, 480) },
    { id: 3, name: 'footer', content: footer },
  ])
}

export async function renderStt() {
  await setupContainers(3, [
    { id: 1, name: 'header', content: 'Recording...' },
    { id: 2, name: 'body', content: state.transcript || '(listening)' },
    { id: 3, name: 'footer', content: 'Tap=Send  DblTap=Cancel' },
  ])
}

export async function updateTranscript() {
  await updateText(2, 'body', tail(state.transcript || '(listening)', 480))
}

export async function updateChannelSelection() {
  const lines = state.channels.map((ch, i) => {
    const marker = i === state.selectedChannel ? '> ' : '  '
    return `${marker}#${ch.name}`
  })
  await updateText(2, 'body', lines.join('\n') || 'No channels found')
}

function tail(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text
  return '...' + text.slice(text.length - maxLen + 3)
}
