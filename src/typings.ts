/**
 * PaddleOCR-JS 类型定义
 */

// ==================== 基础类型 ====================

export interface Point { x: number; y: number }

export interface TextBox {
  id: number
  box: Point[]
  score: number
}

export interface TextLine {
  text: string
  score: number
  box?: TextBox
  language?: string
}

// ==================== OCR 结果 ====================

export interface OcrDuration {
  preprocess: number
  detection: number
  recognition: number
  total: number
}

export interface OcrResult {
  textDetection: TextBox[]
  textRecognition: TextLine[]
  duration: OcrDuration
  imageWidth?: number
  imageHeight?: number
  angle?: number
  rotatedImage?: unknown
  originalImage?: unknown
}

export interface TableCell { row: number; col: number; content: string; bbox: Point[] }

export interface TableResult {
  table: { cells: TableCell[]; bbox: Point[] }
  structure?: unknown
  format?: "html" | "markdown" | "excel"
  html?: string
  markdown?: string
  duration: OcrDuration
  imageWidth?: number
  imageHeight?: number
  originalImage?: unknown
}

export type LayoutRegionType =
  | "text" | "table" | "figure" | "title" | "header" | "footer"
  | "reference" | "equation" | "comment"

export interface LayoutRegion {
  type: LayoutRegionType
  bbox: Point[]
  confidence: number
  box?: Point[]
  score?: number
  content?: string
}

export interface LayoutResult {
  regions: LayoutRegion[]
  duration: { preprocess: number; detection: number; total: number }
  imageWidth?: number
  imageHeight?: number
  pageWidth?: number
  pageHeight?: number
  originalImage?: unknown
}

export type FormulaType = "inline" | "block" | "inline_tex" | "block_tex" | "html"

export interface FormulaResult {
  formula: string
  type: FormulaType
  bbox: Point[]
  latex?: string
  tex?: string
  html?: string
  text?: string
  duration: { preprocess: number; recognition: number; total: number }
  imageWidth?: number
  imageHeight?: number
  originalImage?: unknown
}

export type BarcodeType = string // 任意 ZXing/MX 格式

export interface BarcodeResult {
  barcode: string
  type: BarcodeType
  bbox: Point[]
  data?: string
  format?: string
  duration: OcrDuration
  imageWidth?: number
  imageHeight?: number
  originalImage?: unknown
}

export interface WatermarkInfo {
  type: "watermark" | "logo"
  position: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center"
  content?: string
  confidence: number
}

// ==================== 处理选项 ====================

export type ProcessMode = "text" | "table" | "layout" | "formula" | "barcode" | "all"
export type LanguageOption = "ch" | "en" | "fr" | "de" | "ja" | "ko"
export type ErrorCallback = (error: Error, stage?: string) => void
export type ProgressCallback = (progress: number, message?: string) => void

export interface ProcessOptions {
  mode?: ProcessMode
  returnOriginalImage?: boolean
  useAngle?: boolean
  useDeskew?: boolean
  visualize?: boolean
  outputPath?: string
  onProgress?: ProgressCallback
  onError?: ErrorCallback
}

export interface BatchOcrResult {
  results: OcrResult[]
  successCount: number
  failCount: number
  failedImages: string[]
  totalDuration: number
  averageDuration: number
}

export interface ModelInfo {
  detection: string[]
  recognition: string[]
  version: string
}

// ==================== 输入类型 ====================

export type ImageSource =
  | HTMLImageElement
  | HTMLCanvasElement
  | HTMLVideoElement
  | string
  | Buffer
  | Uint8Array
  | ArrayBuffer
  | { data: Uint8Array; width: number; height: number }

// ==================== 配置选项 ====================

export interface TableRecognitionOptions {
  enableCoord?: boolean
  mergeSpans?: boolean
  format?: "html" | "markdown" | "excel"
}

export interface FormulaRecognitionOptions {
  type?: "auto" | FormulaType
  engine?: "mathpix" | "custom"
  enableLatex?: boolean
  enableMathML?: boolean
  enableHTML?: boolean
}

export interface LayoutAnalysisOptions {
  regionTypes?: LayoutRegionType[]
  minConfidence?: number
}

export interface BarcodeRecognitionOptions {
  formats?: string[]
  minLength?: number
  maxLength?: number
}

export interface WatermarkDetectionOptions {
  types?: ("watermark" | "logo")[]
  positions?: WatermarkInfo["position"][]
  minConfidence?: number
}

export interface CacheConfig {
  maxSize?: number
  maxCount?: number
  ttl?: number
  enableResultCache?: boolean
  enableModelCache?: boolean
}

export interface PerformanceConfig {
  threads?: number
  batchSize?: number
  memoryLimit?: number
  timeout?: number
}

export interface DebugConfig {
  verbose?: boolean
  logLevel?: "info" | "debug" | "trace"
  saveIntermediateResults?: boolean
}

export interface PaddleOcrOptions {
  modelPath?: string
  useTensorflow?: boolean
  useOnnx?: boolean
  useWasm?: boolean

  enableDetection?: boolean
  detectionModel?: "DB" | "DB++" | "EAST" | "PAN" | string
  detectionThreshold?: number
  detectionBoxThresh?: number
  detectionUnclipRatio?: number

  enableRecognition?: boolean
  recognitionModel?: "CRNN" | "SVTR" | "NRTR" | string
  language?: LanguageOption
  recognitionBeamSize?: number
  recognitionCandOverlapRatio?: number

  enableTable?: boolean
  enableLayout?: boolean
  enableFormula?: boolean
  enableBarcode?: boolean
  enableWatermark?: boolean

  tableOptions?: TableRecognitionOptions
  formulaOptions?: FormulaRecognitionOptions
  layoutOptions?: LayoutAnalysisOptions
  barcodeOptions?: BarcodeRecognitionOptions
  watermarkOptions?: WatermarkDetectionOptions

  cacheOptions?: CacheConfig
  performanceOptions?: PerformanceConfig
  debugOptions?: DebugConfig

  onProgress?: ProgressCallback
}

// ==================== 错误 ====================

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
  UNKNOWN_ERROR = 9999,
}

export class OcrError extends Error {
  code: ErrorCode
  stage?: string
  details?: unknown
  constructor(message: string, code: ErrorCode, stage?: string, details?: unknown) {
    super(message)
    this.name = "OcrError"
    this.code = code
    this.stage = stage
    this.details = details
  }
}

// ==================== 工具接口 ====================

export interface OcrImageData {
  width: number
  height: number
  data: Uint8Array | Uint8ClampedArray
  channels?: number
  colorSpace?: string
}

export interface ModelLoaderLike {
  load(spec: { type: "detection" | "recognition" | "table" | "layout" | "formula" | "barcode"; subPath?: string; name?: string; language?: string }): Promise<unknown>
  dispose(): void
}
