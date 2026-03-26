import WebSocket from 'ws'
import { encode, decode } from '@msgpack/msgpack'
import type { SttProvider } from './stt-relay.js'

const MOSHI_SAMPLE_RATE = 24000
const CHUNK_SAMPLES = 1920

function s16leToFloat32(buf: Buffer): Float32Array {
  const n = buf.length / 2
  const out = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    out[i] = buf.readInt16LE(i * 2) / 32768
  }
  return out
}

function resample16to24(input: Float32Array): Float32Array {
  const ratio = MOSHI_SAMPLE_RATE / 16000
  const outLen = Math.ceil(input.length * ratio)
  const out = new Float32Array(outLen)
  for (let i = 0; i < outLen; i++) {
    const srcPos = i / ratio
    const idx = Math.floor(srcPos)
    const frac = srcPos - idx
    const s0 = input[Math.min(idx, input.length - 1)]
    const s1 = input[Math.min(idx + 1, input.length - 1)]
    out[i] = s0 + frac * (s1 - s0)
  }
  return out
}

export function createMoshiProvider(host: string): SttProvider {
  let ws: WebSocket | null = null
  let buffer = new Float32Array(0)

  return {
    async connect(onWord, onError) {
      const url = `ws://${host}/api/asr-streaming?auth_id=public_token`
      ws = new WebSocket(url)

      ws.on('error', (err) => onError(err))
      ws.on('close', () => { ws = null })

      ws.on('message', (data) => {
        try {
          const msg = decode(data as Buffer) as Record<string, unknown>
          if (msg.type === 'Word' && typeof msg.text === 'string') {
            onWord(msg.text)
          }
        } catch {
          // ignore non-msgpack messages
        }
      })

      await new Promise<void>((resolve, reject) => {
        ws!.on('open', () => {
          // Send 1s silence preamble
          const silence = new Float32Array(CHUNK_SAMPLES)
          const preambleChunks = MOSHI_SAMPLE_RATE / CHUNK_SAMPLES
          for (let i = 0; i < preambleChunks; i++) {
            ws!.send(encode({ type: 'Audio', pcm: Array.from(silence) }))
          }
          resolve()
        })
        ws!.on('error', reject)
      })
    },

    sendAudio(pcm: Buffer) {
      if (!ws || ws.readyState !== WebSocket.OPEN) return

      const f32 = s16leToFloat32(pcm)
      const resampled = resample16to24(f32)

      // Accumulate and send in CHUNK_SAMPLES-sized chunks
      const combined = new Float32Array(buffer.length + resampled.length)
      combined.set(buffer)
      combined.set(resampled, buffer.length)

      let offset = 0
      while (offset + CHUNK_SAMPLES <= combined.length) {
        const chunk = combined.slice(offset, offset + CHUNK_SAMPLES)
        ws.send(encode({ type: 'Audio', pcm: Array.from(chunk) }))
        offset += CHUNK_SAMPLES
      }
      buffer = combined.slice(offset)
    },

    close() {
      if (ws && ws.readyState === WebSocket.OPEN) {
        // Send trailing silence for drain
        const silence = new Float32Array(CHUNK_SAMPLES)
        for (let i = 0; i < 25; i++) {
          ws.send(encode({ type: 'Audio', pcm: Array.from(silence) }))
        }
        setTimeout(() => ws?.close(), 1000)
      }
      buffer = new Float32Array(0)
    },
  }
}
