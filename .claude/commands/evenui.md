# Even G2 Glasses UI Rendering

You are an expert on the Even Realities G2 smart glasses display pipeline. When the user asks you to build or modify UI for the G2 glasses, follow this guide precisely. Do NOT guess - every detail here was verified through testing on real hardware and reference apps (EvenChess, Tesla G2).

Reference repos:
- https://github.com/nickustinov/even-g2-notes (authoritative docs)
- https://github.com/dmyster145/EvenChess (image-heavy app, working on real glasses)
- https://github.com/nickustinov/tesla-even-g2 (map images, dashboard layout)

## Display Hardware

- Green micro-LED, 576x288 pixels
- All colors converted to 4-bit greyscale (16 levels of green) by host app before transmission
- Black = OFF pixels, brighter = more green
- SDK: `@evenrealities/even_hub_sdk`

## Container System

Max **4 containers per page** (mixed types). Exactly ONE must have `isEventCapture: 1`. `containerTotalNum` must match actual container count.

### Rendering Lifecycle

1. **First render (once):** `bridge.createStartUpPageContainer(...)` - returns result code (0=success)
2. **All subsequent renders:** `bridge.rebuildPageContainer(...)` - full redraw, destroys all containers
3. **In-place text update:** `bridge.textContainerUpgrade(...)` - no layout change, flicker-free on hardware
4. **Image data push:** `bridge.updateImageRawData(...)` - fills empty image placeholder
5. Track startup with a `startupRendered` boolean flag

Both startup and rebuild accept the same shape:
```typescript
{ containerTotalNum, textObject?, listObject?, imageObject? }
```

### TextContainerProperty

```typescript
new TextContainerProperty({
  containerID: number,          // unique across all containers
  containerName: string,        // max 16 chars
  content: string,              // max 1000 chars (startup/rebuild), 2000 (textContainerUpgrade)
  xPosition: number, yPosition: number,
  width: number, height: number,
  isEventCapture: 0 | 1,
  borderWidth: number,          // 0-5, 0 = no border
  borderColor: number,          // 0-16 greyscale level
  borderRdaius: number,         // 0-10. MUST use typo "borderRdaius" - real glasses reject "borderRadius" (result=1 invalid). Simulator accepts both.
  paddingLength: number,        // 0-32 uniform padding
})
```

**Key behaviors:**
- No font selection, no font size, no bold/italic, no text alignment
- Text wraps at container width; overflow scrolls if `isEventCapture: 1`, clips otherwise
- `\n` for line breaks; Unicode works (box drawing, block elements, arrows, geometric shapes)
- To "center" text, manually pad with spaces (use calibrated `centerText()` in renderer.ts)
- ~400-500 chars fill a full-screen container
- `SCROLL_TOP_EVENT`/`SCROLL_BOTTOM_EVENT` are boundary events, not every gesture

### ListContainerProperty

```typescript
new ListContainerProperty({
  containerID: number, containerName: string,
  xPosition: number, yPosition: number,
  width: number, height: number,
  isEventCapture: 1,
  borderWidth: 1, borderColor: 5, borderRdaius: 4, paddingLength: 4,
  itemContainer: new ListItemContainerProperty({
    itemCount: items.length,    // 1-20
    itemWidth: width - 10,      // 0 = auto-fill
    isItemSelectBorderEn: 1,
    itemName: items,            // max 64 chars each
  }),
})
```

**Key behaviors:**
- Firmware handles scroll highlighting natively - do NOT manually track scroll for lists
- Click events report `currentSelectItemIndex` via `listEvent`
- Hardware omits `currentSelectItemIndex` when index is 0 - track with fallback variable
- Cannot update items in-place - must `rebuildPageContainer`
- Item height = containerHeight / itemCount (no control)
- A 1x1 list with 1 item does NOT generate scroll events - only click/double-click

### ImageContainerProperty

```typescript
new ImageContainerProperty({
  containerID: number,
  containerName: string,
  xPosition: number, yPosition: number,
  width: number,                // range: 20-200
  height: number,               // range: 20-100
})
```

**CRITICAL - Two-step process:**
1. Include empty placeholder in `createStartUpPageContainer` or `rebuildPageContainer`
2. Push pixel data AFTER via `bridge.updateImageRawData()`

```typescript
await bridge.updateImageRawData(new ImageRawDataUpdate({
  containerID: 2,
  containerName: 'logo',
  imageData: Array.from(new Uint8Array(pngBuffer)),  // PNG bytes as number[]
}))
```

Returns `ImageRawDataUpdateResult`: success/imageException/imageSizeInvalid/imageToGray4Failed/sendFailed.

**Image format - two approaches (both work on real hardware):**

1. **PNG as number[]** (simpler) - Tesla app approach:
   - `Array.from(new Uint8Array(pngBuffer))` or base64 PNG string
   - Host converts to 4-bit greyscale automatically
   - Do NOT manually dither - host does better 4-bit downsampling

2. **1-bit BMP as number[]** (more control) - Chess app approach:
   - Render pixels into 1-bit packed bitmap, wrap in BMP with color table
   - BMP palette: index 0 = black (0,0,0), index 1 = green (0,255,0)
   - `Array.from(bmpBytes)` as imageData
   - Can also encode packed pixels as 1-bit PNG for smaller payload

**Hard constraints:**
- **Max: 200w x 100h** - larger silently fails (renders nothing)
- Match image dimensions exactly to container dimensions (mismatch causes tiling/repeat)
- Do NOT send concurrent image updates - queue sequentially, await each
- Glasses memory limited - avoid frequent image updates
- No `isEventCapture` on images - use a text container behind the image for events

**Image-based app event capture pattern (from even-g2-notes):**
```typescript
// Full-screen text BEHIND image receives all events including scroll
const config = {
  containerTotalNum: 2,
  textObject: [new TextContainerProperty({
    containerID: 1, containerName: 'evt', content: ' ',
    xPosition: 0, yPosition: 0, width: 576, height: 288,
    isEventCapture: 1, paddingLength: 0,
  })],
  imageObject: [new ImageContainerProperty({
    containerID: 2, containerName: 'screen',
    xPosition: 188, yPosition: 94,  // centered: (576-200)/2, (288-100)/2
    width: 200, height: 100,
  })],
}
```

### Converting images for G2

Use `scripts/convert-logo.ts` (requires `sharp` dev dependency):
```
npx tsx scripts/convert-logo.ts
```
Reads `docs/logo.png`, composites with subtitle text, outputs `g2/logo-data.ts` as PNG `number[]`.

For best results: resize to container dims, greyscale, black canvas background, encode as PNG.

## Event Handling

Events arrive in inconsistent formats. The `resolveEventType()` helper handles:
- Numeric: 0=CLICK, 1=SCROLL_TOP, 2=SCROLL_BOTTOM, 3=DOUBLE_CLICK
- String: substring match for "DOUBLE", "CLICK", "SCROLL_TOP"/"UP", "SCROLL_BOTTOM"/"DOWN"
- Multiple paths: `listEvent.eventType`, `textEvent.eventType`, `sysEvent.eventType`, `jsonData.eventType`, `jsonData.event_type`, `jsonData.Event_Type`, `jsonData.type`
- Fallback: if any sub-event exists but no recognizable type, treat as CLICK_EVENT

**View transition guard:** The tap that triggered a transition can fire again in the new view. Use ~800ms time guard.

## Layout Patterns

### Full-screen text (welcome, loading, confirmation)
1 container: TextContainerProperty at (0, 0, 576, 288), `isEventCapture: 1`

### Image splash screen
2 containers: full-screen text (evt capture, content: ' '), image centered on top
- Center: `xPosition = (576-width)/2`, `yPosition = (288-height)/2`

### Split panel with image (chess, tesla dashboard)
3-4 containers: text left, image(s) right
- Chess uses 2 stacked image containers (200x100 each) for a 200x200 board
- Text container has `isEventCapture: 1`

### Channel browser (deltaclaw)
3 containers: event capture text, left list/text, right text preview

### Paginated messages
2 containers: event capture text, display text
- Pre-paginate to ~400-500 char pages at word boundaries
- SCROLL events navigate pages

## Simulator Testing

### Screenshot flow (justfile)
```bash
just screenshots
```
Launches vite + simulator, finds "Glasses Display" window via niri, crops screenshots, saves to `docs/dc-*.png`.

### Manual flow
```bash
# Start vite
nix shell nixpkgs#nodejs_22 -c node_modules/.bin/vite --host 0.0.0.0 --port 5173 --strictPort &
# Start simulator (needs FHS for graphics libs)
FHS=$(ls -t /nix/store/*deltaclaw-fhs/bin/deltaclaw-fhs 2>/dev/null | head -1)
DELTACLAW_CWD="$PWD" $FHS -c "node node_modules/@evenrealities/evenhub-simulator/bin/index.js http://localhost:5173" &
```

### Simulator keys
```bash
nix shell nixpkgs#wtype -c wtype -k Return           # tap
nix shell nixpkgs#wtype -c wtype -k Down              # scroll down
nix shell nixpkgs#wtype -c wtype -k Return -k Return  # double-tap (back)
```

### Cleanup
```bash
pkill -f evenhub-simulator; fuser -k 5173/tcp 2>/dev/null
```

**IMPORTANT: Simulator does NOT match real hardware for images.** Simulator renders images differently (direct display vs host greyscale conversion). Always verify on real glasses.

## NixOS Environment

- No `node`/`npm` in PATH outside nix shell
- Use: `DELTACLAW_NO_FHS=1 DELTACLAW_CWD="$PWD" nix develop -c deltaclaw-fhs -c "command"`
- FHS wrapper auto-installs deps if `node_modules` is stale
- Build: append `"npx vite build"` to the above
