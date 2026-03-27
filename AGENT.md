# Even Hub SDK - G2 Glasses UI Guide

## Display

- Resolution: 576x288 pixels
- SDK v0.0.9: max 12 containers, max 8 text items, max 4 images
- Max image size: 288x144

## Container Types

### TextContainerProperty (static display or tap target)

Use for headers, footers, message bodies, status screens.

- `isEventCapture: 0` - display only, no scroll bars, no interaction
- `isEventCapture: 1` - captures tap/double-tap events, may show scroll indicators if content overflows

Keep content short on `isEventCapture: 0` panels to avoid any overflow artifacts.
Events arrive via `event.textEvent`.

### ListContainerProperty (scrollable selection list)

Use for any list the user scrolls through and selects from. The SDK handles scroll natively - do NOT manually track scroll events for lists.

Required properties:
```
borderWidth: 1
borderColor: 5
borderRdaius: 4        // note: typo in SDK, not borderRadius
paddingLength: 4
isEventCapture: 1      // only ONE container per page can have this
itemContainer: new ListItemContainerProperty({
  itemCount: items.length,
  itemWidth: containerWidth - 10,
  isItemSelectBorderEn: 1,
  itemName: items,
})
```

Events arrive via `event.listEvent`. Selected index: `event.listEvent.currentSelectItemIndex`.
Hardware omits `currentSelectItemIndex` when index is 0 - track it manually with a fallback.

### ImageContainerProperty

Use for images (maps, logos). Push data via `bridge.updateImageRawData()`.

## Event Handling

### resolveEventType

The SDK sends events in inconsistent formats. Must handle:
- Numeric values: 0=CLICK, 1=SCROLL_TOP, 2=SCROLL_BOTTOM, 3=DOUBLE_CLICK
- String values: substring match for "DOUBLE", "CLICK", "SCROLL_TOP"/"UP", "SCROLL_BOTTOM"/"DOWN"
- Multiple paths: `listEvent.eventType`, `textEvent.eventType`, `sysEvent.eventType`, `jsonData.eventType`, `jsonData.event_type`, `jsonData.Event_Type`, `jsonData.type`
- Fallback: if any sub-event exists but has no recognizable type, treat as CLICK_EVENT

### View transitions

When switching views, the tap that triggered the transition can fire again in the new view. Use a time-based guard (800ms) to ignore events immediately after a view change.

### List selection pattern (from Tesla reference app)

```typescript
let selectedIndex = 0

function resolveIndex(event: EvenHubEvent): number {
  const idx = event.listEvent?.currentSelectItemIndex
  if (typeof idx === 'number' && idx >= 0) {
    selectedIndex = idx
    return idx
  }
  return selectedIndex  // fallback for index 0
}
```

## Page Rendering

- Use `createStartUpPageContainer` for the first render
- Use `rebuildPageContainer` for all subsequent renders
- Track with a `startupRendered` boolean flag

## Layout Patterns

### Full-screen single panel (welcome, loading, confirmation)
1 container: TextContainerProperty at (0, 0, 576, 288)

### Header + body + footer (messages, STT)
3 containers:
- Header: text at (0, 0, 576, 28), isEventCapture=0
- Body: text at (0, 32, 576, 226), isEventCapture=1 for tap actions
- Footer: text at (0, 262, 576, 26), isEventCapture=0

### Dual panel (dashboard, channel browser)
4 containers:
- Header: text, full width, top
- Left panel: list or text, captures events
- Right panel: text, isEventCapture=0 (no scroll bars)
- Footer: text, full width, bottom

## Discord API via Vite Proxy

Browser cannot call Discord API directly (CORS). Use Vite's dev proxy:
```typescript
// vite.config.ts
proxy: { '/discord': { target: 'https://discord.com/api/v10', changeOrigin: true, rewrite: ... } }
```

Must include `User-Agent: DiscordBot (url, version)` header or Cloudflare blocks with error 40333.

Bot requires **Message Content Intent** enabled in Developer Portal or all message content is empty.

## Testing with Simulator

Run `bash test-sim.sh` to launch vite + simulator automatically. The app auto-connects to the bridge.

Simulator controls: Arrow up/down = scroll, Enter = tap, Enter+Enter = double-tap (back)

Send keys: `nix shell nixpkgs#wtype -c wtype -k Return` (tap), `wtype -k Down` (scroll down)

Take screenshots: `nix shell nixpkgs#grim -c grim /tmp/deltaclaw-test.png`

Kill: `pkill -f evenhub-simulator; pkill -f "vite.*5173"`

**SDK v0.0.9 uses `borderRadius` (correct spelling).** Older versions used `borderRdaius` (typo). The simulator v0.6.2 rejects the typo. Always use `borderRadius`.

## Reference

- Tesla Even G2 app: https://github.com/nickustinov/tesla-even-g2
- Even Hub docs: https://evenhub.evenrealities.com/
- SDK npm: @evenrealities/even_hub_sdk
