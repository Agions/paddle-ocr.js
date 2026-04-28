import { ImageCache, ResultCache } from "../utils/cache"

/**
 * 缓存管理器接口
 */
export interface CacheManagerInterface {
  getImageCache(): ImageCache | null
  getResultCache(): ResultCache | null
  hasImageCache(): boolean
  hasResultCache(): boolean
  clearAllCaches(): void
  getCacheStats(): {
    imageHits: number
    imageMisses: number
    resultHits: number
    resultMisses: number
  }
}

/**
 * 缓存管理器
 * 负责图像和结果缓存的统一管理
 */
export class CacheManager implements CacheManagerInterface {
  private options: any // PaddleOCROptions 类型简化

  // 缓存实例
  private imageCache: ImageCache | null = null
  private resultCache: ResultCache | null = null

  constructor(options: any) {
    this.options = options

    // 初始化缓存
    if (this.options.enableCache) {
      this.imageCache = new ImageCache({
        maxSize: this.options.cacheSize,
      })
      this.resultCache = new ResultCache()
    }
  }

  /**
   * 获取图像缓存
   */
  public getImageCache(): ImageCache | null {
    return this.imageCache
  }

  /**
   * 获取结果缓存
   */
  public getResultCache(): ResultCache | null {
    return this.resultCache
  }

  /**
   * 检查是否启用了图像缓存
   */
  public hasImageCache(): boolean {
    return this.options.enableCache && !!this.imageCache
  }

  /**
   * 检查是否启用了结果缓存
   */
  public hasResultCache(): boolean {
    return this.options.enableCache && !!this.resultCache
  }

  public generateResultCacheKey(
    imageData: Uint8Array,
    options: {
      mode?: string
      threshold?: number
      language?: string
    }
  ): string | null {
    if (!this.hasResultCache()) {
      return null
    }

    // ResultCache.generateKey 接受 string | Uint8Array，所以直接传递 imageData
    return ResultCache.generateKey(imageData.toString(), {
      mode: options.mode || "text",
      threshold: options.threshold || 0.3,
      language:
        typeof options.language === "string"
          ? options.language
          : "ch",
    })
  }

  /**
   * 从结果缓存中获取数据
   */
  public getFromResultCache(key: string): any {
    if (!this.hasResultCache()) {
      return undefined
    }
    return this.resultCache!.get(key)
  }

  /**
   * 将数据存入结果缓存
   */
  public setToResultCache(key: string, data: any): void {
    if (!this.hasResultCache()) {
      return
    }
    this.resultCache!.set(key, data)
  }

  /**
   * 生成图像缓存键
   */
  public generateImageCacheKey(
    source: string,
    dimensions: { width: number; height: number }
  ): string {
    if (!this.hasImageCache()) {
      return ""
    }
    return ImageCache.generateKey(source, dimensions)
  }

  /**
   * 从图像缓存中获取数据
   */
  public getFromImageCache(key: string): any {
    if (!this.hasImageCache()) {
      return undefined
    }
    return this.imageCache!.get(key)
  }

  /**
   * 将数据存入图像缓存
   */
  public setToImageCache(key: string, data: any): void {
    if (!this.hasImageCache()) {
      return
    }
    this.imageCache!.set(key, data)
  }

  /**
   * 清除所有缓存
   */
  public clearAllCaches(): void {
    this.imageCache?.clear()
    this.resultCache?.clear()
  }

  /**
   * 获取缓存统计信息
   */
  public getCacheStats(): {
    imageHits: number
    imageMisses: number
    resultHits: number
    resultMisses: number
  } {
    const imageStats = this.imageCache?.getStats() || {
      totalHits: 0,
    }

    const resultStats = this.resultCache?.getStats() || {
      totalHits: 0,
    }

    return {
      imageHits: imageStats.totalHits,
      imageMisses: 0, // ImageCache 没有 misses 属性
      resultHits: resultStats.totalHits,
      resultMisses: 0, // ResultCache 也没有 misses
    }
  }
}