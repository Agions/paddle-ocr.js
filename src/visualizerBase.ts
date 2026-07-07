/**
 * 可视化共享基类：抽 canvas / 事件 / 多边形 contains / 资源释放
 */

/**
 * 可视化共享基类
 */

import type { Point } from "./typings"

export abstract class VisualizerBase {
  protected canvas: HTMLCanvasElement
  protected ctx: CanvasRenderingContext2D
  protected container: HTMLElement
  protected image: HTMLImageElement | HTMLCanvasElement | null = null
  protected isReady = false

  constructor(container: HTMLElement, width = 800, height = 600) {
    const el = document.createElement("canvas")
    el.width = width
    el.height = height
    el.setAttribute("role", "img")
    this.container = container
    container.appendChild(el)
    const ctx = el.getContext("2d")
    if (!ctx) throw new Error("Cannot create 2D context")
    this.canvas = el
    this.ctx = ctx
  }

  /** 加载图像 */
  async loadImage(image: string | HTMLImageElement | HTMLCanvasElement): Promise<void> {
    if (typeof image === "string") {
      const img = new Image()
      img.crossOrigin = "anonymous"
      this.image = await new Promise<HTMLImageElement>((resolve, reject) => {
        img.onload = () => resolve(img)
        img.onerror = () => reject(new Error("Image load failed"))
        img.src = image
      })
    } else {
      this.image = image
    }
    this.isReady = true
    this.fitToContainer()
  }

  /** 自适应容器尺寸（保持图像纵横比） */
  protected fitToContainer(): void {
    if (!this.image || !this.container) return
    const imgW = this.image instanceof HTMLImageElement ? this.image.naturalWidth : this.image.width
    const imgH = this.image instanceof HTMLImageElement ? this.image.naturalHeight : this.image.height
    const cw = this.container.clientWidth || imgW
    const scale = Math.min(cw / imgW, this.canvas.height / imgH)
    this.canvas.width = imgW * scale
    this.canvas.height = imgH * scale
  }

  /** 清除画面 */
  protected clearCanvas(): void {
    const { width, height } = this.canvas
    this.ctx.clearRect(0, 0, width, height)
  }

  /** 绘制底图 */
  protected drawImage(): void {
    if (!this.image) return
    this.ctx.drawImage(this.image, 0, 0, this.canvas.width, this.canvas.height)
  }

  /** 缩放多边形点到当前画布坐标 */
  protected scale(box: Point[]): Point[] {
    if (!this.image) return box
    const { width, height } = this.canvas
    const nw = this.image instanceof HTMLImageElement ? this.image.naturalWidth : this.image.width
    const nh = this.image instanceof HTMLImageElement ? this.image.naturalHeight : this.image.height
    const sx = width / nw, sy = height / nh
    return box.map((p) => ({ x: p.x * sx, y: p.y * sy }))
  }

  /** 多边形包含点 (ray casting) */
  protected pointInPolygon(x: number, y: number, poly: Point[]): boolean {
    let inside = false
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i].x, yi = poly[i].y, xj = poly[j].x, yj = poly[j].y
      const intersect = (yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi
      if (intersect) inside = !inside
    }
    return inside
  }

  /** 描边多边形 */
  protected strokePoly(box: Point[], color: string, lineWidth: number): void {
    const points = this.scale(box)
    if (points.length < 3) return
    this.ctx.strokeStyle = color
    this.ctx.lineWidth = lineWidth
    this.ctx.beginPath()
    this.ctx.moveTo(points[0].x, points[0].y)
    for (let i = 1; i < points.length; i++) this.ctx.lineTo(points[i].x, points[i].y)
    this.ctx.closePath()
    this.ctx.stroke()
  }

  /** 销毁 */
  dispose(): void {
    if (this.canvas.parentElement) this.canvas.parentElement.removeChild(this.canvas)
    this.image = null
    this.isReady = false
  }
}
