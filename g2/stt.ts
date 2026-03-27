export type SttSession = {
  sendAudio: (pcm: Uint8Array) => void
  stop: () => void
}

// G2 glasses send 16-bit PCM at 16kHz mono
// stt-anywhere expects 32-bit float PCM at 24kHz mono
const INPUT_RATE = 16000
const OUTPUT_RATE = 24000
const MIC_GAIN = 8

function int16ToFloat32Resample(input: Uint8Array): Float32Array {
  const int16 = new Int16Array(input.buffer, input.byteOffset, input.byteLength / 2)
  const ratio = OUTPUT_RATE / INPUT_RATE
  const outputLen = Math.round(int16.length * ratio)
  const output = new Float32Array(outputLen)

  for (let i = 0; i < outputLen; i++) {
    const srcIdx = i / ratio
    const idx0 = Math.floor(srcIdx)
    const idx1 = Math.min(idx0 + 1, int16.length - 1)
    const frac = srcIdx - idx0
    const sample = int16[idx0] * (1 - frac) + int16[idx1] * frac
    // Amplify and clamp to [-1, 1]
    output[i] = Math.max(-1, Math.min(1, (sample / 32768) * MIC_GAIN))
  }

  return output
}

export function startSttSession(
  sttUrl: string,
  onWord: (text: string) => void,
  onError: (msg: string) => void,
): SttSession {
  const ws = new WebSocket(sttUrl)

  ws.binaryType = 'arraybuffer'

  ws.onopen = () => {
    console.log('[stt] Connected to relay')
  }

  ws.onmessage = (event) => {
    try {
      const raw = event.data instanceof ArrayBuffer
        ? new TextDecoder().decode(event.data)
        : event.data as string
      const data = JSON.parse(raw)
      const text = data.text ?? data.word ?? data.transcript ?? data.content
      if (text) {
        onWord(text)
      } else if (data.type === 'error') {
        onError(data.message ?? 'STT error')
      }
      // Ignore step/progress messages from stt-anywhere
    } catch {
      // Ignore non-JSON messages
    }
  }

  ws.onerror = () => onError('WebSocket error')
  ws.onclose = () => console.log('[stt] Disconnected')

  return {
    sendAudio(pcm: Uint8Array) {
      if (ws.readyState === WebSocket.OPEN) {
        const f32 = int16ToFloat32Resample(pcm)
        ws.send(new Uint8Array(f32.buffer))
      }
    },
    stop() {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(new Uint8Array(0))
      }
      ws.close()
    },
  }
}
