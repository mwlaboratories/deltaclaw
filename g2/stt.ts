export type SttSession = {
  sendAudio: (pcm: Uint8Array) => void
  stop: () => void
}

export function startSttSession(
  proxyUrl: string,
  onWord: (text: string) => void,
  onError: (msg: string) => void,
): SttSession {
  const wsUrl = proxyUrl.replace(/^http/, 'ws') + '/stt'
  const ws = new WebSocket(wsUrl)

  ws.binaryType = 'arraybuffer'

  ws.onopen = () => {
    console.log('[stt] Connected to relay')
  }

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data as string) as { type: string; text?: string; message?: string }
      if (data.type === 'word' && data.text) {
        onWord(data.text)
      } else if (data.type === 'error') {
        onError(data.message ?? 'STT error')
      }
    } catch {
      // ignore
    }
  }

  ws.onerror = () => onError('WebSocket error')
  ws.onclose = () => console.log('[stt] Disconnected')

  return {
    sendAudio(pcm: Uint8Array) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(pcm)
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
