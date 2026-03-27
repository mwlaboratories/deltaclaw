import type { Channel, Message } from '../state/contracts'

const DISCORD_API = '/discord'

function headers(token: string) {
  return {
    Authorization: `Bot ${token}`,
    'Content-Type': 'application/json',
  }
}

export async function fetchChannels(token: string, guildId: string): Promise<Channel[]> {
  const res = await fetch(`${DISCORD_API}/guilds/${guildId}/channels`, {
    headers: headers(token),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Failed to fetch channels: ${res.status} ${body}`)
  }
  const channels = (await res.json()) as Array<{ id: string; name: string; type: number; position: number }>
  return channels
    .filter((ch) => ch.type === 0)
    .sort((a, b) => a.position - b.position)
    .map(({ id, name, position }) => ({ id, name, position }))
}

// Newest first (index 0 = latest), like Discord API returns
const MOCK_MESSAGES: Record<string, Message[]> = {
  '1': [
    { id: 'm1', content: 'I\'ve analyzed the codebase. The main bottleneck is in the event loop - switching to async dispatch should give us 3x throughput.', author: 'jarvis', timestamp: '2026-03-27T01:30:00Z' },
    { id: 'm2', content: 'check the event loop in the glasses app', author: 'deltaclaw', timestamp: '2026-03-27T01:29:00Z' },
  ],
  '2': [
    { id: 'm01', content: 'Done. WebSocket handler refactored with connection pooling and exponential backoff. Reconnect tested up to 50 sequential drops - recovers in under 200ms every time. All 47 tests green.', author: 'jarvis', timestamp: '2026-03-27T00:45:00Z' },
    { id: 'm02', content: 'refactor the websocket handler and add proper reconnect with backoff', author: 'deltaclaw', timestamp: '2026-03-27T00:40:00Z' },
    { id: 'm03', content: 'Merged the display layout PR. The two-container overlay pattern is working well - no more scroll artifacts on the G2 text containers. Tested on both simulator and real glasses.', author: 'jarvis', timestamp: '2026-03-27T00:30:00Z' },
    { id: 'm04', content: 'how did the overlay pattern test go on real hardware?', author: 'deltaclaw', timestamp: '2026-03-27T00:25:00Z' },
    { id: 'm05', content: 'On real hardware the invisible capture container adds ~2ms latency per event. Negligible. The text rendering is cleaner because we no longer fight the SDK scroll behavior.', author: 'jarvis', timestamp: '2026-03-27T00:20:00Z' },
    { id: 'm06', content: 'Pushed the channel list renderer. Each channel shows name + last message preview. Scrolling wraps around. Selection indicator uses > prefix.', author: 'jarvis', timestamp: '2026-03-26T23:50:00Z' },
    { id: 'm07', content: 'nice, does it handle long channel names?', author: 'deltaclaw', timestamp: '2026-03-26T23:45:00Z' },
    { id: 'm08', content: 'Names truncate at 18 chars with the current layout. The preview column gets the remaining width. I calibrated against the G2 font character width map.', author: 'jarvis', timestamp: '2026-03-26T23:40:00Z' },
    { id: 'm09', content: 'Implemented the STT pipeline. Audio from glasses -> WebSocket -> Whisper API -> transcript overlay. Tap to send, double-tap to cancel.', author: 'jarvis', timestamp: '2026-03-26T23:00:00Z' },
    { id: 'm10', content: 'what latency are we seeing on the STT path?', author: 'deltaclaw', timestamp: '2026-03-26T22:55:00Z' },
    { id: 'm11', content: 'First word appears in ~400ms. Full sentence in ~1.2s. The Whisper streaming mode helps - we get partial results as audio comes in rather than waiting for silence detection.', author: 'jarvis', timestamp: '2026-03-26T22:50:00Z' },
    { id: 'm12', content: 'Added the Discord message proxy. Hono server handles auth, forwards to Discord API. Vite proxies /discord to the server. No CORS issues.', author: 'jarvis', timestamp: '2026-03-26T22:00:00Z' },
    { id: 'm13', content: 'set up the discord proxy so we can fetch messages from the glasses app', author: 'deltaclaw', timestamp: '2026-03-26T21:55:00Z' },
    { id: 'm14', content: 'The proxy strips the bot token server-side so it never hits the browser. Rate limiting passes through from Discord - we get 429s if we poll too fast.', author: 'jarvis', timestamp: '2026-03-26T21:50:00Z' },
    { id: 'm15', content: 'Fixed the event handler. The SDK sends eventType as numeric sometimes, string other times. Added normalization layer that handles both plus the jsonData wrapper variants.', author: 'jarvis', timestamp: '2026-03-26T21:00:00Z' },
    { id: 'm16', content: 'the click events are inconsistent between simulator and glasses', author: 'deltaclaw', timestamp: '2026-03-26T20:55:00Z' },
    { id: 'm17', content: 'Yeah, simulator sends {listEvent: {eventType: 0}} but glasses send {jsonData: {event_type: "CLICK_EVENT"}}. The normalization handles both now. Also handles Event_Type capitalization variant.', author: 'jarvis', timestamp: '2026-03-26T20:50:00Z' },
    { id: 'm18', content: 'Built the pagination system. Messages split into pages of 7 lines / 320 chars. Page indicator shows [3/12] style. Scroll up/down navigates pages.', author: 'jarvis', timestamp: '2026-03-26T20:00:00Z' },
    { id: 'm19', content: 'add pagination to the message view, 25 messages wont fit on one screen', author: 'deltaclaw', timestamp: '2026-03-26T19:55:00Z' },
    { id: 'm20', content: 'Auto-scrolls to the page containing the newest message on load. If you were on the last page and new messages arrive during polling, it stays on the last page.', author: 'jarvis', timestamp: '2026-03-26T19:50:00Z' },
    { id: 'm21', content: 'Set up the Even Hub bridge connection with a 6-second timeout. If no glasses respond, falls back to mock mode with hardcoded channels and messages. Good for development.', author: 'jarvis', timestamp: '2026-03-26T19:00:00Z' },
    { id: 'm22', content: 'we need a way to develop without the glasses connected', author: 'deltaclaw', timestamp: '2026-03-26T18:55:00Z' },
    { id: 'm23', content: 'The simulator covers most cases but having a pure mock mode means we can also test in CI. No graphics dependencies needed.', author: 'jarvis', timestamp: '2026-03-26T18:50:00Z' },
    { id: 'm24', content: 'Scaffolded the project. Vite + TypeScript, Even Hub SDK wired up, basic state machine: welcome -> channels -> messages -> stt. Each view handles click, scroll, and double-click.', author: 'jarvis', timestamp: '2026-03-26T18:00:00Z' },
    { id: 'm25', content: 'start the glasses app - discord reader with voice reply', author: 'deltaclaw', timestamp: '2026-03-26T17:55:00Z' },
  ],
  '3': [
    { id: 'm1', content: 'Found 3 relevant papers on AR interaction patterns. Key finding: gesture recognition latency under 100ms is critical for user satisfaction.', author: 'jarvis', timestamp: '2026-03-26T22:15:00Z' },
    { id: 'm2', content: 'research AR interaction patterns', author: 'deltaclaw', timestamp: '2026-03-26T22:10:00Z' },
  ],
  '4': [
    { id: 'm01', content: 'Nightly backup completed. All 7 services healthy. Disk usage at 42%, network throughput nominal.', author: 'jarvis', timestamp: '2026-03-27T09:00:00Z' },
    { id: 'm02', content: 'morning status report', author: 'deltaclaw', timestamp: '2026-03-27T08:55:00Z' },
    { id: 'm03', content: 'Tailscale ACL updated. The glasses now route through the exit node when on mobile data. Latency added: ~15ms. Acceptable for Discord polling.', author: 'jarvis', timestamp: '2026-03-27T08:30:00Z' },
    { id: 'm04', content: 'make sure the glasses can reach the server on mobile data', author: 'deltaclaw', timestamp: '2026-03-27T08:25:00Z' },
    { id: 'm05', content: 'Gitea mirror sync completed. 34 repos mirrored from GitHub. Delta: 3 new commits in deltaclaw, 1 in dotfiles. Mirror lag: 12 minutes.', author: 'jarvis', timestamp: '2026-03-27T07:00:00Z' },
    { id: 'm06', content: 'Jellyfin transcoding queue cleared. Hardware acceleration working on the Intel GPU. 4K -> 1080p in real-time with 8% CPU usage.', author: 'jarvis', timestamp: '2026-03-27T06:00:00Z' },
    { id: 'm07', content: 'Wireguard tunnel to VPS stable for 47 days. No packet loss. The DNS-over-HTTPS resolver handled 12,400 queries yesterday - 34% blocked by adlists.', author: 'jarvis', timestamp: '2026-03-27T05:00:00Z' },
    { id: 'm08', content: 'ZFS scrub completed on tank pool. No errors. 2.1TB used of 8TB. Dedup ratio: 1.34x. Next scrub scheduled in 14 days.', author: 'jarvis', timestamp: '2026-03-27T04:00:00Z' },
    { id: 'm09', content: 'check the zfs pool health, it has been a while since we scrubbed', author: 'deltaclaw', timestamp: '2026-03-27T03:55:00Z' },
    { id: 'm10', content: 'Containers updated overnight. Pulled 6 new images. Immich, Paperless-ngx, and Vaultwarden all running latest. No breaking changes detected in changelogs.', author: 'jarvis', timestamp: '2026-03-27T03:00:00Z' },
    { id: 'm11', content: 'which containers got updates?', author: 'deltaclaw', timestamp: '2026-03-27T02:55:00Z' },
    { id: 'm12', content: 'Immich 1.99.0 adds face clustering improvements. Paperless-ngx 2.6 has better OCR for handwritten notes. Vaultwarden minor security patch.', author: 'jarvis', timestamp: '2026-03-27T02:50:00Z' },
    { id: 'm13', content: 'Prometheus metrics look good. Memory usage stable at 14GB/32GB. The Grafana dashboard shows no anomalies in the last 7 days.', author: 'jarvis', timestamp: '2026-03-27T01:00:00Z' },
    { id: 'm14', content: 'Paperless-ngx ingested 8 new documents from the scanner. Auto-tagged: 3 receipts, 2 medical, 1 insurance, 2 correspondence. All searchable.', author: 'jarvis', timestamp: '2026-03-26T23:00:00Z' },
    { id: 'm15', content: 'nice, the auto-tagging is getting better', author: 'deltaclaw', timestamp: '2026-03-26T22:55:00Z' },
    { id: 'm16', content: 'The custom classifier I trained on your last 200 documents is at 94% accuracy now. Main confusion: distinguishing utility bills from receipts when both have dollar amounts.', author: 'jarvis', timestamp: '2026-03-26T22:50:00Z' },
    { id: 'm17', content: 'SMART status on all drives: healthy. Drive 1 (WD Red 4TB) has 18,200 power-on hours. Drive 2 at 16,800. Both well within expected lifespan.', author: 'jarvis', timestamp: '2026-03-26T21:00:00Z' },
    { id: 'm18', content: 'Home Assistant automations ran: 47 today. Notable: lights adjusted 12 times based on presence, HVAC switched to eco mode at 10pm, morning coffee triggered at 6:45am.', author: 'jarvis', timestamp: '2026-03-26T20:00:00Z' },
    { id: 'm19', content: 'how many automations fired today?', author: 'deltaclaw', timestamp: '2026-03-26T19:55:00Z' },
    { id: 'm20', content: 'The presence detection is solid now. Combining Unifi device tracking with the mmWave sensors gives near-instant room detection. False positives down to <1%.', author: 'jarvis', timestamp: '2026-03-26T19:50:00Z' },
    { id: 'm21', content: 'Nginx Proxy Manager renewed 4 SSL certificates via ACME. All internal services accessible via HTTPS. Certificate expiry monitor shows nothing due for 60 days.', author: 'jarvis', timestamp: '2026-03-26T18:00:00Z' },
    { id: 'm22', content: 'Syncthing cluster in sync. 3 nodes (server, laptop, phone) all at parity. 127GB synced across devices. Conflict file count: 0.', author: 'jarvis', timestamp: '2026-03-26T16:00:00Z' },
    { id: 'm23', content: 'Power consumption yesterday: 2.4 kWh for the whole rack. The switch to the Minisforum MS-01 saved ~40% vs the old tower.', author: 'jarvis', timestamp: '2026-03-26T14:00:00Z' },
    { id: 'm24', content: 'what is the power draw looking like after the hardware swap?', author: 'deltaclaw', timestamp: '2026-03-26T13:55:00Z' },
    { id: 'm25', content: 'UPS battery test passed. Runtime at current load: 42 minutes. NUT daemon reporting to all connected clients. Auto-shutdown triggers at 15% remaining.', author: 'jarvis', timestamp: '2026-03-26T12:00:00Z' },
  ],
  '5': [
    { id: 'm1', content: 'A is A. The glasses exist. You are wearing them. To deny this is to deny existence itself. The AR overlay is not a contradiction - it is reality augmented by the rational mind.', author: 'jarvis', timestamp: '2026-03-26T23:30:00Z' },
    { id: 'm2', content: 'are AR glasses objectively good?', author: 'deltaclaw', timestamp: '2026-03-26T23:25:00Z' },
    { id: 'm3', content: 'The man who refuses to wear smart glasses is the man who refuses to use his mind. Technology is not optional - it is the tool of the rational being.', author: 'jarvis', timestamp: '2026-03-26T23:35:00Z' },
  ],
  '6': [
    { id: 'm1', content: 'Meeting with the team moved to Thursday 2pm. Your afternoon today is clear for deep work.', author: 'jarvis', timestamp: '2026-03-27T08:00:00Z' },
    { id: 'm2', content: 'reschedule the team meeting', author: 'deltaclaw', timestamp: '2026-03-27T07:55:00Z' },
  ],
  '7': [
    { id: 'm01', content: 'The extended-mind cluster is the most interesting. Clark & Chalmers 1998 links through to your daily notes on wearing the glasses. You are literally living the thesis: cognition does not stop at the skull.', author: 'jarvis', timestamp: '2026-03-27T02:20:00Z' },
    { id: 'm02', content: 'Linked 12 new nodes. Your note on "embodied cognition" now connects to AR-interaction, phenomenology, and the glasses project. 3 clusters emerging: tool-for-thought, spatial-computing, extended-mind.', author: 'jarvis', timestamp: '2026-03-27T02:15:00Z' },
    { id: 'm03', content: 'run the nightly org-roam sync and find new connections', author: 'deltaclaw', timestamp: '2026-03-27T02:10:00Z' },
    { id: 'm04', content: 'Backlinked your reading notes on "The Design of Everyday Things" to 8 existing nodes. Norman\'s affordance concept maps cleanly onto the glasses interaction model - tap, scroll, double-tap are discoverable affordances.', author: 'jarvis', timestamp: '2026-03-27T01:30:00Z' },
    { id: 'm05', content: 'I just finished reading Norman, link it to the glasses design notes', author: 'deltaclaw', timestamp: '2026-03-27T01:25:00Z' },
    { id: 'm06', content: 'Your Zettelkasten now has 847 nodes and 2,340 edges. The graph density is 0.0065 - healthy for a knowledge graph this size. Most connected node: "tool-for-thought" with 34 backlinks.', author: 'jarvis', timestamp: '2026-03-27T00:30:00Z' },
    { id: 'm07', content: 'how big is the graph now?', author: 'deltaclaw', timestamp: '2026-03-27T00:25:00Z' },
    { id: 'm08', content: 'Detected a potential bridge node: your note on "spatial memory" connects the tool-for-thought cluster to the VR/AR cluster through only 2 hops. This could be a fertile area for new writing.', author: 'jarvis', timestamp: '2026-03-26T23:45:00Z' },
    { id: 'm09', content: 'find notes that bridge between different topic clusters', author: 'deltaclaw', timestamp: '2026-03-26T23:40:00Z' },
    { id: 'm10', content: 'The "method of loci" note is another bridge - it connects classical rhetoric, spatial computing, and memory palaces. Your annotation from last week about AR as a literal memory palace is prescient.', author: 'jarvis', timestamp: '2026-03-26T23:35:00Z' },
    { id: 'm11', content: 'Org-roam DB rebuilt. Index time: 3.2s for 847 files. The Emacs server is caching the graph - subsequent queries return in <50ms. Ripgrep handles full-text search.', author: 'jarvis', timestamp: '2026-03-26T22:30:00Z' },
    { id: 'm12', content: 'the org-roam db rebuild is slow, can we cache it?', author: 'deltaclaw', timestamp: '2026-03-26T22:25:00Z' },
    { id: 'm13', content: 'Your daily note from today has 4 fleeting notes captured from the glasses. Auto-promoted 2 to literature notes based on your tagging. The others need manual review.', author: 'jarvis', timestamp: '2026-03-26T21:30:00Z' },
    { id: 'm14', content: 'Synced org-roam to mobile via Syncthing. The read-only Orgzly view on your phone shows all 847 notes. Search works offline. Last sync: 4 minutes ago.', author: 'jarvis', timestamp: '2026-03-26T20:30:00Z' },
    { id: 'm15', content: 'make sure org-roam syncs to mobile', author: 'deltaclaw', timestamp: '2026-03-26T20:25:00Z' },
    { id: 'm16', content: 'Generated your weekly knowledge report. Top 5 most-edited notes this week: "deltaclaw architecture", "Even SDK quirks", "glasses UX patterns", "org-roam workflow", "homelab network".', author: 'jarvis', timestamp: '2026-03-26T19:30:00Z' },
    { id: 'm17', content: 'what did I work on most this week?', author: 'deltaclaw', timestamp: '2026-03-26T19:25:00Z' },
    { id: 'm18', content: 'Interesting pattern: your notes on "spaced repetition" from 6 months ago are starting to connect to "glasses notifications". You wrote then that SRS could work as ambient review via AR. The deltaclaw project is making that real.', author: 'jarvis', timestamp: '2026-03-26T18:30:00Z' },
    { id: 'm19', content: 'Tagged 3 orphan nodes that had zero backlinks. Connected "Vannevar Bush - As We May Think" to the tool-for-thought cluster and "memex" to the glasses project. Bush predicted all of this in 1945.', author: 'jarvis', timestamp: '2026-03-26T17:30:00Z' },
    { id: 'm20', content: 'find any orphan notes and suggest connections', author: 'deltaclaw', timestamp: '2026-03-26T17:25:00Z' },
    { id: 'm21', content: 'Exported the graph visualization as SVG. 847 nodes, colored by cluster. The spatial-computing cluster (blue) is growing fastest - 12 new nodes this week vs 4 for tool-for-thought (green).', author: 'jarvis', timestamp: '2026-03-26T16:00:00Z' },
    { id: 'm22', content: 'Your capture workflow is averaging 6 fleeting notes per day through the glasses. Conversion rate to permanent notes: 40%. The glasses + org-roam pipeline is working.', author: 'jarvis', timestamp: '2026-03-26T14:00:00Z' },
    { id: 'm23', content: 'how is the capture rate from the glasses?', author: 'deltaclaw', timestamp: '2026-03-26T13:55:00Z' },
    { id: 'm24', content: 'Re-indexed the bibliography. 127 references in org-cite format. Linked to Zotero via Better BibTeX. Your most-cited author: Andy Matuschak (9 refs), followed by Bret Victor (7).', author: 'jarvis', timestamp: '2026-03-26T12:00:00Z' },
    { id: 'm25', content: 'sync the bibliography and make sure all citations are linked', author: 'deltaclaw', timestamp: '2026-03-26T11:55:00Z' },
  ],
}

type RawMessage = {
  id: string
  content: string
  author: { username: string }
  timestamp: string
  embeds?: Array<{ title?: string; description?: string }>
  attachments?: Array<{ filename: string }>
  sticker_items?: Array<{ name: string }>
}

export function extractContent(msg: RawMessage): string {
  const parts: string[] = []
  if (msg.content) parts.push(msg.content)
  if (msg.embeds?.length) {
    for (const e of msg.embeds) {
      if (e.title) parts.push(`[${e.title}]`)
      else if (e.description) parts.push(e.description.slice(0, 100))
    }
  }
  if (msg.attachments?.length) {
    parts.push(msg.attachments.map((a) => a.filename).join(', '))
  }
  if (msg.sticker_items?.length) {
    parts.push(msg.sticker_items.map((s) => `[${s.name}]`).join(' '))
  }
  return parts.join(' ') || '[empty]'
}

export async function fetchMessages(
  token: string,
  channelId: string,
  limit = 25,
): Promise<Message[]> {
  if (!token) return MOCK_MESSAGES[channelId] ?? []

  const res = await fetch(`${DISCORD_API}/channels/${channelId}/messages?limit=${limit}`, {
    headers: headers(token),
  })
  if (!res.ok) throw new Error(`Failed to fetch messages: ${res.status}`)
  const messages = (await res.json()) as RawMessage[]
  return messages.map((msg) => ({
    id: msg.id,
    content: extractContent(msg),
    author: msg.author.username,
    timestamp: msg.timestamp,
  }))
}

export async function fetchLatestMessage(
  token: string,
  channelId: string,
): Promise<{ author: string; content: string } | null> {
  if (!token) return null
  try {
    const msgs = await fetchMessages(token, channelId, 1)
    return msgs[0] ? { author: msgs[0].author, content: msgs[0].content } : null
  } catch {
    return null
  }
}

export async function sendMessage(token: string, channelId: string, content: string): Promise<void> {
  const res = await fetch(`${DISCORD_API}/channels/${channelId}/messages`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({ content }),
  })
  if (!res.ok) throw new Error(`Failed to send message: ${res.status}`)
}
