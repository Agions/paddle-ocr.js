/**
 * PaddleOCR 主类（精简版 - Facade Pattern）
 * 模型共享 + 进度回调 + 统计 + 缓存 + 自动 init
 */

import {
  PaddleOcrOptions,
  OcrResult,
  TableResult,
  LayoutResult,
  FormulaResult,
  BarcodeResult,
  ImageSource,
  ProcessOptions,
  BatchOcrResult,
  TextBox,
  TextLine,
  OcrImageData,
  OcrError,
  ErrorCode,
} from "./typings"
import { loadImage } from "./utils/image"
import { ImageProcessor } from "./utils/imageProcessor"
import { ImageCache, ResultCache } from "./utils/cache"
import { isNode } from "./utils/env"
import { StatsManager } from "./core/statsManager"
import { TextDetector } from "./modules/textDetector"
import { TextRecognizer } from "./modules/textRecognizer"
import { TableRecognizer } from "./modules/tableRecognizer"
import { LayoutAnalyzer } from "./modules/layoutAnalyzer"
import { FormulaRecognizer } from "./modules/formulaRecognizer"
import { BarcodeRecognizer } from "./modules/barcodeRecognizer"

export class PaddleOcr {
  private detector?: TextDetector
  private recognizer?: TextRecognizer
  private tableRecognizer?: TableRecognizer
  private layoutAnalyzer?: LayoutAnalyzer
  private formulaRecognizer?: FormulaRecognizer
  private barcodeRecognizer?: BarcodeRecognizer

  private stats = new StatsManager()
  private imageCache?: ImageCache
  private resultCache?: ResultCache
  private isInitialized = false
  private options: PaddleOcrOptions

  constructor(options: PaddleOcrOptions = {}) {
    this.options = { ...this.defaultOptions(), ...options }
    if (this.options.cacheOptions?.enableResultCache !== false) {
      this.imageCache = new ImageCache(this.options.cacheOptions)
      this.resultCache = new ResultCache(this.options.cacheOptions)
    }
  }

  // ==================== 初始化 ====================

  async init(): Promise<void> {
    if (this.isInitialized) return
    const stages: Array<{ name: string; run: () => Promise<void> }> = []

    if (this.options.enableDetection) stages.push({
      name: "detection", run: async () => { this.detector = new TextDetector(this.options); await this.detector.init() },
    })
    if (this.options.enableRecognition) stages.push({
      name: "recognition", run: async () => { this.recognizer = new TextRecognizer(this.options); await this.recognizer.init() },
    })
    if (this.options.enableTable) stages.push({
      name: "table", run: async () => { this.tableRecognizer = new TableRecognizer(this.options, this.detector, this.recognizer); await this.tableRecognizer.init() },
    })
    if (this.options.enableLayout) stages.push({
      name: "layout", run: async () => { this.layoutAnalyzer = new LayoutAnalyzer(this.options, this.detector, this.recognizer, undefined); await this.layoutAnalyzer.init() },
    })
    if (this.options.enableFormula) stages.push({
      name: "formula", run: async () => { this.formulaRecognizer = new FormulaRecognizer(this.options); await this.formulaRecognizer.init() },
    })
    if (this.options.enableBarcode) stages.push({
      name: "barcode", run: async () => { this.barcodeRecognizer = new BarcodeRecognizer(this.options); await this.barcodeRecognizer.init() },
    })

    this.reportProgress(0, "init")
    for (let i = 0; i < stages.length; i++) {
      try { await stages[i].run() } catch (e) { throw new OcrError(`init failed at ${stages[i].name}: ${e}`, ErrorCode.INIT_FAILED, stages[i].name, e) }
      this.reportProgress((i + 1) / stages.length * 100, stages[i].name)
    }
    this.isInitialized = true
  }

  // ==================== OCR 入口 ====================

  async recognize(image: ImageSource, options?: ProcessOptions): Promise<OcrResult> {
    await this.ensureInit()
    const start = Date.now()
    this.stats.incrementTotalRequests()

    const imageData = await this.loadImageData(image)
    const cacheKey = this.resultCache ? ResultCache.key(imageDataSignature(imageData), { mode: options?.mode ?? "text", lang: this.options.language ?? "ch", th: this.options.detectionThreshold ?? 0.3 }) : null
    if (cacheKey && this.resultCache?.has(cacheKey)) {
      this.stats.stats.cacheHits++
      return this.resultCache.get(cacheKey) as OcrResult
    }
    this.stats.stats.cacheMisses++

    let textBoxes: TextBox[] = []
    let textLines: TextLine[] = []
    if (this.detector) {
      this.reportProgress(30, "detect")
      textBoxes = await this.detector.detect(imageData)
    }
    if (this.recognizer) {
      this.reportProgress(60, "recognize")
      textLines = await this.recognizer.recognize(imageData, textBoxes)
    }

    const duration = Date.now() - start
    this.stats.incrementSuccessfulRequests()
    this.stats.updateAverageDuration(duration)

    const result: OcrResult = {
      textDetection: textBoxes,
      textRecognition: textLines,
      duration: { preprocess: duration * 0.1, detection: duration * 0.3, recognition: duration * 0.5, total: duration },
      imageWidth: imageData.width,
      imageHeight: imageData.height,
    }
    if (cacheKey) this.resultCache?.set(cacheKey, result)
    return result
  }

  async recognizeBatch(images: ImageSource[], options?: ProcessOptions): Promise<BatchOcrResult> {
    const start = Date.now()
    const results: OcrResult[] = []
    const failed: string[] = []
    for (const image of images) {
      try { results.push(await this.recognize(image, options)) }
      catch { failed.push(String(image)) }
    }
    const total = Date.now() - start
    return { results, successCount: results.length, failCount: failed.length, failedImages: failed, totalDuration: total, averageDuration: total / images.length }
  }

  async recognizeTable(image: ImageSource): Promise<TableResult> {
    await this.ensureInit()
    this.requireReady("recognizeTable", this.tableRecognizer)
    return this.tableRecognizer!.recognize(await this.loadImageData(image))
  }

  async analyzeLayout(image: ImageSource): Promise<LayoutResult> {
    await this.ensureInit()
    this.requireReady("analyzeLayout", this.layoutAnalyzer)
    return this.layoutAnalyzer!.analyze(await this.loadImageData(image))
  }

  async recognizeFormula(image: ImageSource): Promise<FormulaResult[]> {
    await this.ensureInit()
    this.requireReady("recognizeFormula", this.formulaRecognizer)
    return this.formulaRecognizer!.recognize(await this.loadImageData(image))
  }

  async detectBarcodes(image: ImageSource): Promise<BarcodeResult[]> {
    await this.ensureInit()
    this.requireReady("detectBarcodes", this.barcodeRecognizer)
    return this.barcodeRecognizer!.detect(await this.loadImageData(image))
  }

  // ==================== 工具 ====================

  getStats() { return this.stats.getStats() }
  resetStats() { this.stats.reset() }

  /** 释放所有 Recognizer 与模型 */
  async dispose(): Promise<void> {
    await Promise.all([
      this.detector?.dispose(),
      this.recognizer?.dispose(),
      this.tableRecognizer?.dispose(),
      this.layoutAnalyzer?.dispose(),
      this.formulaRecognizer?.dispose(),
      this.barcodeRecognizer?.dispose(),
    ])
    this.isInitialized = false
  }

  // ==================== 内部 ====================

  private defaultOptions(): PaddleOcrOptions {
    return {
      modelPath: isNode() ? "./models" : "/models",
      useTensorflow: true,
      enableDetection: true,
      detectionModel: "DB",
      enableRecognition: true,
      recognitionModel: "CRNN",
      language: "ch",
      enableTable: false,
      enableLayout: false,
      enableFormula: false,
      enableBarcode: false,
      detectionThreshold: 0.3,
    }
  }

  private async loadImageData(source: ImageSource): Promise<OcrImageData> {
    if (this.imageCache) {
      const key = ImageProcessor.cacheKey(source)
      const cached = this.imageCache.get(key)
      if (cached) return cached
      const data = await loadImage(source)
      this.imageCache.set(key, data)
      return data
    }
    return loadImage(source)
  }

  private async ensureInit(): Promise<void> {
    if (!this.isInitialized) await this.init()
  }

  private requireReady(stage: string, x: unknown): asserts x is NonNullable<typeof x> {
    if (!x) throw new OcrError(`${stage} not enabled`, ErrorCode.NOT_INITIALIZED, stage)
  }

  private reportProgress(progress: number, stage: string): void {
    this.options.onProgress?.(progress, stage)
  }
}

/** 用图像 data 字节作为 cache 签名 */
function imageDataSignature(image: OcrImageData): string {
  return ImageProcessor.cacheKey(new Uint8Array(image.data instanceof Uint8ClampedArray ? image.data.buffer : image.data.buffer), { width: image.width, height: image.height })
}
