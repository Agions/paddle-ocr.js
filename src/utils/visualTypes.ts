/**
 * 可视化共享类型与默认选项
 */

export interface VisualizerOptions {
  width?: number
  height?: number
  fontSize?: number
  lineWidth?: number
  textColor?: string
  background?: string
  boxColor?: string
  highlight?: string
  padding?: number
  showConfidence?: boolean
  showBoxId?: boolean
  interactive?: boolean
  autoResize?: boolean
  theme?: "default" | "dark" | "light" | "highContrast"
}

export const DEFAULT_VISUAL: Required<VisualizerOptions> = {
  width: 800,
  height: 600,
  fontSize: 14,
  lineWidth: 2,
  textColor: "#FFFFFF",
  background: "rgba(0,0,0,0.7)",
  boxColor: "rgba(0,0,255,0.5)",
  highlight: "rgba(255,255,0,0.5)",
  padding: 5,
  showConfidence: true,
  showBoxId: true,
  interactive: true,
  autoResize: true,
  theme: "default",
}
