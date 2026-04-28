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
  OCRError,
  ErrorCode,
} from "../typings"

import { OCRImageData, loadImage } from "../utils/image"
import { TextDetector } from "../modules/textDetector"
import { TextRecognizer } from "../modules/textRecognizer"
import { TableRecognizer } from "../modules/tableRecognizer"
import { LayoutAnalyzer } from "../modules/layoutAnalyzer"
import { FormulaRecognizer } from "../modules/formulaRecognizer"
import { BarcodeRecognizer } from "../modules/barcodeRecognizer"
import { ImageCache, ResultCache } from "../utils/cache"
import { isNode, isBrowser } from "../utils/env"
import { ImageProcessor } from "../utils/imageProcessor"

/**
 * 服务协调器接口
 */
export interface ServiceCoordinatorInterface {
  init(): Promise<void>
  recognize(image: ImageSource, options?: ProcessOptions): Promise<OCRResult>
  recognizeBatch(
    images: ImageSource[],
    options?: ProcessOptions
  ): Promise<BatchOCRResult>
  recognizeTable(image: ImageSource, options?: ProcessOptions): Promise<TableResult>
  analyzeLayout(
    image: ImageSource,
    options?: ProcessOptions
  ): Promise<LayoutResult>
  recognizeFormula(
    image: ImageSource,
    options?: ProcessOptions
  ): Promise<FormulaResult[]>
  detectBarcodes(image: ImageSource): Promise<BarcodeResult[]>
  detectWatermarks(image: ImageSource): Promise<WatermarkInfo[]>
  getStats(): OCRStats
  dispose(): Promise<void>
}

/**
 * OCR 服务协调器
 * 负责协调各个识别服务的执行流程
 */
export class ServiceCoordinator implements ServiceCoordinatorInterface {
  // 组件实例
  private detector: TextDetector | null = null
  private recognizer: TextRecognizer | null = null
  private tableRecognizer: TableRecognizer | null = null
  private layoutAnalyzer: LayoutAnalyzer | null = null
  private formulaRecognizer: FormulaRecognizer | null = null
  private barcodeRecognizer: BarcodeRecognizer | null = null

  // 缓存
  private imageCache: ImageCache | null = null
  private resultCache: ResultCache | null = null

  // 状态
  private isInitialized = false
  private options: PaddleOCROptions

  // 统计
  private stats: OCRStats = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageDuration: 0,
    cacheHits: 0,
    cacheMisses: 0,
  }
  private totalDuration = 0

  constructor(options: PaddleOCROptions = {}) {
    this.options = this.mergeOptions(options)

    // 初始化缓存
    if (this.options.enableCache) {
      this.imageCache = new ImageCache({
        maxSize: this.options.cacheSize,
      })
      this.resultCache = new ResultCache()
    }
  }

  /**
   * 合并默认配置
   */
  private mergeOptions(options: PaddleOCROptions): PaddleOCROptions {
    const defaults: PaddleOCROptions = {
      // 基础配置
      modelPath: isBrowser() ? "/models" : "./models",
      useTensorflow: true,
      useONNX: false,
      useWasm: true,

      // 文本检测
      enableDetection: true,
      detectionModel: "DB",

      // 文本识别
      enableRecognition: true,
      recognitionModel: "CRNN",
      language: "ch",

      // 高级功能
      enableTable: false,
      enableLayout: false,
      enableFormula: false,
      enableBarcode: false,
      enableWatermark: false,

      // 性能
      maxSideLen: 960,
      threshold: 0.3,
      batchSize: 1,
      enableGPU: false,
      numThreads: 4,
      useMultiScale: true,
      useAngle_cls: true,

      // 缓存
      enableCache: true,
      cacheSize: 50,
    }

    return { ...defaults, ...options }
  }

  /**
   * 初始化所有模型
   */
  public async init(): Promise<void> {
    if (this.isInitialized) {
      return
    }

    const stages = this.getInitStages()
    let progress = 0
    const totalStages = stages.length

    try {
      for (const stage of stages) {
        this.updateProgress(progress, `初始化 ${stage.name}`)
        await stage.init()
        progress += 100 / totalStages
      }

      this.isInitialized = true
      this.updateProgress(100, "完成")
    } catch (error) {
      throw new OCRError(
        `初始化失败: ${error}`,
        ErrorCode.INIT_FAILED,
        "init",
        error
      )
    }
  }

  /**
   * 获取初始化阶段列表
   */
  private getInitStages(): { name: string; init: () => Promise<void> }[] {
    const stages: { name: string; init: () => Promise<void> }[] = []

    if (this.options.enableDetection) {
      stages.push({
        name: "文本检测模型",
        init: async () => {
          this.detector = new TextDetector(this.options)
          await this.detector.init()
        },
      })
    }

    if (this.options.enableRecognition) {
      stages.push({
        name: "文本识别模型",
        init: async () => {
          this.recognizer = new TextRecognizer(this.options)
          await this.recognizer.init()
        },
      })
    }

    if (this.options.enableTable) {
      stages.push({
        name: "表格识别模型",
        init: async () => {
          this.tableRecognizer = new TableRecognizer(this.options)
          await this.tableRecognizer.init()
        },
      })
    }

    if (this.options.enableLayout) {
      stages.push({
        name: "布局分析模型",
        init: async () => {
          this.layoutAnalyzer = new LayoutAnalyzer(this.options)
          await this.layoutAnalyzer.init()
        },
      })
    }

    if (this.options.enableFormula) {
      stages.push({
        name: "公式识别模型",
        init: async () => {
          this.formulaRecognizer = new FormulaRecognizer(this.options)
          await this.formulaRecognizer.init()
        },
      })
    }

    if (this.options.enableBarcode) {
      stages.push({
        name: "条码识别模型",
        init: async () => {
          this.barcodeRecognizer = new BarcodeRecognizer(this.options)
          await this.barcodeRecognizer.init()
        },
      })
    }

    return stages
  }

  /**
   * 更新进度
   */
  private updateProgress(progress: number, stage: string): void {
    if (this.options.onProgress) {
      this.options.onProgress(progress, stage)
    }
  }

  // ==================== 文本 OCR ====================

  /**
   * 识别文本
   */
  public async recognize(
    image: ImageSource,
    options?: ProcessOptions
  ): Promise<OCRResult> {
    if (!this.isInitialized) {
      await this.init()
    }

    const startTime = Date.now()
    this.stats.totalRequests++

    try {
      // 加载图像
      this.updateProgress(10, "加载图像")
      const imageData = await this.loadImageData(image)

      const imageHash = ImageProcessor.generateCacheKey(
        imageData.data instanceof Uint8ClampedArray
          ? new Uint8Array(imageData.data.buffer)
          : imageData.data
      )
      const cacheKey = this.resultCache
        ? ResultCache.generateKey(imageHash, {
            mode: options?.mode || "text",
            threshold: this.options.threshold,
            language:
              typeof this.options.language === "string"
                ? this.options.language
                : "ch",
          })
        : null

      // 检查结果缓存
      if (cacheKey && this.resultCache) {
        const cached = this.resultCache.get(cacheKey)
        if (cached) {
          this.stats.cacheHits++
          this.stats.successfulRequests++
          return cached as OCRResult
        }
      }
      this.stats.cacheMisses++

      // 文本检测
      let textBoxes: any[] = []
      if (this.options.enableDetection && this.detector) {
        this.updateProgress(30, "文本检测")
        textBoxes = await this.detector.detect(imageData)
      }

      // 文本识别
      let textLines: any[] = []
      if (this.options.enableRecognition && this.recognizer) {
        this.updateProgress(60, "文本识别")
        textLines = await this.recognizer.recognize(imageData, textBoxes)
      }

      const duration = Date.now() - startTime
      this.totalDuration += duration
      this.stats.successfulRequests++
      this.stats.averageDuration =
        this.totalDuration / this.stats.successfulRequests

      const result: OCRResult = {
        textDetection: textBoxes,
        textRecognition: textLines,
        duration: {
          preprocess: duration * 0.1,
          detection: duration * 0.3,
          recognition: duration * 0.5,
          total: duration,
        },
        imageWidth: imageData.width,
        imageHeight: imageData.height,
      }

      // 存入结果缓存
      if (cacheKey && this.resultCache) {
        this.resultCache.set(cacheKey, result)
      }

      return result
    } catch (error) {
      this.stats.failedRequests++
      throw new OCRError(
        `识别失败: ${error}`,
        ErrorCode.RECOGNITION_FAILED,
        "recognize",
        error
      )
    }
  }

  /**
   * 批量识别
   */
  public async recognizeBatch(
    images: ImageSource[],
    options?: ProcessOptions
  ): Promise<BatchOCRResult> {
    const results: OCRResult[] = []
    const startTime = Date.now()

    for (const image of images) {
      const result = await this.recognize(image, options)
      results.push(result)
    }

    const totalDuration = Date.now() - startTime

    return {
      results,
      totalDuration,
      averageDuration: totalDuration / images.length,
    }
  }

  // ==================== 表格识别 ====================

  /**
   * 识别表格
   */
  public async recognizeTable(
    image: ImageSource,
    options?: ProcessOptions
  ): Promise<TableResult> {
    if (!this.isInitialized) {
      await this.init()
    }

    if (!this.tableRecognizer) {
      throw new OCRError(
        "表格识别未启用",
        ErrorCode.NOT_INITIALIZED,
        "recognizeTable"
      )
    }

    const imageData = await this.loadImageData(image)
    return await this.tableRecognizer.recognize(imageData)
  }

  // ==================== 布局分析 ====================

  /**
   * 分析布局
   */
  public async analyzeLayout(
    image: ImageSource,
    options?: ProcessOptions
  ): Promise<LayoutResult> {
    if (!this.isInitialized) {
      await this.init()
    }

    if (!this.layoutAnalyzer) {
      throw new OCRError(
        "布局分析未启用",
        ErrorCode.NOT_INITIALIZED,
        "analyzeLayout"
      )
    }

    const imageData = await this.loadImageData(image)
    return await this.layoutAnalyzer.analyze(imageData)
  }

  // ==================== 公式识别 ====================

  /**
   * 识别公式
   */
  public async recognizeFormula(
    image: ImageSource,
    options?: ProcessOptions
  ): Promise<FormulaResult[]> {
    if (!this.isInitialized) {
      await this.init()
    }

    if (!this.formulaRecognizer) {
      throw new OCRError(
        "公式识别未启用",
        ErrorCode.NOT_INITIALIZED,
        "recognizeFormula"
      )
    }

    const imageData = await this.loadImageData(image)
    return await this.formulaRecognizer.recognize(imageData)
  }

  // ==================== 条码识别 ====================

  /**
   * 检测条码
   */
  public async detectBarcodes(image: ImageSource): Promise<BarcodeResult[]> {
    if (!this.isInitialized) {
      await this.init()
    }

    if (!this.barcodeRecognizer) {
      throw new OCRError(
        "条码识别未启用",
        ErrorCode.NOT_INITIALIZED,
        "detectBarcodes"
      )
    }

    const imageData = await this.loadImageData(image)
    return await this.barcodeRecognizer.detect(imageData)
  }

  // ==================== 水印检测 ====================

  /**
   * 检测水印
   */
  public async detectWatermarks(image: ImageSource): Promise<WatermarkInfo[]> {
    if (!this.isInitialized) {
      await this.init()
    }

    const imageData = await this.loadImageData(image)
    // 水印检测实现
    return []
  }

  // ==================== 工具方法 ====================

  /**
   * 加载图像数据
   */
  private async loadImageData(source: ImageSource): Promise<OCRImageData> {
    // 检查图像缓存
    if (
      this.imageCache &&
      typeof source === "string" &&
      this.resultCache
    ) {
      const cacheKey = ImageCache.generateKey(source, {
        width: this.options.maxSideLen,
        height: this.options.maxSideLen,
      })
      const cached = this.imageCache.get(cacheKey)
      if (cached) {
        return cached
      }
    }

    const imageData = await loadImage(source)

    // 存入图像缓存
    if (this.imageCache && typeof source === "string") {
      const cacheKey = ImageCache.generateKey(source, {
        width: imageData.width,
        height: imageData.height,
      })
      this.imageCache.set(cacheKey, imageData)
    }

    return imageData
  }

  /**
   * 获取统计信息
   */
  public getStats(): OCRStats {
    const resultStats = this.resultCache?.getStats()
    return {
      ...this.stats,
      cacheHits: resultStats?.totalHits || 0,
      cacheMisses:
        this.stats.totalRequests - (resultStats?.totalHits || 0),
    }
  }

  /**
   * 释放资源
   */
  public async dispose(): Promise<void> {
    if (this.detector) {
      await this.detector.dispose()
    }
    if (this.recognizer) {
      await this.recognizer.dispose()
    }
    if (this.tableRecognizer) {
      await this.tableRecognizer.dispose()
    }
    if (this.layoutAnalyzer) {
      await this.layoutAnalyzer.dispose()
    }
    if (this.formulaRecognizer) {
      await this.formulaRecognizer.dispose()
    }
    if (this.barcodeRecognizer) {
      await this.barcodeRecognizer.dispose()
    }

    this.imageCache?.clear()
    this.resultCache?.clear()

    this.isInitialized = false
  }
}