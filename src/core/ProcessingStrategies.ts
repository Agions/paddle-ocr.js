import { ProcessMode } from "../typings"

/**
 * OCR 处理策略配置
 */
export interface OCRProcessingStrategy {
  /**
   * 处理模式
   */
  mode?: ProcessMode
  
  /**
   * 是否返回原始图像
   */
  returnOriginalImage?: boolean
  
  /**
   * 是否使用角度校正
   */
  useAngle?: boolean
  
  /**
   * 是否使用去歪斜
   */
  useDeskew?: boolean
  
  /**
   * 是否启用可视化
   */
  visualize?: boolean
  
  /**
   * 输出路径（Node.js）
   */
  outputPath?: string
}

/**
 * 可视化渲染策略配置
 */
export interface VisualizationStrategy {
  /**
   * 是否显示置信度
   */
  showConfidence?: boolean
  
  /**
   * 是否显示框 ID
   */
  showBoxId?: boolean
  
  /**
   * 是否交互式显示
   */
  interactive?: boolean
  
  /**
   * 是否自动调整大小
   */
  autoResize?: boolean
  
  /**
   * 主题样式
   */
  theme?: "default" | "dark" | "light" | "highContrast"
}

/**
 * 高级处理选项
 */
export interface AdvancedProcessingOptions {
  /**
   * 是否启用表格识别
   */
  enableTable?: boolean
  
  /**
   * 是否启用版面分析
   */
  enableLayout?: boolean
  
  /**
   * 是否启用公式识别
   */
  enableFormula?: boolean
  
  /**
   * 是否启用条码识别
   */
  enableWatermark?: boolean
}