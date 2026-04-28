/**
 * OCR 统计信息接口
 */
export interface OCRStats {
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  averageDuration: number
  cacheHits: number
  cacheMisses: number
}

/**
 * 统计管理器接口
 */
export interface StatsManagerInterface {
  incrementTotalRequests(): void
  incrementSuccessfulRequests(): void
  incrementFailedRequests(): void
  updateAverageDuration(duration: number): void
  getStats(): OCRStats
  resetStats(): void
}

/**
 * 统计管理器
 * 负责收集和管理 OCR 操作的统计数据
 */
export class StatsManager implements StatsManagerInterface {
  private stats: OCRStats = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageDuration: 0,
    cacheHits: 0,
    cacheMisses: 0,
  }
  private totalDuration = 0

  /**
   * 增加总请求计数
   */
  public incrementTotalRequests(): void {
    this.stats.totalRequests++
  }

  /**
   * 增加成功请求计数
   */
  public incrementSuccessfulRequests(): void {
    this.stats.successfulRequests++
  }

  /**
   * 增加失败请求计数
   */
  public incrementFailedRequests(): void {
    this.stats.failedRequests++
  }

  /**
   * 更新平均处理时间
   */
  public updateAverageDuration(duration: number): void {
    this.totalDuration += duration
    this.stats.averageDuration =
      this.totalDuration / this.stats.successfulRequests
  }

  /**
   * 获取当前统计信息
   */
  public getStats(): OCRStats {
    return { ...this.stats }
  }

  /**
   * 重置所有统计信息
   */
  public resetStats(): void {
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageDuration: 0,
      cacheHits: 0,
      cacheMisses: 0,
    }
    this.totalDuration = 0
  }

  /**
   * 从外部缓存统计更新（结果缓存）
   */
  public updateFromResultCacheStats(cacheHits: number): void {
    this.stats.cacheHits = cacheHits
    this.stats.cacheMisses =
      this.stats.totalRequests - cacheHits
  }
}