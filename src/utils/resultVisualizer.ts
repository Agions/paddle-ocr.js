/**
 * 完整结果可视化（桌面端，支持主题/无障碍/键盘）
 */

import type { OcrResult, TableResult, LayoutResult, LayoutRegionType } from "../typings"
import { VisualizerBase } from "../visualizerBase"
import { DEFAULT_VISUAL, VisualizerOptions } from "./visualTypes"
import { THEME_COLORS } from "../core/constants"

export class ResultVisualizer extends VisualizerBase {
  private options: Required<VisualizerOptions>
  private result: OcrResult | TableResult | LayoutResult | null = null
  private mode: "text" | "table" | "layout" = "text"
  private highlightIndex = -1
  private listeners = new Map<string, Array<(e: { detail: unknown }) => void>>()

  constructor(container: string | HTMLElement, options: Partial<VisualizerOptions> = {}) {
    const el = typeof container === "string" ? document.getElementById(container) : container
    if (!el) throw new Error("Container not found")
    super(el, options.width ?? DEFAULT_VISUAL.width, options.height ?? DEFAULT_VISUAL.height)
    this.options = { ...DEFAULT_VISUAL, ...options } as Required<VisualizerOptions>
    this.applyTheme(this.options.theme)
    this.canvas.tabIndex = 0
    this.canvas.addEventListener("mousemove", this.onMouseMove)
    this.canvas.addEventListener("click", this.onClick)
    this.canvas.addEventListener("keydown", this.onKeyDown)
  }

  setMode(mode: "text" | "table" | "layout") { this.mode = mode; this.highlightIndex = -1; this.render() }
  setResult(result: OcrResult | TableResult | LayoutResult) { this.result = result; this.highlightIndex = -1; this.render() }
  addEventListener(event: string, listener: (e: { detail: unknown }) => void) {
    if (!this.listeners.has(event)) this.listeners.set(event, [])
    this.listeners.get(event)!.push(listener)
  }

  render(): void {
    if (!this.isReady) return
    this.clearCanvas()
    this.drawImage()
    if (!this.result) return
    if (this.mode === "text") this.renderText(this.result as OcrResult)
    else if (this.mode === "table") this.renderTable(this.result as TableResult)
    else this.renderLayout(this.result as LayoutResult)
    this.emit("render", null)
  }

  /** 导出头图 */
  exportImage(format: "png" | "jpeg" | "webp" = "png", quality = 0.95): string {
    return this.canvas.toDataURL(`image/${format}`, quality)
  }

  /** 无障碍文本 */
  exportAccessibleText(): string {
    if (!this.result) return ""
    if (this.mode === "text" && "textRecognition" in this.result) {
      return (this.result as OcrResult).textRecognition.map((l, i) => `${i + 1}. ${l.text}`).join("\n")
    }
    return ""
  }

  private applyTheme(theme: string): void {
    const colors = THEME_COLORS[theme]
    if (!colors) return
    Object.assign(this.options, colors, { lineWidth: colors.lineWidth ?? this.options.lineWidth })
  }

  private renderText(result: OcrResult): void {
    result.textDetection.forEach((box, i) => {
      const selected = i === this.highlightIndex
      this.strokePoly(box.box, selected ? this.options.highlight : this.options.boxColor, this.options.lineWidth)
    })
  }

  private renderTable(result: TableResult): void {
    result.table.cells.forEach((cell, i) => {
      const selected = i === this.highlightIndex
      this.strokePoly(cell.bbox, selected ? this.options.highlight : this.options.boxColor, this.options.lineWidth)
    })
  }

  private renderLayout(result: LayoutResult): void {
    const colorByType: Partial<Record<LayoutRegionType, string>> = {
      text: this.options.boxColor,
      title: "rgba(255,0,0,0.5)",
      figure: "rgba(0,255,0,0.5)",
      table: "rgba(255,165,0,0.5)",
    }
    result.regions.forEach((r, i) => {
      const selected = i === this.highlightIndex
      const color = selected ? this.options.highlight : colorByType[r.type] ?? this.options.boxColor
      this.strokePoly(r.bbox, color, this.options.lineWidth)
    })
  }

  private onMouseMove = (event: MouseEvent): void => {
    if (!this.result) return
    const rect = this.canvas.getBoundingClientRect()
    const idx = this.findIndex(event.clientX - rect.left, event.clientY - rect.top)
    if (idx !== this.highlightIndex) {
      this.highlightIndex = idx
      this.render()
      this.emit("hover", { index: idx })
    }
  }

  private onClick = (): void => {
    if (this.highlightIndex !== -1) this.emit("click", { index: this.highlightIndex })
  }

  private onKeyDown = (event: KeyboardEvent): void => {
    const len = this.lengthOfResult()
    if (len === 0) return
    if (event.key === "ArrowRight" || event.key === "ArrowDown") this.move(1, len)
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") this.move(-1, len)
    else if (event.key === "Enter" || event.key === " ") this.emit("click", { index: this.highlightIndex })
  }

  private move(delta: number, len: number): void {
    let next = this.highlightIndex + delta
    if (next < 0) next = len - 1
    else if (next >= len) next = 0
    this.highlightIndex = next
    this.render()
  }

  private findIndex(x: number, y: number): number {
    if (!this.result) return -1
    const items = this.mode === "text" ? (this.result as OcrResult).textDetection
      : this.mode === "table" ? (this.result as TableResult).table.cells
      : (this.result as LayoutResult).regions
    for (let i = items.length - 1; i >= 0; i--) {
      const box = (items[i] as { box?: unknown }).box ?? (items[i] as { bbox?: unknown }).bbox
      if (box && this.pointInPolygon(x, y, this.scale(box as never))) return i
    }
    return -1
  }

  private lengthOfResult(): number {
    if (!this.result) return 0
    if (this.mode === "text") return (this.result as OcrResult).textDetection.length
    if (this.mode === "table") return (this.result as TableResult).table.cells.length
    return (this.result as LayoutResult).regions.length
  }

  private emit(event: string, data: unknown): void {
    const handlers = this.listeners.get(event)
    if (!handlers) return
    const evt = { detail: data } as { detail: unknown }
    handlers.forEach((h) => h(evt))
  }

  override dispose(): void {
    this.listeners.clear()
    super.dispose()
  }
}
