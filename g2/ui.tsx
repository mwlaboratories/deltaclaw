import React, { useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { state, saveSettings } from './state'

const css = `
  .dc-panel {
    background: var(--bg-surface);
    border: 1px solid var(--border-dim);
    border-radius: 3px;
    overflow: hidden;
  }

  .dc-panel-header {
    font-family: var(--font-mono);
    font-size: 0.65rem;
    font-weight: 500;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text-muted);
    padding: 14px 20px 0;
  }

  .dc-guide {
    margin: 16px 20px;
    padding: 16px;
    background: var(--bg-deep);
    border: 1px solid var(--border-dim);
    border-radius: 2px;
    position: relative;
  }

  .dc-guide::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 2px;
    background: var(--accent);
    opacity: 0.6;
    border-radius: 2px 0 0 2px;
  }

  .dc-guide-title {
    font-family: var(--font-mono);
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--text-primary);
    letter-spacing: 0.05em;
    margin-bottom: 14px;
    text-transform: uppercase;
  }

  .dc-guide ol {
    margin: 0;
    padding-left: 20px;
    list-style: none;
    counter-reset: steps;
  }

  .dc-guide li {
    font-family: var(--font-display);
    font-size: 0.8rem;
    color: var(--text-secondary);
    line-height: 1.6;
    margin-bottom: 6px;
    counter-increment: steps;
    position: relative;
  }

  .dc-guide li::before {
    content: counter(steps);
    position: absolute;
    left: -20px;
    font-family: var(--font-mono);
    font-size: 0.65rem;
    color: var(--text-muted);
    font-weight: 500;
  }

  .dc-guide a {
    color: var(--accent);
    text-decoration: none;
    border-bottom: 1px solid rgba(61, 106, 255, 0.3);
    transition: border-color 0.15s;
  }

  .dc-guide a:hover {
    border-color: var(--accent);
  }

  .dc-guide code {
    font-family: var(--font-mono);
    font-size: 0.7rem;
    color: var(--text-primary);
    background: var(--bg-raised);
    padding: 1px 5px;
    border-radius: 2px;
  }

  .dc-guide .dc-hint {
    font-size: 0.7rem;
    color: var(--text-muted);
    margin-top: 2px;
  }

  .dc-field {
    padding: 0 20px;
    margin-bottom: 18px;
  }

  .dc-field-label {
    font-family: var(--font-mono);
    font-size: 0.65rem;
    font-weight: 500;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-secondary);
    margin-bottom: 4px;
  }

  .dc-field-hint {
    font-family: var(--font-display);
    font-size: 0.7rem;
    color: var(--text-muted);
    margin-bottom: 8px;
    line-height: 1.4;
  }

  .dc-input {
    width: 100%;
    font-family: var(--font-mono);
    font-size: 0.78rem;
    padding: 10px 12px;
    background: var(--bg-input);
    color: var(--text-primary);
    border: 1px solid var(--border-dim);
    border-radius: 2px;
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
  }

  .dc-input::placeholder {
    color: var(--text-muted);
    font-weight: 300;
  }

  .dc-input:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-glow);
  }

  .dc-actions {
    padding: 16px 20px 20px;
  }

  .dc-save {
    font-family: var(--font-mono);
    font-size: 0.7rem;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    padding: 10px 28px;
    border-radius: 2px;
    cursor: pointer;
    transition: all 0.15s ease;
    margin: 0;
  }

  .dc-save-setup {
    background: var(--accent);
    color: #fff;
    border: 1px solid var(--accent);
  }

  .dc-save-setup:hover {
    background: #4d78ff;
    box-shadow: 0 0 20px rgba(61, 106, 255, 0.2);
  }

  .dc-save-default {
    background: var(--bg-raised);
    color: var(--text-secondary);
    border: 1px solid var(--border-dim);
  }

  .dc-save-default:hover {
    background: var(--accent-soft);
    color: var(--text-primary);
    border-color: var(--accent);
  }

  .dc-save-done {
    background: transparent;
    color: var(--success);
    border: 1px solid rgba(52, 211, 153, 0.3);
    box-shadow: 0 0 12px var(--success-glow);
    pointer-events: none;
  }

  .dc-divider {
    height: 1px;
    background: var(--border-dim);
    margin: 4px 20px 18px;
  }

  @keyframes dc-fade-in {
    from { opacity: 0; transform: translateY(6px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .dc-panel {
    animation: dc-fade-in 0.3s ease;
  }
`

function SetupGuide({ show }: { show: boolean }) {
  if (!show) return null
  return (
    <div className="dc-guide">
      <div className="dc-guide-title">Discord Bot Setup</div>
      <ol>
        <li>
          Go to the{' '}
          <a href="https://discord.com/developers/applications" target="_blank" rel="noopener">
            Developer Portal
          </a>{' '}
          and create a New Application
        </li>
        <li>
          <strong>Bot</strong> tab - click Reset Token - copy it below
          <div className="dc-hint">
            Scroll down and enable <code>Message Content Intent</code> under Privileged Gateway Intents
          </div>
        </li>
        <li>
          <strong>OAuth2</strong> tab - <strong>URL Generator</strong>
          <div className="dc-hint">
            Scopes: check only <code>bot</code> (ignore everything else)
          </div>
          <div className="dc-hint">
            Bot Permissions - check these 3:
          </div>
          <div className="dc-hint" style={{ paddingLeft: 8 }}>
            General: <code>View Channels</code><br />
            Text: <code>Send Messages</code> + <code>Read Message History</code>
          </div>
          <div className="dc-hint">
            Copy the Generated URL at the bottom
          </div>
        </li>
        <li>Open that URL - select your server - authorize</li>
        <li>
          Right-click your server name - Copy Server ID
          <div className="dc-hint">enable Developer Mode in Discord settings first</div>
        </li>
        <li>
          In <code>~/.openclaw/openclaw.json</code> set <code>"allowBots": true</code>
          <div className="dc-hint">allows the bot to see messages from other bots/agents</div>
        </li>
      </ol>
    </div>
  )
}

function SettingsPanel() {
  const [sttUrl, setSttUrl] = useState(state.sttUrl)
  const [discordToken, setDiscordToken] = useState(state.discordToken)
  const [guildId, setGuildId] = useState(state.guildId)
  const [saved, setSaved] = useState(false)

  const needsSetup = !discordToken || !guildId

  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = css
    document.head.appendChild(style)
    return () => { document.head.removeChild(style) }
  }, [])

  function persist(token: string, guild: string, stt: string) {
    state.discordToken = token
    state.guildId = guild
    state.sttUrl = stt
    saveSettings()
  }

  function updateToken(v: string) {
    setDiscordToken(v)
    persist(v, guildId, sttUrl)
  }

  function updateGuildId(v: string) {
    setGuildId(v)
    persist(discordToken, v, sttUrl)
  }

  function updateSttUrl(v: string) {
    setSttUrl(v)
    persist(discordToken, guildId, v)
  }

  return (
    <div className="dc-panel">
      <div className="dc-panel-header">
        {needsSetup ? 'Setup' : 'Configuration'}
      </div>

      <SetupGuide show={needsSetup} />

      <div className="dc-field">
        <div className="dc-field-label">Bot Token</div>
        <div className="dc-field-hint">From the Bot tab in Developer Portal</div>
        <input
          type="password"
          className="dc-input"
          value={discordToken}
          onChange={(e) => updateToken(e.target.value)}
          placeholder="paste bot token"
        />
      </div>

      <div className="dc-field">
        <div className="dc-field-label">Server ID</div>
        <div className="dc-field-hint">Right-click server name - Copy Server ID</div>
        <input
          type="text"
          className="dc-input"
          value={guildId}
          onChange={(e) => updateGuildId(e.target.value)}
          placeholder="123456789012345678"
        />
      </div>

      <div className="dc-divider" />

      <div className="dc-field">
        <div className="dc-field-label">STT Endpoint</div>
        <div className="dc-field-hint">Optional - voice input via stt-anywhere</div>
        <input
          type="text"
          className="dc-input"
          value={sttUrl}
          onChange={(e) => updateSttUrl(e.target.value)}
          placeholder="ws://localhost:8099"
        />
      </div>

      <div className="dc-actions">
        <div className="dc-field-hint" style={{ marginBottom: 0 }}>
          {needsSetup ? 'Fill in token and server ID, then hit Connect Glasses above' : 'Auto-saved'}
        </div>
      </div>
    </div>
  )
}

export function initUI() {
  const app = document.getElementById('app')
  if (!app) return

  const heading = app.querySelector('h1')
  const container = document.createElement('div')
  container.style.margin = '24px 0'

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
