/**
 * PaddleOCR 增强版主类
 * 提供 OCR、表格、公式、条码等识别功能
 */

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
} from "./typings"

import { loadImage, ImageData } from "./utils/image"
import { TextDetector } from "./modules/textDetector"
import { TextRecognizer } from "./modules/textRecognizer"
import { TableRecognizer } from "./modules/tableRecognizer"
import { LayoutAnalyzer } from "./modules/layoutAnalyzer"
import { FormulaRecognizer } from "./modules/formulaRecognizer"
import { BarcodeRecognizer } from "./modules/barcodeRecognizer"
import { ImageCache, ResultCache } from "./utils/cache"
import { isNode, isBrowser } from "./utils/env"

/**
 * PaddleOCR 主类
 */
class PaddleOCR {
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
  private options: PaddleOCROptions
  private isInitialized = false

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

  // ==================== 构造函数 ====================

  /**
   * 创建 PaddleOCR 实例
   * @param options 配置选项
   */
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

  // ==================== 初始化 ====================

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
   * @param image 图像源
   * @param options 处理选项
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
      this.stats.averageDuration = this.totalDuration / this.stats.successfulRequests

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
  private async loadImageData(source: ImageSource): Promise<ImageData> {
    return await loadImage(source)
  }

  /**
   * 获取统计信息
   */
  public getStats(): OCRStats {
    return {
      ...this.stats,
      cacheHits: this.resultCache?.getStats().totalHits || 0,
      cacheMisses: this.stats.totalRequests - (this.resultCache?.getStats().totalHits || 0),
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

  // ==================== 静态方法 ====================

  /**
   * 获取支持的语言
   */
  public static getSupportedLanguages(): string[] {
    return [
      "ch", // 中文
      "en", // 英语
      "fr", // 法语
      "de", // 德语
      "es", // 西班牙语
      "pt", // 葡萄牙语
      "it", // 意大利语
      "ru", // 俄语
      "ja", // 日语
      "ko", // 韩语
      "ar", // 阿拉伯语
      "hi", // 印地语
    ]
  }

  /**
   * 获取模型信息
   */
  public static getModelInfo() {
    return {
      detection: ["DB", "DB++", "EAST", "PAN"],
      recognition: ["CRNN", "SVTR", "NRTR"],
      table: ["TableRec", "TableMaster"],
      formula: ["TexiRec", "UniMERNet"],
      layout: ["LayoutLM", "PaddleOCRv2"],
    }
  }

  /**
   * 检查环境支持
   */
  public static async isSupported(): Promise<boolean> {
    try {
      // 检查 WebGL 支持 (浏览器)
      if (isBrowser()) {
        const canvas = document.createElement("canvas")
        return !!(canvas.getContext("webgl2") || canvas.getContext("webgl"))
      }
      // Node.js 环境总是支持
      return true
    } catch {
      return false
    }
  }
}

export default PaddleOCR
export { PaddleOCR }
