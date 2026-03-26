import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { state } from './state'

const inputStyle = {
  width: '100%',
  padding: '6px 8px',
  background: '#222',
  color: '#eee',
  border: '1px solid #444',
  borderRadius: '4px',
  fontSize: '0.85rem',
  marginBottom: '8px',
}

const labelStyle = {
  display: 'block' as const,
  marginBottom: '4px',
  fontSize: '0.85rem',
  color: '#aaa',
}

function SettingsPanel() {
  const [sttUrl, setSttUrl] = useState(state.sttUrl)
  const [discordToken, setDiscordToken] = useState(state.discordToken)
  const [guildId, setGuildId] = useState(state.guildId)
  const [saved, setSaved] = useState(false)

  function save() {
    state.sttUrl = sttUrl
    state.discordToken = discordToken
    state.guildId = guildId
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  return (
    <div style={{ padding: '12px', background: '#1a1a1a', borderRadius: '8px' }}>
      <h3 style={{ margin: '0 0 12px', fontSize: '1rem' }}>Deltaclaw Settings</h3>

      <label style={labelStyle}>STT WebSocket URL</label>
      <input type="text" value={sttUrl} onChange={(e) => setSttUrl(e.target.value)} style={inputStyle} />

      <label style={labelStyle}>Discord Bot Token</label>
      <input type="password" value={discordToken} onChange={(e) => setDiscordToken(e.target.value)} style={inputStyle} />

      <label style={labelStyle}>Discord Guild ID</label>
      <input type="text" value={guildId} onChange={(e) => setGuildId(e.target.value)} style={inputStyle} />

      <button
        onClick={save}
        style={{
          padding: '6px 16px',
          background: '#333',
          color: '#eee',
          border: '1px solid #555',
          borderRadius: '4px',
          cursor: 'pointer',
        }}
      >
        {saved ? 'Saved!' : 'Save'}
      </button>
    </div>
  )
}

export function initUI() {
  const app = document.getElementById('app')
  if (!app) return

  const heading = app.querySelector('h1')
  const container = document.createElement('div')
  container.style.margin = '16px 0'

  if (heading) {
    heading.after(container)
  } else {
    app.prepend(container)
  }

  createRoot(container).render(
    <React.StrictMode>
      <SettingsPanel />
    </React.StrictMode>,
  )
}
