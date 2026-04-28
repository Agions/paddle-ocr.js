/**
 * PaddleOCR-JS 增强版 - 类型定义
 */

// canvas 包为可选依赖，在浏览器环境不一定可用
// 声明本地类型以避免强制依赖导入失败
declare global {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type CanvasImage = any
}

// 前向声明
class PaddleOCR {}

// ==================== 基础类型 ====================

/** 坐标点 */
export interface Point {
  x: number
  y: number
}

/** 文本框 */
export interface TextBox {
  id: number
  box: Point[]
  score: number
}

/** 文本行 */
export interface TextLine {
  text: string
  score: number
  box?: TextBox
  language?: string
}

// ==================== OCR 结果 ====================

/** OCR 识别结果 */
export interface OCRResult {
  textDetection: TextBox[]
  textRecognition: TextLine[]
  duration: {
    preprocess: number
    detection: number
    recognition: number
    total: number
  }
  imageWidth?: number
  imageHeight?: number
  angle?: number
  rotatedImage?: CanvasImage
  originalImage?: CanvasImage
}

/** 表格识别结果 */
export interface TableResult {
  table: {
    cells: Array<{
      row: number
      col: number
      content: string
      bbox: Point[]
    }>
    bbox: Point[]
    structure?: any
  }
  format?: "html" | "markdown" | "excel"
  html?: string
  markdown?: string
  duration: {
    preprocess: number
    detection: number
    recognition: number
    total: number
  }
  imageWidth?: number
  imageHeight?: number
  originalImage?: CanvasImage
}

/** 版面分析结果 */
export interface LayoutResult {
  regions: Array<{
    type: "text" | "table" | "figure" | "title" | "header" | "footer"
    bbox: Point[]
    confidence: number
    box?: any
    score?: number
    content?: string
  }>
  duration: {
    preprocess: number
    detection: number
    total: number
  }
  imageWidth?: number
  imageHeight?: number
  pageWidth?: number
  pageHeight?: number
  originalImage?: CanvasImage
}

/** 公式类型 */
export type FormulaType = "inline" | "block" | "inline_tex" | "block_tex" | "html"

/** 条码类型 */
export type BarcodeType = "qr" | "code128" | "code39" | "ean13" | "ean8" | "upca" | "upce" | string

/** 公式识别结果 */
export interface FormulaResult {
  formula: string
  type: "inline" | "block" | "inline_tex" | "block_tex" | "html"
  bbox: Point[]
  latex?: string
  tex?: string
  html?: string
  text?: string
  duration: {
    preprocess: number
    recognition: number
    total: number
  }
  imageWidth?: number
  imageHeight?: number
  originalImage?: CanvasImage
}

/** 条码识别结果 */
export interface BarcodeResult {
  barcode: string
  type: string
  bbox: Point[]
  data?: string
  format?: string
  duration: {
    preprocess: number
    detection: number
    recognition: number
    total: number
  }
  imageWidth?: number
  imageHeight?: number
  originalImage?: CanvasImage
}

/** 水印信息 */
export interface WatermarkInfo {
  type: "watermark" | "logo"
  position: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center"
  content?: string
  confidence: number
}

// ==================== 处理选项 ====================

/** 处理模式 */
export type ProcessMode = "text" | "table" | "layout" | "formula" | "barcode" | "all"

/** 语言选项 */
export type LanguageOption = "ch" | "en" | "fr" | "de" | "ja" | "ko"

/** 错误回调 */
export type ErrorCallback = (error: Error, stage?: string) => void

/** 进度回调 */
export type ProgressCallback = (progress: number, message?: string) => void

/** 处理选项 */
export interface ProcessOptions {
  mode?: ProcessMode
  returnOriginalImage?: boolean
  useAngle?: boolean
  useDeskew?: boolean
  visualize?: boolean // 可视化结果
  outputPath?: string // 输出路径 (Node.js)
  onProgress?: ProgressCallback
  onError?: ErrorCallback
}

/** 批量处理结果 */
export interface BatchOCRResult {
  results: OCRResult[]
  successCount: number
  failCount: number
  failedImages: string[]
  totalDuration: number
  averageDuration: number
}

/** 模型信息 */
export interface ModelInfo {
  detection: string[]
  recognition: string[]
  version: string
}

// ==================== 输入类型 ====================

/** 支持的图像输入类型 */
export type ImageSource =
  | HTMLImageElement
  | HTMLCanvasElement
  | HTMLVideoElement
  | string // URL 或文件路径
  | Buffer // Node.js Buffer
  | Uint8Array // 字节数组
  | ArrayBuffer // ArrayBuffer
  | { data: Uint8Array; width: number; height: number } // 像素数据对象

// ==================== OCR 配置 ====================

/** 表格识别选项 */
export interface TableRecognitionOptions {
  enableCoord?: boolean
  mergeSpans?: boolean
  format?: "html" | "markdown" | "excel"
}

/** 公式识别选项 */
export interface FormulaRecognitionOptions {
  type?: "auto" | "inline" | "block" | "inline_tex" | "block_tex" | "html"
  engine?: "mathpix" | "custom"
  enableLatex?: boolean
  enableMathML?: boolean
  enableHTML?: boolean
}

/** 版面分析选项 */
export interface LayoutAnalysisOptions {
  regionTypes?: ("text" | "table" | "figure" | "title" | "header" | "footer")[]
  minConfidence?: number
}

/** 条码识别选项 */
export interface BarcodeRecognitionOptions {
  formats?: string[]
  minLength?: number
  maxLength?: number
}

/** 水印检测选项 */
export interface WatermarkDetectionOptions {
  types?: ("watermark" | "logo")[]
  positions?: ("top-left" | "top-right" | "bottom-left" | "bottom-right" | "center")[]
  minConfidence?: number
}

/** PaddleOCR 配置选项 */
export interface PaddleOCROptions {
  // 基础配置
  modelPath?: string
  useTensorflow?: boolean
  useONNX?: boolean
  useWasm?: boolean

  // 文本检测
  enableDetection?: boolean
  detectionModel?: "DB" | "DB++" | "EAST" | "PAN" | string
  detectionThreshold?: number
  detectionBoxThresh?: number
  detectionUnclipRatio?: number

  // 文本识别
  enableRecognition?: boolean
  recognitionModel?: "CRNN" | "SVTR" | "NRTR" | string
  language?: LanguageOption
  recognitionBeamSize?: number
  recognitionCandOverlapRatio?: number

  // 高级功能
  enableTable?: boolean
  enableLayout?: boolean
  enableFormula?: boolean
  enableBarcode?: boolean
  enableWatermark?: boolean

  // 表格识别选项
  tableOptions?: TableRecognitionOptions

  // 公式识别选项
  formulaOptions?: FormulaRecognitionOptions

  // 版面分析选项
  layoutOptions?: LayoutAnalysisOptions

  // 条码识别选项
  barcodeOptions?: BarcodeRecognitionOptions

  // 水印检测选项
  watermarkOptions?: WatermarkDetectionOptions

  // 缓存配置
  cacheOptions?: {
    maxSize?: number // MB
    maxCount?: number
    ttl?: number // ms
    enableResultCache?: boolean
    enableModelCache?: boolean
  }

  // 性能配置
  performanceOptions?: {
    threads?: number
    batchSize?: number
    memoryLimit?: number // MB
    timeout?: number // ms
  }

  // 向后兼容性支持
  maxSideLen?: number // 已废弃，使用 performanceOptions 替代
  enableCache?: boolean // 已废弃，使用 cacheOptions 替代
  cacheSize?: number // 已废弃，使用 cacheOptions 替代
  threshold?: number // 已废弃，使用 detectionThreshold 替代
  batchSize?: number // 已废弃，使用 performanceOptions 替代
  enableGPU?: boolean // 已废弃，使用 useWasm 替代
  onProgress?: ProgressCallback // 已废弃，传递给方法调用

  // 调试配置
  debugOptions?: {
    verbose?: boolean
    logLevel?: "info" | "debug" | "trace"
    saveIntermediateResults?: boolean
  }
}

// ==================== 缓存类型 ====================

/** 统计信息接口 */
export interface OCRStats {
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  averageDuration: number
  cacheHits: number
  cacheMisses: number
}

/** 缓存统计信息 */
export interface CacheStats {
  totalHits: number
  totalMisses: number
  hitRate: number
  size: number
  count: number
}

/** 图像缓存接口 */
export interface ImageCacheInterface {
  get(key: string): Promise<Uint8Array | null>
  set(key: string, value: Uint8Array, ttl?: number): Promise<void>
  delete(key: string): Promise<void>
  clear(): Promise<void>
  getStats(): CacheStats
  has(key: string): Promise<boolean>
  size(): Promise<number>
}

/** 结果缓存接口 */
export interface ResultCacheInterface {
  get(imageHash: string, options: {
    mode?: ProcessMode
    threshold?: number
    language?: LanguageOption
  }): Promise<OCRResult | null>
  set(
    imageHash: string,
    result: OCRResult,
    options: {
      mode?: ProcessMode
      threshold?: number
      language?: LanguageOption
    },
    ttl?: number
  ): Promise<void>
  delete(imageHash: string, options: {
    mode?: ProcessMode
    threshold?: number
    language?: LanguageOption
  }): Promise<void>
  clear(): Promise<void>
  getStats(): CacheStats
  generateKey(imageData: Uint8Array | string, options: {
    mode?: ProcessMode
    threshold?: number
    language?: LanguageOption
  }): string
}

/** 模型缓存接口 */
export interface ModelCacheInterface {
  get(modelName: string): Promise<any | null>
  set(modelName: string, model: any, ttl?: number): Promise<void>
  delete(modelName: string): Promise<void>
  clear(): Promise<void>
  getStats(): CacheStats
  has(modelName: string): Promise<boolean>
}

// ==================== 错误类型 ====================

/** 错误代码 */
export enum ErrorCode {
  INVALID_IMAGE_FORMAT = 1001,
  MODEL_LOAD_FAILED = 1002,
  PROCESSING_TIMEOUT = 1003,
  CACHE_ERROR = 1004,
  NETWORK_ERROR = 1005,
  CONFIG_ERROR = 1006,
  INIT_FAILED = 1007,
  RECOGNITION_FAILED = 1008,
  MEMORY_LIMIT_EXCEEDED = 1009,
  NOT_INITIALIZED = 1010,
  UNKNOWN_ERROR = 9999
}

/** OCR 错误 */
export class OCRError extends Error {
  code: ErrorCode
  stage?: string
  details?: any

  constructor(message: string, code: ErrorCode, stage?: string, details?: any) {
    super(message)
    this.name = "OCRError"
    this.code = code
    this.stage = stage
    this.details = details
  }
}

// ==================== 工具函数类型 ====================

/** 图像处理器接口 */
export interface ImageProcessorInterface {
  loadImage(source: ImageSource): Promise<{
    data: Uint8Array
    width: number
    height: number
  }>
  resizeImage(data: Uint8Array, width: number, height: number): Uint8Array
  normalizeImage(data: Uint8Array, width: number, height: number): Uint8Array
  generateCacheKey(data: Uint8Array): string
}

/** 模型加载器接口 */
export interface ModelLoaderInterface {
  loadDetectionModel(options: PaddleOCROptions): Promise<any>
  loadRecognitionModel(options: PaddleOCROptions): Promise<any>
  loadTableModel(options: PaddleOCROptions): Promise<any>
  loadLayoutModel(options: PaddleOCROptions): Promise<any>
  unloadModel(modelType: "detection" | "recognition" | "table" | "layout"): Promise<void>
}

// ==================== 导出类型 ====================

// 导出所有主要类型以便外部使用