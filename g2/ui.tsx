import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { state } from './state'

function SettingsPanel() {
  const [proxyUrl, setProxyUrl] = useState(state.proxyUrl)
  const [saved, setSaved] = useState(false)

  function save() {
    state.proxyUrl = proxyUrl
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  return (
    <div style={{ padding: '12px', background: '#1a1a1a', borderRadius: '8px' }}>
      <h3 style={{ margin: '0 0 12px', fontSize: '1rem' }}>Deltaclaw Settings</h3>
      <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', color: '#aaa' }}>
        Proxy URL
      </label>
      <input
        type="text"
        value={proxyUrl}
        onChange={(e) => setProxyUrl(e.target.value)}
        style={{
          width: '100%',
          padding: '6px 8px',
          background: '#222',
          color: '#eee',
          border: '1px solid #444',
          borderRadius: '4px',
          fontSize: '0.85rem',
        }}
      />
      <button
        onClick={save}
        style={{
          marginTop: '8px',
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
