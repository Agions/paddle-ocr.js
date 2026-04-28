/**
 * 可视化模块
 * 从上帝类 resultVisualizer.ts 拆分为模块化架构
 *
 * 架构：
 * - BaseVisualizer: 基类（Canvas管理、几何计算、事件系统）
 * - TextVisualizer: 文本检测/识别结果可视化
 * - TableVisualizer: 表格识别结果可视化
 * - LayoutVisualizer: 版面分析结果可视化
 * - AccessibilityManager: 无障碍支持
 * - ResultVisualizer: 门面类（保持向后兼容）
 */

export { BaseVisualizer, DEFAULT_OPTIONS, THEME_PRESETS, REGION_COLORS } from "./BaseVisualizer"
export { BaseVisualizerOptions } from "./BaseVisualizer"
export { TextVisualizer } from "./TextVisualizer"
export { TableVisualizer } from "./TableVisualizer"
export { LayoutVisualizer } from "./LayoutVisualizer"
export { AccessibilityManager } from "./AccessibilityManager"
export { ResultVisualizer } from "./ResultVisualizer"
export { VisualizerOptions } from "./ResultVisualizer"
