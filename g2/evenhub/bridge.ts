import {
  waitForEvenAppBridge,
  CreateStartUpPageContainer,
  RebuildPageContainer,
  TextContainerUpgrade,
  ImageRawDataUpdate,
  type EvenAppBridge,
  type EvenHubEvent,
} from '@evenrealities/even_hub_sdk'
import type { PageConfig } from '../render/composer'

let bridge: EvenAppBridge | null = null

export function getBridge(): EvenAppBridge | null {
  return bridge
}

export async function initBridge(timeoutMs = 6000): Promise<EvenAppBridge> {
  const b = await withTimeout(waitForEvenAppBridge(), timeoutMs)
  bridge = b
  return b
}

export async function renderPage(config: PageConfig, startupRendered: boolean): Promise<boolean> {
  if (!bridge) return startupRendered

  if (!startupRendered) {
    await bridge.createStartUpPageContainer(
      new CreateStartUpPageContainer({
        containerTotalNum: config.totalNum,
        textObject: config.textObjects,
        listObject: config.listObjects ?? [],
        imageObject: config.imageObjects ?? [],
      }),
    )
    return true // now startupRendered
  } else {
    await bridge.rebuildPageContainer(
      new RebuildPageContainer({
        containerTotalNum: config.totalNum,
        textObject: config.textObjects,
        listObject: config.listObjects ?? [],
        imageObject: config.imageObjects ?? [],
      }),
    )
    return true
  }
}

export async function updateText(id: number, name: string, content: string): Promise<void> {
  if (!bridge) return
  await bridge.textContainerUpgrade(
    new TextContainerUpgrade({ containerID: id, containerName: name, content }),
  )
}

export async function updateImage(id: number, name: string, data: number[] | string): Promise<void> {
  if (!bridge) return
  await bridge.updateImageRawData(new ImageRawDataUpdate({
    containerID: id,
    containerName: name,
    imageData: data,
  }))
}

export async function setAudioCapture(on: boolean): Promise<void> {
  if (!bridge) return
  await bridge.audioControl(on)
}

export function onEvent(handler: (event: EvenHubEvent) => void): void {
  if (!bridge) return
  bridge.onEvenHubEvent(handler)
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
    promise
      .then(resolve)
      .catch(reject)
      .finally(() => window.clearTimeout(timer))
  })
}
