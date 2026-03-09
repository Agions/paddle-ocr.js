/**
 * PaddleOCR-JS 增强版 - 类型定义
 */

import type { Canvas, Image } from "canvas"

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
}

/** 批量 OCR 结果 */
export interface BatchOCRResult {
  results: OCRResult[]
  totalDuration: number
  averageDuration: number
}

// ==================== 表格识别 ====================

/** 表格单元格 */
export interface TableCell {
  box: Point[]
  text: string
  rowspan: number
  colspan: number
  row: number
  col: number
  score: number
}

/** 表格识别结果 */
export interface TableResult {
  structure: TableStructure
  cells: TableCell[]
  html: string
  markdown: string
  excel?: string // base64
}

/** 表格结构 */
export interface TableStructure {
  rows: number
  cols: number
  borders: {
    top: number[]
    bottom: number[]
    left: number[]
    right: number[]
  }
}

// ==================== 公式识别 ====================

/** 公式类型 */
export type FormulaType = "inline" | "block" | "inline_tex" | "block_tex" | "html"

/** 公式识别结果 */
export interface FormulaResult {
  type: FormulaType
  latex?: string
  tex?: string
  html?: string
  mathml?: string
  text: string
  box: Point[]
  score: number
}

/** 公式识别配置 */
export interface FormulaRecognitionOptions {
  enableLatex?: boolean
  enableMathML?: boolean
  enableHtml?: boolean
  formulaType?: FormulaType
}

// ==================== 布局分析 ====================

/** 布局元素类型 */
export type LayoutType =
  | "text"
  | "title"
  | "figure"
  | "table"
  | "formula"
  | "chart"
  | "header"
  | "footer"
  | "footnote"
  | "equation"
  | "annotation"
  | "other"

/** 布局元素 */
export interface LayoutRegion {
  type: LayoutType
  box: Point[]
  score: number
  content?: string | TableResult | FormulaResult
  children?: LayoutRegion[]
}

/** 布局分析结果 */
export interface LayoutResult {
  regions: LayoutRegion[]
  pageWidth: number
  pageHeight: number
  direction?: "ltr" | "rtl" | "ttb"
}

// ==================== 条形码/二维码 ====================

/** 条码类型 */
export type BarcodeType =
  | "qr_code"
  | "data_matrix"
  | "aztec"
  | "codabar"
  | "code_128"
  | "code_39"
  | "code_93"
  | "ean_13"
  | "ean_8"
  | "itf"
  | "pdf_417"
  | "upc_a"
  | "upc_e"

/** 条码识别结果 */
export interface BarcodeResult {
  type: BarcodeType
  data: string
  format: string
  box: Point[]
  score: number
}

// ==================== 水印检测 ====================

/** 水印类型 */
export type WatermarkType = "text" | "image" | "tiled" | "semi_transparent"

/** 水印信息 */
export interface WatermarkInfo {
  type: WatermarkType
  text?: string
  imageUrl?: string
  box: Point[]
  opacity: number
  position: "corner" | "center" | "tiled"
}

// ==================== 配置选项 ====================

/** PaddleOCR 配置 */
export interface PaddleOCROptions {
  // 基础配置
  modelPath?: string
  useTensorflow?: boolean
  useONNX?: boolean
  useWasm?: boolean

  // 文本检测
  enableDetection?: boolean
  detectionModel?: "DB" | "DB++" | "EAST" | "PAN" | string

  // 文本识别
  enableRecognition?: boolean
  recognitionModel?: "CRNN" | "SVTR" | "NRTR" | string
  language?: LanguageOption

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

  // 性能配置
  maxSideLen?: number
  threshold?: number
  batchSize?: number
  enableGPU?: boolean
  numThreads?: number // WASM 线程数
  useMultiScale?: boolean // 多尺度检测
  useAngle_cls?: boolean // 方向分类

  // 缓存配置
  enableCache?: boolean
  cacheSize?: number

  // 回调
  onProgress?: ProgressCallback
  onError?: ErrorCallback
}

/** 表格识别选项 */
export interface TableRecognitionOptions {
  enableCoord?: boolean
  mergeSpans?: boolean
  format?: "html" | "markdown" | "excel"
}

/** 语言选项 */
export type LanguageOption =
  | "ch"
  | "en"
  | "fr"
  | "de"
  | "es"
  | "pt"
  | "it"
  | "ru"
  | "ja"
  | "ko"
  | "ar"
  | "hi"
  | string[]

/** 进度回调 */
export type ProgressCallback = (progress: number, stage: string, details?: Record<string, any>) => void

/** 错误回调 */
export type ErrorCallback = (error: Error, stage?: string) => void

// ==================== 处理选项 ====================

/** 处理模式 */
export type ProcessMode = "text" | "table" | "layout" | "formula" | "barcode" | "all"

/** 处理选项 */
export interface ProcessOptions {
  mode?: ProcessMode
  returnOriginalImage?: boolean
  useAngle?: boolean
  useDeskew?: boolean
  visualize?: boolean // 可视化结果
  outputPath?: string // 输出路径 (Node.js)
}

// ==================== 输入类型 ====================

/** 支持的图像输入类型 */
export type ImageSource =
  | HTMLImageElement
  | HTMLCanvasElement
  | HTMLVideoElement
  | ImageData
  | Image
  | string // URL 或文件路径
  | Uint8Array
  | ArrayBuffer
  | Buffer
  | Blob

// ==================== Worker 类型 ====================

/** Worker 消息类型 */
export type WorkerMessageType =
  | "init"
  | "recognize"
  | "batch"
  | "terminate"
  | "progress"
  | "result"
  | "error"

/** Worker 消息 */
export interface WorkerMessage {
  id: string
  type: WorkerMessageType
  payload?: any
}

/** Worker 结果 */
export interface WorkerResult {
  id: string
  success: boolean
  result?: OCRResult | TableResult | LayoutResult
  error?: string
}

// ==================== 可视化类型 ====================

/** 可视化选项 */
export interface VisualizeOptions {
  drawBoxes?: boolean
  drawText?: boolean
  drawLabels?: boolean
  boxColor?: string
  textColor?: string
  boxThickness?: number
  fontSize?: number
  fontFamily?: string
  includeConfidence?: boolean
}

// ==================== 静态类型 ====================

/** WorkerHelper 构造函数 */
export interface WorkerHelperConstructor {
  new (options: PaddleOCROptions, workerUrl?: string): any
}

/** ResultVisualizer 构造函数 */
export interface ResultVisualizerConstructor {
  new (container: string | HTMLElement, options?: VisualizeOptions): any
}

/** LightVisualizer 构造函数 */
export interface LightVisualizerConstructor {
  new (container: string | HTMLElement, options?: VisualizeOptions): any
}

/** PaddleOCR 静态接口 */
export interface PaddleOCRStatic {
  new (options?: PaddleOCROptions): PaddleOCR
  version: string
  WorkerHelper: WorkerHelperConstructor
  ResultVisualizer: ResultVisualizerConstructor
  LightVisualizer: LightVisualizerConstructor

  // 工具方法
  getSupportedLanguages(): string[]
  getModelInfo(): ModelInfo
  isSupported(): Promise<boolean>
}

/** 模型信息 */
export interface ModelInfo {
  detection: string[]
  recognition: string[]
  table: string[]
  formula: string[]
  layout: string[]
}

// ==================== PaddleOCR 实例接口 ====================

/** PaddleOCR 实例接口 */
export interface PaddleOCRInstance {
  init(): Promise<void>
  recognize(image: ImageSource, options?: ProcessOptions): Promise<OCRResult>
  recognizeTable(image: ImageSource, options?: ProcessOptions): Promise<TableResult>
  analyzeLayout(image: ImageSource, options?: ProcessOptions): Promise<LayoutResult>
  recognizeFormula(image: ImageSource, options?: ProcessOptions): Promise<FormulaResult>
  detectBarcodes(image: ImageSource): Promise<BarcodeResult[]>
  detectWatermarks(image: ImageSource): Promise<WatermarkInfo[]>

  // 批量处理
  recognizeBatch(images: ImageSource[], options?: ProcessOptions): Promise<BatchOCRResult>

  // 工具
  visualize(result: OCRResult, image: ImageSource, options?: VisualizeOptions): Promise<string | Buffer>

  // 生命周期
  dispose(): Promise<void>
  getStats(): OCRStats
}

/** OCR 统计信息 */
export interface OCRStats {
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  averageDuration: number
  cacheHits: number
  cacheMisses: number
}

// ==================== 错误类型 ====================

/** OCR 错误类型 */
export class OCRError extends Error {
  code: string
  stage?: string
  details?: any

  constructor(message: string, code: string, stage?: string, details?: any) {
    super(message)
    this.name = "OCRError"
    this.code = code
    this.stage = stage
    this.details = details
  }
}

// 错误码
export const ErrorCode = {
  INIT_FAILED: "INIT_FAILED",
  MODEL_NOT_FOUND: "MODEL_NOT_FOUND",
  DETECTION_FAILED: "DETECTION_FAILED",
  RECOGNITION_FAILED: "RECOGNITION_FAILED",
  INVALID_IMAGE: "INVALID_IMAGE",
  NOT_INITIALIZED: "NOT_INITIALIZED",
  WORKER_ERROR: "WORKER_ERROR",
  UNSUPPORTED_FORMAT: "UNSUPPORTED_FORMAT",
  OUT_OF_MEMORY: "OUT_OF_MEMORY",
  TIMEOUT: "TIMEOUT",
} as const
