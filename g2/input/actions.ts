import { OsEventTypeList, type EvenHubEvent } from '@evenrealities/even_hub_sdk'
import type { Action, View } from '../state/contracts'
import { VIEW_CHANGE_GUARD_MS, SCROLL_COOLDOWN_MS } from '../state/constants'

let lastViewChangeTime = 0
let lastScrollTime = 0

export function notifyViewChange(): void {
  lastViewChangeTime = Date.now()
}

export function resolveEventType(event: EvenHubEvent): OsEventTypeList | undefined {
  const raw =
    event.listEvent?.eventType ??
    event.textEvent?.eventType ??
    event.sysEvent?.eventType ??
    (event as any).jsonData?.eventType ??
    (event as any).jsonData?.event_type ??
    (event as any).jsonData?.Event_Type ??
    (event as any).jsonData?.type

  if (raw !== undefined && raw !== null) {
    if (typeof raw === 'number') {
      switch (raw) {
        case 0: return OsEventTypeList.CLICK_EVENT
        case 1: return OsEventTypeList.SCROLL_TOP_EVENT
        case 2: return OsEventTypeList.SCROLL_BOTTOM_EVENT
        case 3: return OsEventTypeList.DOUBLE_CLICK_EVENT
        default: return raw
      }
    }
    if (typeof raw === 'string') {
      const s = raw.toUpperCase()
      if (s.includes('DOUBLE')) return OsEventTypeList.DOUBLE_CLICK_EVENT
      if (s.includes('CLICK')) return OsEventTypeList.CLICK_EVENT
      if (s.includes('SCROLL_TOP') || s.includes('UP')) return OsEventTypeList.SCROLL_TOP_EVENT
      if (s.includes('SCROLL_BOTTOM') || s.includes('DOWN')) return OsEventTypeList.SCROLL_BOTTOM_EVENT
    }
  }

  if (event.listEvent || event.textEvent || event.sysEvent) {
    return OsEventTypeList.CLICK_EVENT
  }

  return undefined
}

export function resolveIndex(event: EvenHubEvent): number {
  const idx = event.listEvent?.currentSelectItemIndex
  if (typeof idx === 'number' && idx >= 0) {
    return idx
  }
  // SDK omits currentSelectItemIndex for item 0
  return 0
}

export function mapEvent(event: EvenHubEvent, currentView: View): Action | null {
  // Handle audio events for STT
  if (event.audioEvent?.audioPcm) {
    return { type: 'AUDIO_DATA', pcm: event.audioEvent.audioPcm }
  }

  const eventType = resolveEventType(event)
  if (eventType === undefined) return null

  // View change guard - don't process events too soon after view change
  if (currentView !== 'welcome' && Date.now() - lastViewChangeTime < VIEW_CHANGE_GUARD_MS) {
    return null
  }

  switch (eventType) {
    case OsEventTypeList.CLICK_EVENT:
      return { type: 'TAP' }

    case OsEventTypeList.DOUBLE_CLICK_EVENT:
      return { type: 'DOUBLE_TAP' }

    case OsEventTypeList.SCROLL_TOP_EVENT: {
      const now = Date.now()
      if (now - lastScrollTime < SCROLL_COOLDOWN_MS) return null
      lastScrollTime = now
      return { type: 'SCROLL_UP' }
    }

    case OsEventTypeList.SCROLL_BOTTOM_EVENT: {
      const now = Date.now()
      if (now - lastScrollTime < SCROLL_COOLDOWN_MS) return null
      lastScrollTime = now
      return { type: 'SCROLL_DOWN' }
    }

    default:
      return null
  }
}
