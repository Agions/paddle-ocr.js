/**
 * 图像加载与共享工具（hashKey/arrayFingerprint）
 */

import { ImageSource, OcrImageData } from "../typings"
import { isNode, isBrowser } from "./env"

/** 加载图像为 RGBA 数据 */
export async function loadImage(source: ImageSource): Promise<OcrImageData> {
  if (isNode()) return loadImageNode(source)
  if (isBrowser()) return loadImageBrowser(source)
  throw new Error("Unsupported runtime")
}

async function loadImageNode(source: ImageSource): Promise<OcrImageData> {
  const { createCanvas, loadImage: nodeLoadImage } = require("canvas") // eslint-disable-line @typescript-eslint/no-var-requires
  if (typeof source !== "string" && !(source instanceof Uint8Array) && !Buffer.isBuffer(source)) {
    throw new Error("Unsupported ImageSource in Node")
  }
  const img = await nodeLoadImage(source as string | Uint8Array | Buffer)
  const canvas = createCanvas(img.width, img.height)
  const ctx = canvas.getContext("2d")
  ctx.drawImage(img, 0, 0)
  const data = ctx.getImageData(0, 0, img.width, img.height).data
  return { width: img.width, height: img.height, data, channels: 4 }
}

async function loadImageBrowser(source: ImageSource): Promise<OcrImageData> {
  if (typeof HTMLImageElement !== "undefined" && source instanceof HTMLImageElement) {
    if (!source.complete) await new Promise<void>((resolve, reject) => {
      source.onload = () => resolve()
      source.onerror = () => reject(new Error("Image load failed"))
    })
    return toImageData(source, source.naturalWidth, source.naturalHeight)
  }
  if (typeof HTMLCanvasElement !== "undefined" && source instanceof HTMLCanvasElement) {
    return toImageData(source, source.width, source.height)
  }
  if (source && typeof source === "object" && "data" in source && "width" in source) {
    const p = source as OcrImageData
    return { width: p.width, height: p.height, data: p.data, channels: 4 }
  }
  if (typeof source === "string") {
    const img = new Image()
    img.crossOrigin = "anonymous"
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error("Image load failed"))
      img.src = source
    })
    return loadImageBrowser(img)
  }
  throw new Error("Unsupported ImageSource in browser")
}

function toImageData(src: HTMLImageElement | HTMLCanvasElement, w: number, h: number): OcrImageData {
  const canvas = document.createElement("canvas")
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Cannot create 2D context")
  ctx.drawImage(src, 0, 0)
  const data = ctx.getImageData(0, 0, w, h).data
  return { width: w, height: h, data, channels: 4 }
}

/** 32-bit 字符串哈希（缓存键） */
export function hashKey(s: string): string {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h).toString(36)
}

/** 数组指纹（前 1000 字节的字符串表示） */
export function arrayFingerprint(arr: Uint8Array): string {
  const len = Math.min(arr.length, 1000)
  let s = ""
  for (let i = 0; i < len; i++) s += arr[i] + ","
  return s
}
