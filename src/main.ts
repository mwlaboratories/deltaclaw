import { app } from '../g2/index'
import { appendEventLog } from '../shared/log'

;(async () => {
  const connectBtn = document.getElementById('connectBtn') as HTMLButtonElement
  const actionBtn = document.getElementById('actionBtn') as HTMLButtonElement
  const statusEl = document.getElementById('status')!
  const heading = document.querySelector('h1')!

  if (app.pageTitle) document.title = app.pageTitle
  heading.textContent = app.name
  if (app.connectLabel) connectBtn.textContent = app.connectLabel
  if (app.actionLabel) actionBtn.textContent = app.actionLabel
  if (app.initialStatus) statusEl.textContent = app.initialStatus

  function setStatus(text: string) {
    statusEl.textContent = text
    appendEventLog(text)
  }

  const actions = await app.createActions(setStatus)

  connectBtn.addEventListener('click', () => void actions.connect())
  actionBtn.addEventListener('click', () => void actions.action())
})()
