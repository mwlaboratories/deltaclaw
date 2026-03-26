import type WebSocket from 'ws'
import { createMoshiProvider } from './stt-moshi.js'

export interface SttProvider {
  connect(onWord: (text: string) => void, onError: (err: Error) => void): Promise<void>
  sendAudio(pcm: Buffer): void
  close(): void
}

function createProvider(name: string): SttProvider {
  switch (name) {
    case 'moshi':
      return createMoshiProvider(process.env.MOSHI_HOST || '127.0.0.1:8098')
    default:
      throw new Error(`Unknown STT provider: ${name}`)
  }
}

export async function handleSttConnection(ws: WebSocket) {
  const providerName = process.env.STT_PROVIDER || 'moshi'
  console.log(`[stt-relay] New connection, provider: ${providerName}`)

  const provider = createProvider(providerName)

  try {
    await provider.connect(
      (text) => {
        if (ws.readyState === ws.OPEN) {
          ws.send(JSON.stringify({ type: 'word', text }))
        }
      },
      (err) => {
        console.error('[stt-relay] Provider error:', err.message)
        if (ws.readyState === ws.OPEN) {
          ws.send(JSON.stringify({ type: 'error', message: err.message }))
        }
      },
    )
  } catch (err) {
    console.error('[stt-relay] Failed to connect provider:', err)
    ws.close()
    return
  }

  ws.on('message', (data) => {
    const buf = Buffer.isBuffer(data) ? data : Buffer.from(data as ArrayBuffer)
    if (buf.length === 0) {
      provider.close()
      return
    }
    provider.sendAudio(buf)
  })

  ws.on('close', () => {
    console.log('[stt-relay] Client disconnected')
    provider.close()
  })
}
