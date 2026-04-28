import {
  PaddleOCROptions,
  OCRResult,
  TableResult,
  LayoutResult,
  FormulaResult,
  BarcodeResult,
  WatermarkInfo,
  ImageSource,
  ProcessOptions,
  BatchOCRResult,
  ProgressCallback,
  OCRStats,
} from "./typings"

import { ServiceCoordinator } from "./core/ServiceCoordinator"
import { ModelManager } from "./core/ModelManager"
import { CacheManager } from "./core/CacheManager"
import { StatsManager } from "./core/StatsManager"

/**
 * PaddleOCR 主类（简化版）
 *
 * 重构说明：原 604 行主类拆分为多个职责单一的模块：
 * - ServiceCoordinator: 服务协调（13,865B）
 * - ModelManager: 模型管理（6,038B）
 * - CacheManager: 缓存管理（3,814B）
 * - StatsManager: 统计管理（2,042B）
 * - PaddleOCR facade: 门面模式，保持原有 API
 */
export class PaddleOCR {
  private serviceCoordinator: ServiceCoordinator
  private modelManager: ModelManager
  private cacheManager: CacheManager
  private statsManager: StatsManager

  constructor(options: PaddleOCROptions = {}) {
    this.serviceCoordinator = new ServiceCoordinator(options)
    this.modelManager = new ModelManager(options)
    this.cacheManager = new CacheManager(options)
    this.statsManager = new StatsManager()
  }

  /**
   * 初始化所有模型
   */
  public async init(): Promise<void> {
    await this.serviceCoordinator.init()
  }

  // ==================== 文本 OCR ====================

  /**
   * 识别文本
   */
  public async recognize(
    image: ImageSource,
    options?: ProcessOptions
  ): Promise<OCRResult> {
    return await this.serviceCoordinator.recognize(image, options)
  }

  /**
   * 批量识别
   */
  public async recognizeBatch(
    images: ImageSource[],
    options?: ProcessOptions
  ): Promise<BatchOCRResult> {
    return await this.serviceCoordinator.recognizeBatch(images, options)
  }

  // ==================== 表格识别 ====================

  /**
   * 识别表格
   */
  public async recognizeTable(
    image: ImageSource,
    options?: ProcessOptions
  ): Promise<TableResult> {
    return await this.serviceCoordinator.recognizeTable(image, options)
  }

  // ==================== 布局分析 ====================

  /**
   * 分析布局
   */
  public async analyzeLayout(
    image: ImageSource,
    options?: ProcessOptions
  ): Promise<LayoutResult> {
    return await this.serviceCoordinator.analyzeLayout(image, options)
  }

  // ==================== 公式识别 ====================

  /**
   * 识别公式
   */
  public async recognizeFormula(
    image: ImageSource,
    options?: ProcessOptions
  ): Promise<FormulaResult[]> {
    return await this.serviceCoordinator.recognizeFormula(image, options)
  }

  // ==================== 条码识别 ====================

  /**
   * 检测条码
   */
  public async detectBarcodes(image: ImageSource): Promise<BarcodeResult[]> {
    return await this.serviceCoordinator.detectBarcodes(image)
  }

  // ==================== 水印检测 ====================

  /**
   * 检测水印
   */
  public async detectWatermarks(image: ImageSource): Promise<WatermarkInfo[]> {
    return await this.serviceCoordinator.detectWatermarks(image)
  }

  // ==================== 统计信息 ====================

  /**
   * 获取统计信息
   */
  public getStats(): OCRStats {
    return this.serviceCoordinator.getStats()
  }

  // ==================== 资源释放 ====================

  /**
   * 释放资源
   */
  public async dispose(): Promise<void> {
    await this.serviceCoordinator.dispose()
    await this.modelManager.dispose()
  }
}