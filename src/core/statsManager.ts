/**
 * OCR 统计信息
 */

export interface OcrStats {
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  averageDuration: number
  cacheHits: number
  cacheMisses: number
}

export class StatsManager {
  private totalDuration = 0

  stats: OcrStats = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageDuration: 0,
    cacheHits: 0,
    cacheMisses: 0,
  }

  incrementTotalRequests(): void { this.stats.totalRequests++ }
  incrementSuccessfulRequests(): void { this.stats.successfulRequests++ }
  incrementFailedRequests(): void { this.stats.failedRequests++ }

  updateAverageDuration(durationMs: number): void {
    this.totalDuration += durationMs
    this.stats.averageDuration =
      this.stats.successfulRequests === 0
        ? 0
        : this.totalDuration / this.stats.successfulRequests
  }

  getStats(): OcrStats { return { ...this.stats } }

  reset(): void {
    this.totalDuration = 0
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageDuration: 0,
      cacheHits: 0,
      cacheMisses: 0,
    }
  }
}
