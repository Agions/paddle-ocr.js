/**
 * 模型缓存模块
 * 提供模型和结果的缓存功能
 */

import { OCRImageData as ImageData } from "./image"

export interface CacheOptions {
  /** 缓存大小限制 (MB) */
  maxSize?: number
  /** 缓存条目数量限制 */
  maxCount?: number
  /** 缓存过期时间 (ms) */
  ttl?: number
  /** 是否启用结果缓存 */
  enableResultCache?: boolean
  /** 是否启用模型缓存 */
  enableModelCache?: boolean
}

interface CacheEntry<T> {
  key: string
  value: T
  timestamp: number
  size: number
  hits: number
}

/**
 * LRU 缓存实现
 */
export class ModelCache<T = any> {
  private cache: Map<string, CacheEntry<T>> = new Map()
  private options: Required<CacheOptions>
  private currentSize = 0

  constructor(options: CacheOptions = {}) {
    this.options = {
      maxSize: options.maxSize || 100, // 100MB
      maxCount: options.maxCount || 50,
      ttl: options.ttl || 1000 * 60 * 30, // 30分钟
      enableResultCache: options.enableResultCache !== false,
      enableModelCache: options.enableModelCache !== false,
    }
  }

  /**
   * 设置缓存
   */
  public set(key: string, value: T, size?: number): void {
    const entrySize = size || this.estimateSize(value)

    // 检查是否需要清理
    while (
      this.currentSize + entrySize > this.options.maxSize ||
      this.cache.size >= this.options.maxCount
    ) {
      this.evict()
    }

    const entry: CacheEntry<T> = {
      key,
      value,
      timestamp: Date.now(),
      size: entrySize,
      hits: 0,
    }

    this.cache.set(key, entry)
    this.currentSize += entrySize
  }

  /**
   * 获取缓存
   */
  public get(key: string): T | undefined {
    const entry = this.cache.get(key)

    if (!entry) {
      return undefined
    }

    // 检查是否过期
    if (Date.now() - entry.timestamp > this.options.ttl) {
      this.cache.delete(key)
      this.currentSize -= entry.size
      return undefined
    }

    // 更新访问统计
    entry.hits++
    // 将访问的条目移到末尾 (LRU)
    this.cache.delete(key)
    this.cache.set(key, entry)

    return entry.value
  }

  /**
   * 检查缓存是否存在
   */
  public has(key: string): boolean {
    return this.get(key) !== undefined
  }

  /**
   * 删除缓存
   */
  public delete(key: string): boolean {
    const entry = this.cache.get(key)
    if (entry) {
      this.cache.delete(key)
      this.currentSize -= entry.size
      return true
    }
    return false
  }

  /**
   * 清空缓存
   */
  public clear(): void {
    this.cache.clear()
    this.currentSize = 0
  }

  /**
   * 获取缓存统计
   */
  public getStats(): {
    size: number
    count: number
    hitRate: number
    totalHits: number
  } {
    let totalHits = 0
    for (const entry of this.cache.values()) {
      totalHits += entry.hits
    }

    const hitCount = Array.from(this.cache.values()).filter(
      (e) => e.hits > 0
    ).length

    return {
      size: this.currentSize,
      count: this.cache.size,
      hitRate: this.cache.size > 0 ? hitCount / this.cache.size : 0,
      totalHits,
    }
  }

  /**
   * 估计数据大小
   */
  private estimateSize(value: T): number {
    try {
      return JSON.stringify(value).length * 2 // 字符转字节 (粗略估计)
    } catch {
      return 1024 // 默认 1KB
    }
  }

  /**
   * 淘汰最少使用的条目
   */
  private evict(): void {
    // 找到最老的条目
    let oldestKey: string | null = null
    let oldestTime = Date.now()

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp
        oldestKey = key
      }
    }

    if (oldestKey) {
      const entry = this.cache.get(oldestKey)
      if (entry) {
        this.currentSize -= entry.size
      }
      this.cache.delete(oldestKey)
    }
  }
}

/**
 * 图像缓存
 */
export class ImageCache {
  private cache: ModelCache<ImageData>

  constructor(options?: CacheOptions) {
    this.cache = new ModelCache<ImageData>({
      ...options,
      maxSize: options?.maxSize || 50, // 图像缓存默认 50MB
    })
  }

  /**
   * 缓存图像
   */
  public set(key: string, imageData: ImageData): void {
    const size = imageData.data.byteLength
    this.cache.set(key, imageData, size)
  }

  /**
   * 获取缓存的图像
   */
  public get(key: string): ImageData | undefined {
    return this.cache.get(key)
  }

  /**
   * 检查缓存
   */
  public has(key: string): boolean {
    return this.cache.has(key)
  }

  /**
   * 生成图像缓存键
   */
  public static generateKey(
    source: string | Uint8Array,
    options?: {
      width?: number
      height?: number
      threshold?: number
    }
  ): string {
    const hash = this.hashString(
      typeof source === "string" ? source : this.arrayToString(source)
    )
    return `img_${hash}_${options?.width || 0}x${options?.height || 0}`
  }

  /**
   * 简单哈希函数
   */
  private static hashString(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash
    }
    return Math.abs(hash).toString(36)
  }

  /**
   * 数组转字符串
   */
  private static arrayToString(arr: Uint8Array): string {
    return Array.from(arr)
      .slice(0, 1000)
      .join(",")
  }

  /**
   * 清空缓存
   */
  public clear(): void {
    this.cache.clear()
  }

  /**
   * 获取统计信息
   */
  public getStats() {
    return this.cache.getStats()
  }
}

/**
 * 结果缓存
 */
export class ResultCache {
  private cache: ModelCache

  constructor(options?: CacheOptions) {
    this.cache = new ModelCache({
      ...options,
      maxSize: options?.maxSize || 20, // 结果缓存默认 20MB
    })
  }

  /**
   * 生成结果缓存键
   */
  public static generateKey(
    imageHash: string,
    options?: {
      mode?: string
      threshold?: number
      language?: string
    }
  ): string {
    const optionsHash = JSON.stringify(options || {})
    return `result_${imageHash}_${this.hashString(optionsHash)}`
  }

  private static hashString(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash
    }
    return Math.abs(hash).toString(36)
  }

  /**
   * 缓存结果
   */
  public set(key: string, result: any): void {
    this.cache.set(key, result)
  }

  /**
   * 获取缓存结果
   */
  public get(key: string): any {
    return this.cache.get(key)
  }

  /**
   * 检查缓存
   */
  public has(key: string): boolean {
    return this.cache.has(key)
  }

  /**
   * 清空缓存
   */
  public clear(): void {
    this.cache.clear()
  }

  /**
   * 获取统计信息
   */
  public getStats() {
    return this.cache.getStats()
  }
}

/**
 * 创建模型缓存
 */
export function createModelCache<T>(options?: CacheOptions): ModelCache<T> {
  return new ModelCache<T>(options)
}

/**
 * 创建图像缓存
 */
export function createImageCache(options?: CacheOptions): ImageCache {
  return new ImageCache(options)
}

/**
 * 创建结果缓存
 */
export function createResultCache(options?: CacheOptions): ResultCache {
  return new ResultCache(options)
}

export default {
  ModelCache,
  ImageCache,
  ResultCache,
  createModelCache,
  createImageCache,
  createResultCache,
}
