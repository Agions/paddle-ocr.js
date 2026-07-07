/**
 * 轻量级可视化（移动端优化版）
 * 继承 VisualizerBase 共享 canvas / 多边形 / 生命周期
 */

import type { OcrResult, TableResult, LayoutResult, Point } from "../typings"
import { VisualizerBase } from "../visualizerBase"

export interface LightVisualizerOptions {
  width?: number
  height?: number
  color: string
  bgColor: string
  textColor: string
  fontSize: number
  lineWidth: number
  renderMode: "simple" | "list"
  onSelect?: (id: number, item: unknown) => void
}

const DEFAULT: Required<Omit<LightVisualizerOptions, "onSelect">> & { onSelect?: (id: number, item: unknown) => void } = {
  width: 300, height: 200, color: "#007bff", bgColor: "rgba(0,0,0,0.6)",
  textColor: "#fff", fontSize: 12, lineWidth: 2, renderMode: "simple", onSelect: undefined,
}

export class LightVisualizer extends VisualizerBase {
  private options: Required<LightVisualizerOptions>
  private result: OcrResult | TableResult | LayoutResult | null = null
  private mode: "text" | "table" | "layout" = "text"
  private selectedId = -1

  constructor(container: string | HTMLElement, options: Partial<LightVisualizerOptions> = {}) {
    const el = typeof container === "string" ? document.getElementById(container) : container
    if (!el) throw new Error("Container not found")
    super(el, options.width ?? DEFAULT.width, options.height ?? DEFAULT.height)
    this.options = { ...DEFAULT, ...options } as Required<LightVisualizerOptions>
    this.canvas.addEventListener("click", this.onClick)
  }

  setMode(mode: "text" | "table" | "layout") { this.mode = mode; this.selectedId = -1; this.render() }
  setResult(result: OcrResult | TableResult | LayoutResult) { this.result = result; this.selectedId = -1; this.render() }

  render(): void {
    if (!this.isReady) return
    this.clearCanvas()
    this.drawImage()
    if (!this.result) return
    const color = this.options.color
    if (this.mode === "text") this.renderText(this.result as OcrResult, color)
    else if (this.mode === "table") this.renderTable(this.result as TableResult, color)
    else this.renderLayout(this.result as LayoutResult, color)
  }

  /** 转 dataURL */
  toDataURL(type = "image/png", quality = 0.9): string { return this.canvas.toDataURL(type, quality) }

  private renderText(result: OcrResult, color: string): void {
    result.textDetection.forEach((box, i) => {
      const selected = i === this.selectedId
      this.strokePoly(box.box, selected ? "#ff9900" : color, this.options.lineWidth + (selected ? 1 : 0))
    })
  }

  private renderTable(result: TableResult, color: string): void {
    result.table.cells.forEach((cell, i) => {
      const selected = i === this.selectedId
      this.strokePoly(cell.bbox, selected ? "#ff9900" : color, this.options.lineWidth + (selected ? 1 : 0))
    })
  }

  private renderLayout(result: LayoutResult, color: string): void {
    result.regions.forEach((r, i) => {
      const selected = i === this.selectedId
      this.strokePoly(r.bbox, selected ? "#ff9900" : color, this.options.lineWidth + (selected ? 1 : 0))
    })
  }

  private onClick = (event: MouseEvent): void => {
    if (!this.result) return
    const rect = this.canvas.getBoundingClientRect()
    const x = event.clientX - rect.left, y = event.clientY - rect.top
    const items = this.mode === "text" ? (this.result as OcrResult).textDetection
      : this.mode === "table" ? (this.result as TableResult).table.cells
      : (this.result as LayoutResult).regions
    for (let i = items.length - 1; i >= 0; i--) {
      const poly = (items[i] as { bbox?: Point[]; box?: Point[] }).bbox ?? (items[i] as { box?: Point[] }).box
      if (!poly) continue
      if (this.pointInPolygon(x, y, this.scale(poly))) {
        this.selectedId = i
        this.render()
        this.options.onSelect?.(i, items[i])
        return
      }
    }
  }
}
