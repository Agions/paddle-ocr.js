/**
 * 通用图像处理工具
 */

import { ImageSource, OcrImageData, Point } from "../typings"
import { arrayFingerprint, hashKey } from "./image"

export class ImageProcessor {
  /** 预处理：转 Float32 + 可选 /255 归一化 */
  static preprocess(image: OcrImageData, normalize = true): { data: Float32Array; width: number; height: number } {
    const raw = image.data instanceof Uint8ClampedArray
      ? new Uint8Array(image.data.buffer)
      : image.data
    const out = new Float32Array(raw.length)
    const k = normalize ? 1 / 255 : 1
    for (let i = 0; i < raw.length; i++) out[i] = raw[i] * k
    return { data: out, width: image.width, height: image.height }
  }

  /** 多边形裁剪 → RGBA 图像 */
  static cropRegion(image: OcrImageData, points: Point[]): OcrImageData {
    if (points.length < 3) throw new Error("cropRegion: need >= 3 points")
    const box = ImageProcessor.boundingBox(points)
    const x0 = Math.max(0, Math.floor(box.minX))
    const y0 = Math.max(0, Math.floor(box.minY))
    const x1 = Math.min(image.width - 1, Math.ceil(box.maxX))
    const y1 = Math.min(image.height - 1, Math.ceil(box.maxY))
    const w = x1 - x0 + 1
    const h = y1 - y0 + 1
    if (w <= 0 || h <= 0) throw new Error("cropRegion: invalid area")
    const out = new Uint8Array(w * h * 4)
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const si = ((y0 + y) * image.width + (x0 + x)) * 4
        const di = (y * w + x) * 4
        out[di] = image.data[si]
        out[di + 1] = image.data[si + 1]
        out[di + 2] = image.data[si + 2]
        out[di + 3] = image.data[si + 3]
      }
    }
    return { width: w, height: h, data: out }
  }

  /** 多边形边界盒 */
  static boundingBox(points: Point[]): { minX: number; minY: number; maxX: number; maxY: number } {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const p of points) {
      if (p.x < minX) minX = p.x
      if (p.y < minY) minY = p.y
      if (p.x > maxX) maxX = p.x
      if (p.y > maxY) maxY = p.y
    }
    return { minX, minY, maxX, maxY }
  }

  /** 稳定缓存键 */
  static cacheKey(source: ImageSource | string | Uint8Array, opts?: { width?: number; height?: number; mode?: string }): string {
    let s: string
    if (typeof source === "string") s = source
    else if (source instanceof Uint8Array) s = arrayFingerprint(source)
    else if (source instanceof ArrayBuffer) s = arrayFingerprint(new Uint8Array(source))
    else if (typeof Buffer !== "undefined" && Buffer.isBuffer(source)) s = (source as Buffer).toString("base64")
    else if (source && typeof source === "object" && "data" in source) s = arrayFingerprint(source.data as Uint8Array)
    else s = String(source)
    return `img_${hashKey(s)}_${opts?.width ?? 0}x${opts?.height ?? 0}_${opts?.mode ?? "default"}`
  }
}
