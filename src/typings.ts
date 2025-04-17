// 识别结果中的文本坐标点
export interface Point {
  x: number
  y: number
}

// 检测结果中的文本框
export interface TextBox {
  id: number
  box: Point[]
  score: number
}

// 识别结果中的文本行
export interface TextLine {
  text: string
  score: number
  box?: TextBox
}

// OCR结果
export interface OCRResult {
  textDetection: TextBox[]
  textRecognition: TextLine[]
  duration: {
    preprocess: number
    detection: number
    recognition: number
    total: number
  }
}

// 表格识别结果
export interface TableResult {
  structure: any // 表格结构
  cells: {
    box: Point[]
    text: string
    rowspan: number
    colspan: number
    row: number
    col: number
  }[]
  html: string // 表格HTML
}

// 文档布局分析结果
export interface LayoutResult {
  regions: {
    type: string // 'text', 'title', 'figure', 'table', 等
    box: Point[]
    score: number
    content?: string | TableResult
  }[]
}

// 初始化配置
export interface PaddleOCROptions {
  // 基础配置
  modelPath?: string
  useTensorflow?: boolean
  useONNX?: boolean
  useWasm?: boolean

  // 文本检测配置
  enableDetection?: boolean
  detectionModel?: "DB" | "DB++" | "East" | string

  // 文本识别配置
  enableRecognition?: boolean
  recognitionModel?: "CRNN" | "SVTR" | string
  language?: string // 'ch', 'en', 等，支持80+语言

  // 高级功能配置
  enableTable?: boolean
  enableLayout?: boolean
  enableFormula?: boolean

  // 性能配置
  maxSideLen?: number // 最大边长
  threshold?: number // 检测阈值
  batchSize?: number // 批处理大小
  enableGPU?: boolean // 是否使用GPU

  // 进度回调
  onProgress?: (progress: number, stage: string) => void
}

// 处理选项
export interface ProcessOptions {
  mode?: "text" | "table" | "layout" | "all"
  returnOriginalImage?: boolean
  useAngle?: boolean // 是否进行文字方向检测
  useDeskew?: boolean // 是否进行图像校正
}

// 处理输入类型
export type ImageSource =
  | HTMLImageElement
  | HTMLCanvasElement
  | ImageData
  | string
  | Uint8Array
  | Buffer

/**
 * WorkerHelper的静态类型
 */
export interface WorkerHelperConstructor {
  new (options: PaddleOCROptions, workerUrl?: string): any
}

/**
 * ResultVisualizer的静态类型
 */
export interface ResultVisualizerConstructor {
  new (container: string | HTMLElement, options?: any): any
}

/**
 * LightVisualizer的静态类型
 */
export interface LightVisualizerConstructor {
  new (container: string | HTMLElement, options?: any): any
}

// 为PaddleOCR类添加静态类型声明
export interface PaddleOCRStatic {
  new (options?: PaddleOCROptions): any // 实例类型
  version: string // 版本信息
  WorkerHelper: WorkerHelperConstructor // Worker助手
  ResultVisualizer: ResultVisualizerConstructor // 结果可视化组件
  LightVisualizer: LightVisualizerConstructor // 轻量级可视化组件
}
