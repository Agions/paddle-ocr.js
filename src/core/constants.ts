/**
 * PaddleOCR 常量配置
 * 单一事实源：去重/去死代码/去 PascalCase 命名不一致
 */

/** 模型路径 */
export const MODEL_PATH = {
  DEFAULT: "./models",
} as const

/** 检测阈值 */
export const DETECTION_THRESHOLD = {
  DEFAULT: 0.3,
  MIN: 0.1,
  MAX: 1.0,
  BOX: 0.3,
  UNCLIP_RATIO: 2.0,
} as const

/** 识别阈值 */
export const RECOGNITION_THRESHOLD = {
  DEFAULT: 0.5,
  MIN: 0.1,
  MAX: 1.0,
  CAND_OVERLAP_RATIO: 0.4,
  BEAM_SIZE: 5,
} as const

/** 缓存 */
export const CACHE_CONFIG = {
  TTL_MS: 3_600_000, // 1 小时
  MAX_SIZE_MB: 100,
  MAX_COUNT: 1000,
} as const

/** 性能 */
export const PERFORMANCE = {
  THREADS: 4,
  BATCH_SIZE: 8,
  MEMORY_LIMIT_MB: 512,
  TIMEOUT_MS: 30_000,
} as const

/** 可视化默认色与样式 */
export const VISUAL_STYLE = {
  TEXT_BOX: "rgba(0, 0, 255, 0.5)",
  TABLE_BOX: "rgba(255, 0, 0, 0.5)",
  LAYOUT_REGION: "rgba(0, 255, 0, 0.5)",
  HIGHLIGHT: "rgba(255, 255, 0, 0.5)",
  FONT_PX: 14,
  LINE_WIDTH: 2,
  PADDING: 5,
} as const

/** 主题 */
export const THEME = {
  DEFAULT: "default",
  DARK: "dark",
  LIGHT: "light",
  HIGH_CONTRAST: "highContrast",
  ALL: ["default", "dark", "light", "highContrast"] as const,
} as const

/** 主题色映射 */
export const THEME_COLORS: Record<string, { boxColor: string; textColor: string; background: string; highlight: string; lineWidth?: number }> = {
  default: { boxColor: VISUAL_STYLE.TEXT_BOX, textColor: "#FFFFFF", background: "rgba(0, 0, 0, 0.7)", highlight: VISUAL_STYLE.HIGHLIGHT },
  dark: { boxColor: "rgba(0, 200, 255, 0.6)", textColor: "#FFFFFF", background: "rgba(0, 0, 0, 0.8)", highlight: "rgba(255, 150, 0, 0.7)" },
  light: { boxColor: VISUAL_STYLE.TEXT_BOX, textColor: "#000000", background: "rgba(255, 255, 255, 0.8)", highlight: "rgba(255, 200, 0, 0.6)" },
  highContrast: { boxColor: "rgba(255, 255, 0, 0.8)", textColor: "#FFFFFF", background: "#000000", highlight: "#FF0000", lineWidth: 3 },
}
