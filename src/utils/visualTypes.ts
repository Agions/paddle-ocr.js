/**
 * 共享视觉类型定义
 * 提取通用视觉选项，减少重复代码
 */

/**
 * 基础视觉选项（所有可视化器共享）
 */
export interface BaseVisualOptions {
  /** 画布宽度 */
  width: number
  /** 画布高度 */
  height: number
  /** 文本颜色 */
  textColor: string
  /** 字体大小 */
  fontSize: number
  /** 线条宽度 */
  lineWidth: number
  /** 是否响应式 */
  responsive: boolean
}

/**
 * 完整可视化选项（继承基础选项）
 */
export interface VisualizerOptions extends BaseVisualOptions {
  /** 框颜色 */
  boxColor: string
  /** 背景颜色 */
  backgroundColor: string
  /** 内边距 */
  padding: number
  /** 是否显示置信度 */
  showConfidence: boolean
  /** 是否显示框 ID */
  showBoxId: boolean
  /** 是否可交互 */
  interactive: boolean
  /** 是否自动调整大小 */
  autoResize: boolean
  /** 高亮颜色 */
  highlightColor: string
  /** 是否启用无障碍支持 */
  enableAccessibility?: boolean
  /** 主题预设 */
  theme?: "default" | "dark" | "light" | "highContrast"
  /** 选择回调 */
  onSelect?: (id: number, item: any) => void
}

/**
 * 轻量可视化选项（移动端优化）
 */
export interface LightVisualizerOptions extends BaseVisualOptions {
  /** 框颜色（简化为 color） */
  color: string
  /** 背景颜色（简化为 bgColor） */
  bgColor: string
  /** 是否响应式 */
  responsive: boolean
  /** 是否针对移动端优化 */
  optimizeForMobile: boolean
  /** 渲染模式 */
  renderMode: "simple" | "list"
}

/**
 * 默认基础视觉选项
 */
export const DEFAULT_BASE_OPTIONS: BaseVisualOptions = {
  width: 800,
  height: 600,
  textColor: "#FFFFFF",
  fontSize: 14,
  lineWidth: 2,
  responsive: true,
}

/**
 * 默认完整可视化选项
 */
export const DEFAULT_VISUALIZER_OPTIONS: VisualizerOptions = {
  ...DEFAULT_BASE_OPTIONS,
  boxColor: "rgba(0, 0, 255, 0.5)",
  backgroundColor: "rgba(0, 0, 0, 0.7)",
  padding: 8,
  showConfidence: true,
  showBoxId: true,
  interactive: true,
  autoResize: true,
  highlightColor: "rgba(255, 255, 0, 0.5)",
  enableAccessibility: true,
  theme: "default",
}

/**
 * 默认轻量可视化选项
 */
export const DEFAULT_LIGHT_OPTIONS: LightVisualizerOptions = {
  width: 300,
  height: 200,
  color: "#007bff",
  textColor: "#ffffff",
  bgColor: "rgba(0, 0, 0, 0.6)",
  fontSize: 12,
  lineWidth: 2,
  responsive: true,
  optimizeForMobile: true,
  renderMode: "simple",
}

/**
 * 主题配置表
 */
export const THEME_PRESETS: Record<string, Partial<VisualizerOptions>> = {
  dark: {
    boxColor: "rgba(0, 200, 255, 0.6)",
    textColor: "#FFFFFF",
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    highlightColor: "rgba(255, 150, 0, 0.7)",
  },
  light: {
    boxColor: "rgba(0, 100, 255, 0.5)",
    textColor: "#000000",
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    highlightColor: "rgba(255, 200, 0, 0.6)",
  },
  highContrast: {
    boxColor: "rgba(255, 255, 0, 0.8)",
    textColor: "#FFFFFF",
    backgroundColor: "#000000",
    highlightColor: "#FF0000",
    lineWidth: 3,
  },
}

/**
 * 版面区域类型对应的颜色映射
 */
export const REGION_COLORS: Record<string, string> = {
  text: "rgba(0, 0, 255, 0.5)",
  title: "rgba(255, 0, 0, 0.5)",
  figure: "rgba(0, 255, 0, 0.5)",
  table: "rgba(255, 165, 0, 0.5)",
  default: "rgba(128, 128, 128, 0.5)",
}
