import {
  TextContainerProperty,
  ListContainerProperty,
  ListItemContainerProperty,
  ImageContainerProperty,
} from '@evenrealities/even_hub_sdk'
import type { State } from '../state/contracts'
import { W, H, LIST_W, PREVIEW_X, PREVIEW_W, DIVIDER } from '../state/constants'
import { LOGO_W, LOGO_H } from '../logo-data'
import { buildChannelList, buildPreview, buildMessageContent } from './format'

export type PageConfig = {
  totalNum: number
  textObjects: TextContainerProperty[]
  listObjects?: ListContainerProperty[]
  imageObjects?: ImageContainerProperty[]
}

export function textContainer(
  id: number, name: string, content: string,
  opts: { x?: number; y?: number; w?: number; h?: number; capture?: boolean; padding?: number } = {},
): TextContainerProperty {
  return new TextContainerProperty({
    containerID: id,
    containerName: name,
    content,
    xPosition: opts.x ?? 0,
    yPosition: opts.y ?? 0,
    width: opts.w ?? W,
    height: opts.h ?? H,
    isEventCapture: opts.capture ? 1 : 0,
    paddingLength: opts.padding ?? 4,
  })
}

export function listContainer(
  id: number, name: string, items: string[],
  opts: { x?: number; y?: number; w?: number; h?: number } = {},
): ListContainerProperty {
  return new ListContainerProperty({
    containerID: id,
    containerName: name,
    xPosition: opts.x ?? 0,
    yPosition: opts.y ?? 0,
    width: opts.w ?? W,
    height: opts.h ?? H,
    isEventCapture: 1,
    paddingLength: 5,
    itemContainer: new ListItemContainerProperty({
      itemCount: items.length,
      itemWidth: 560,
      isItemSelectBorderEn: 1,
      itemName: items,
    }),
  })
}

export function composeWelcomePage(): PageConfig {
  const logoX = Math.floor((W - LOGO_W) / 2)
  const logoY = Math.floor((H - LOGO_H) / 2)

  return {
    totalNum: 2,
    textObjects: [
      textContainer(1, 'evt', ' ', { capture: true, padding: 0 }),
    ],
    imageObjects: [
      new ImageContainerProperty({
        containerID: 2,
        containerName: 'logo',
        xPosition: logoX,
        yPosition: logoY,
        width: LOGO_W,
        height: LOGO_H,
      }),
    ],
  }
}

export function composeChannelListPage(state: State): PageConfig {
  return {
    totalNum: 3,
    textObjects: [
      textContainer(1, 'evt', ' ', { capture: true }),
      textContainer(2, 'channels', buildChannelList(state), { w: LIST_W }),
      textContainer(3, 'preview', buildPreview(state), { x: PREVIEW_X, w: PREVIEW_W }),
    ],
  }
}

export function composeMessagesPage(state: State): PageConfig {
  return {
    totalNum: 2,
    textObjects: [
      textContainer(1, 'evt', ' ', { capture: true }),
      textContainer(2, 'display', buildMessageContent(state.messageTitle, state.messagePages, state.messagePage), { padding: 4 }),
    ],
  }
}

export function composeSttPage(state: State): PageConfig {
  const content = `Recording...\n${DIVIDER}\n${state.transcript || '(listening)'}\n\n\n\n\n\n\ntap to send | doubletap to cancel`

  return {
    totalNum: 2,
    textObjects: [
      textContainer(1, 'evt', ' ', { capture: true }),
      textContainer(2, 'display', content, { padding: 4 }),
    ],
  }
}
