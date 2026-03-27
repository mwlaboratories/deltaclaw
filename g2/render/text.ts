import { W, MAX_CHARS, MAX_LINES, TEXT_AREA_PX, SPACE_PX } from '../state/constants'

// G2 font character widths (from even-bridge calibration)
const CHAR_W: Record<string, number> = {}
for (const c of "jliI!|.:;',`/") CHAR_W[c] = 1
for (const c of "()[]{}") CHAR_W[c] = 1.3
for (const c of "abcdefghknopqrstuvxyz") CHAR_W[c] = 1.75
for (const c of "0123456789$") CHAR_W[c] = 1.8
for (const c of "ABCDEFGHJKLNOPQRSTUVXYZmMwW") CHAR_W[c] = 2.5

export function textWidth(text: string): number {
  let w = 0
  for (const c of text) w += (CHAR_W[c] ?? 1.75) * SPACE_PX
  return w
}

export function centerText(text: string): string {
  const tw = textWidth(text)
  const spaces = Math.max(0, Math.floor((W - tw) / 2 / SPACE_PX))
  return ' '.repeat(spaces) + text
}

// Estimate how many visual lines a logical line occupies after word-wrap
export function visualLineCount(line: string): number {
  if (!line) return 1
  return Math.max(1, Math.ceil(textWidth(line) / TEXT_AREA_PX))
}

export function paginate(text: string, maxChars = MAX_CHARS, maxLines = MAX_LINES): string[] {
  const lines = text.split('\n')
  // Build pages back-to-front so the last page (newest messages) is always full
  const pages: string[] = []
  let page = ''
  let lineCount = 0

  for (let i = lines.length - 1; i >= 0; i--) {
    // Skip blank separator lines at page boundaries
    if (!lines[i] && !page) continue
    const vlines = visualLineCount(lines[i])
    const next = page ? lines[i] + '\n' + page : lines[i]
    if (next.length > maxChars || lineCount + vlines > maxLines) {
      if (page) pages.push(page)
      // Don't start a new page with a blank separator line
      if (!lines[i]) { page = ''; lineCount = 0 }
      else { page = lines[i]; lineCount = vlines }
    } else {
      page = next
      lineCount += vlines
    }
  }
  if (page) pages.push(page)
  pages.reverse()
  return pages.length ? pages.map((p) => p.trim()) : ['']
}
