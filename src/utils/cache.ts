/**
 * 通用 LRU + TTL 缓存（图像/结果/模型共用基础实现）
 */

import type { OcrImageData, OcrResult } from "../typings"

export interface CacheOptions {
  maxSize?: number
  maxCount?: number
  ttl?: number
}

interface Entry<V> { value: V; size: number; hits: number; ts: number }

export class LruCache<V> {
  private store = new Map<string, Entry<V>>()
  private bytes = 0
  private readonly maxBytes: number
  private readonly maxEntries: number
  private readonly ttl: number

  constructor(opts: CacheOptions = {}) {
    this.maxBytes = opts.maxSize ?? 50 * 1024 * 1024
    this.maxEntries = opts.maxCount ?? 100
    this.ttl = opts.ttl ?? 30 * 60 * 1000
  }

  get(key: string): V | undefined {
    const e = this.store.get(key)
    if (!e) return undefined
    if (Date.now() - e.ts > this.ttl) { this.delete(key); return undefined }
    e.hits++
    this.store.delete(key)
    this.store.set(key, e)
    return e.value
  }

  set(key: string, value: V, size?: number): void {
    const sz = size ?? estimateSize(value)
    if (this.store.has(key)) this.bytes -= this.store.get(key)!.size
    while (this.bytes + sz > this.maxBytes || this.store.size >= this.maxEntries) {
      const oldestKey = this.store.keys().next().value
      if (!oldestKey) break
      this.delete(oldestKey)
    }
    this.store.set(key, { value, size: sz, hits: 0, ts: Date.now() })
    this.bytes += sz
  }

  has(key: string): boolean { return this.get(key) !== undefined }

  delete(key: string): boolean {
    const e = this.store.get(key)
    if (!e) return false
    this.bytes -= e.size
    this.store.delete(key)
    return true
  }

  clear(): void { this.store.clear(); this.bytes = 0 }

  getStats(): { size: number; count: number; hitRate: number; totalHits: number } {
    let total = 0, hit = 0
    this.store.forEach((e) => { total += e.hits; if (e.hits > 0) hit++ })
    return {
      size: this.bytes,
      count: this.store.size,
      hitRate: this.store.size ? hit / this.store.size : 0,
      totalHits: total,
    }
  }
}

function estimateSize(value: unknown): number {
  try { return JSON.stringify(value).length * 2 } catch { return 1024 }
}

/** 图像缓存（按 byteLength 计费） */
export class ImageCache {
  private cache: LruCache<OcrImageData>
  constructor(opts?: CacheOptions) {
    this.cache = new LruCache<OcrImageData>({ maxSize: (opts?.maxSize ?? 50) * 1024 * 1024, maxCount: opts?.maxCount, ttl: opts?.ttl })
  }
  get(key: string): OcrImageData | undefined { return this.cache.get(key) }
  set(key: string, data: OcrImageData): void { this.cache.set(key, data, data.data.byteLength) }
  has(key: string) { return this.cache.has(key) }
  clear() { this.cache.clear() }
}

/** 结果缓存 */
export class ResultCache {
  private cache: LruCache<OcrResult>
  constructor(opts?: CacheOptions) {
    this.cache = new LruCache<OcrResult>({ maxSize: (opts?.maxSize ?? 20) * 1024 * 1024, maxCount: opts?.maxCount, ttl: opts?.ttl })
  }
  get(key: string) { return this.cache.get(key) }
  set(key: string, result: OcrResult) { this.cache.set(key, result) }
  has(key: string) { return this.cache.has(key) }
  clear() { this.cache.clear() }
  static key(imageHash: string, options: Record<string, unknown>): string {
    return `r_${imageHash}_${Object.entries(options).map(([k, v]) => `${k}=${v}`).join("&")}`
  }
}
