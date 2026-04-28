/**
 * PaddleOCR 常量配置
 * 集中管理所有魔法值和默认配置
 */

// ==================== 路径配置 ====================

/** 模型路径配置 */
export const MODEL_PATHS = {
  /** 默认模型路径 */
  DEFAULT: "./models",
  /** 检测模型子目录 */
  DETECTION: "detection",
  /** 识别模型子目录 */
  RECOGNITION: "recognition",
  /** 表格模型子目录 */
  TABLE: "table",
  /** 版面分析模型子目录 */
  LAYOUT: "layout"
} as const

/** 完整的模型路径映射 */
export const FULL_MODEL_PATHS = {
  detection: `${MODEL_PATHS.DEFAULT}/${MODEL_PATHS.DETECTION}`,
  recognition: `${MODEL_PATHS.DEFAULT}/${MODEL_PATHS.RECOGNITION}`,
  table: `${MODEL_PATHS.DEFAULT}/${MODEL_PATHS.TABLE}`,
  layout: `${MODEL_PATHS.DEFAULT}/${MODEL_PATHS.LAYOUT}`
} as const

// ==================== 阈值配置 ====================

/** 检测相关阈值 */
export const DETECTION_THRESHOLDS = {
  /** 默认置信度阈值 */
  DEFAULT: 0.3,
  /** 最小置信度阈值 */
  MIN: 0.1,
  /** 最大置信度阈值 */
  MAX: 1.0,
  /** 检测框合并阈值 */
  BOX_THRESHOLD: 0.3,
  /** 检测框扩展比率 */
  UNCLIP_RATIO: 2.0
} as const

/** 识别相关阈值 */
export const RECOGNITION_THRESHOLDS = {
  /** 默认识别阈值 */
  DEFAULT: 0.5,
  /** 最小识别阈值 */
  MIN: 0.1,
  /** 最大识别阈值 */
  MAX: 1.0,
  /** 候选重叠比率 */
  CAND_OVERLAP_RATIO: 0.4,
  /** Beam 大小 */
  BEAM_SIZE: 5
} as const

/** 缓存相关阈值 */
export const CACHE_THRESHOLDS = {
  /** 默认缓存 TTL (毫秒) */
  DEFAULT_TTL: 3600000, // 1小时
  /** 最大缓存大小 (MB) */
  MAX_SIZE_MB: 100,
  /** 最大缓存条目数 */
  MAX_COUNT: 1000,
  /** 缓存过期时间 (毫秒) */
  TTL: 3600000 // 1小时
} as const

// ==================== 性能配置 ====================

/** 性能优化配置 */
export const PERFORMANCE_CONFIG = {
  /** 默认线程数 */
  THREADS: 4,
  /** 默认批处理大小 */
  BATCH_SIZE: 8,
  /** 内存限制 (MB) */
  MEMORY_LIMIT_MB: 512,
  /** 超时时间 (毫秒) */
  TIMEOUT_MS: 30000, // 30秒
  /** 默认批处理大小 */
  DEFAULT_BATCH_SIZE: 8
} as const

// ==================== 可视化配置 ====================

/** 默认可视化颜色 */
export const VISUALIZATION_COLORS = {
  /** 文本检测框颜色 */
  TEXT_BOX: "rgba(0, 0, 255, 0.5)",
  /** 表格检测框颜色 */
  TABLE_BOX: "rgba(255, 0, 0, 0.5)",
  /** 版面区域颜色 */
  LAYOUT_REGION: "rgba(0, 255, 0, 0.5)",
  /** 高亮颜色 */
  HIGHLIGHT: "rgba(255, 255, 0, 0.5)",
  /** 默认背景颜色 */
  BACKGROUND: "transparent",
  /** 字体颜色 */
  TEXT_COLOR: "#000000"
} as const

/** 默认可视化样式 */
export const VISUALIZATION_STYLES = {
  /** 默认字体大小 */
  FONT_SIZE: 14,
  /** 默认边框宽度 */
  LINE_WIDTH: 2,
  /** 默认内边距 */
  PADDING: 5,
  /** 是否显示置信度 */
  SHOW_CONFIDENCE: true,
  /** 是否显示框 ID */
  SHOW_BOX_ID: false,
  /** 是否启用交互 */
  INTERACTIVE: true,
  /** 是否自动调整大小 */
  AUTO_RESIZE: true,
  /** 是否启用无障碍功能 */
  ENABLE_ACCESSIBILITY: true
} as const

/** 主题配置 */
export const THEMES = {
  /** 默认主题 */
  DEFAULT: "default" as const,
  /** 暗色主题 */
  DARK: "dark" as const,
  /** 亮色主题 */
  LIGHT: "light" as const,
  /** 高对比度主题 */
  HIGH_CONTRAST: "highContrast" as const,
  /** 所有可用主题 */
  ALL: ["default", "dark", "light", "highContrast"] as const
} as const

// ==================== 功能开关配置 ====================

/** 功能启用配置 */
export const FEATURE_FLAGS = {
  /** 是否启用文本检测 */
  ENABLE_DETECTION: true,
  /** 是否启用文本识别 */
  ENABLE_RECOGNITION: true,
  /** 是否启用表格识别 */
  ENABLE_TABLE: true,
  /** 是否启用版面分析 */
  ENABLE_LAYOUT: true,
  /** 是否启用公式识别 */
  ENABLE_FORMULA: true,
  /** 是否启用条码识别 */
  ENABLE_BARCODE: true,
  /** 是否启用水印检测 */
  ENABLE_WATERMARK: true
} as const

/** 默认功能配置 */
export const DEFAULT_FEATURE_CONFIG = {
  enableDetection: FEATURE_FLAGS.ENABLE_DETECTION,
  enableRecognition: FEATURE_FLAGS.ENABLE_RECOGNITION,
  enableTable: FEATURE_FLAGS.ENABLE_TABLE,
  enableLayout: FEATURE_FLAGS.ENABLE_LAYOUT,
  enableFormula: FEATURE_FLAGS.ENABLE_FORMULA,
  enableBarcode: FEATURE_FLAGS.ENABLE_BARCODE,
  enableWatermark: FEATURE_FLAGS.ENABLE_WATERMARK
} as const

// ==================== 调试配置 ====================

/** 调试级别配置 */
export const DEBUG_LEVELS = {
  /** 信息级别 */
  INFO: "info" as const,
  /** 调试级别 */
  DEBUG: "debug" as const,
  /** 跟踪级别 */
  TRACE: "trace" as const,
  /** 所有可用级别 */
  ALL: ["info", "debug", "trace"] as const
} as const

/** 默认调试配置 */
export const DEFAULT_DEBUG_CONFIG = {
  verbose: false,
  logLevel: DEBUG_LEVELS.INFO,
  saveIntermediateResults: false
} as const

// ==================== 导出配置 ====================

/** 所有配置的命名空间 */
export namespace Config {
  export type ModelPath = keyof typeof MODEL_PATHS
  export type DetectionThreshold = typeof DETECTION_THRESHOLDS[keyof typeof DETECTION_THRESHOLDS]
  export type RecognitionThreshold = typeof RECOGNITION_THRESHOLDS[keyof typeof RECOGNITION_THRESHOLDS]
  export type VisualizationTheme = typeof THEMES[keyof typeof THEMES]
  export type DebugLevel = typeof DEBUG_LEVELS[keyof typeof DEBUG_LEVELS]
}

/** 默认配置对象 */
export const DEFAULT_CONFIG = {
  modelPath: MODEL_PATHS.DEFAULT,
  useTensorflow: false,
  useONNX: true,
  useWasm: false,
  
  enableDetection: FEATURE_FLAGS.ENABLE_DETECTION,
  detectionModel: "DB" as const,
  detectionThreshold: DETECTION_THRESHOLDS.DEFAULT,
  detectionBoxThresh: DETECTION_THRESHOLDS.BOX_THRESHOLD,
  detectionUnclipRatio: DETECTION_THRESHOLDS.UNCLIP_RATIO,
  
  enableRecognition: FEATURE_FLAGS.ENABLE_RECOGNITION,
  recognitionModel: "CRNN" as const,
  language: "ch" as const,
  recognitionBeamSize: RECOGNITION_THRESHOLDS.BEAM_SIZE,
  recognitionCandOverlapRatio: RECOGNITION_THRESHOLDS.CAND_OVERLAP_RATIO,
  
  enableTable: FEATURE_FLAGS.ENABLE_TABLE,
  enableLayout: FEATURE_FLAGS.ENABLE_LAYOUT,
  enableFormula: FEATURE_FLAGS.ENABLE_FORMULA,
  enableBarcode: FEATURE_FLAGS.ENABLE_BARCODE,
  enableWatermark: FEATURE_FLAGS.ENABLE_WATERMARK,
  
  tableOptions: {
    enableCoord: true,
    mergeSpans: true,
    format: "html" as const
  },
  
  formulaOptions: {
    type: "auto" as const,
    engine: "mathpix" as const
  },
  
  layoutOptions: {
    regionTypes: ["text", "table", "figure", "title", "header", "footer"],
    minConfidence: DETECTION_THRESHOLDS.MIN
  },
  
  barcodeOptions: {
    formats: [],
    minLength: 6,
    maxLength: 30
  },
  
  watermarkOptions: {
    types: ["watermark", "logo"],
    positions: ["top-left", "top-right", "bottom-left", "bottom-right", "center"],
    minConfidence: 0.8
  },
  
  cacheOptions: {
    maxSize: CACHE_THRESHOLDS.MAX_SIZE_MB,
    maxCount: CACHE_THRESHOLDS.MAX_COUNT,
    ttl: CACHE_THRESHOLDS.TTL,
    enableResultCache: true,
    enableModelCache: true
  },
  
  performanceOptions: {
    threads: PERFORMANCE_CONFIG.THREADS,
    batchSize: PERFORMANCE_CONFIG.BATCH_SIZE,
    memoryLimit: PERFORMANCE_CONFIG.MEMORY_LIMIT_MB,
    timeout: PERFORMANCE_CONFIG.TIMEOUT_MS
  },
  
  debugOptions: DEFAULT_DEBUG_CONFIG
}