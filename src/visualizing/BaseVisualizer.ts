import { Point } from "../typings"

/**
 * 可视化器选项（共享基础选项）
 */
export interface BaseVisualizerOptions {
  width: number
  height: number
  boxColor: string
  textColor: string
  backgroundColor: string
  fontSize: number
  padding: number
  showConfidence: boolean
  showBoxId: boolean
  interactive: boolean
  autoResize: boolean
  highlightColor: string
  lineWidth: number
  enableAccessibility?: boolean
  theme?: "default" | "dark" | "light" | "highContrast"
}

/**
 * 默认可视化选项
 */
export const DEFAULT_OPTIONS: BaseVisualizerOptions = {
  width: 800,
  height: 600,
  boxColor: "rgba(0, 0, 255, 0.5)",
  textColor: "#FFFFFF",
  backgroundColor: "rgba(0, 0, 0, 0.7)",
  fontSize: 14,
  padding: 8,
  showConfidence: true,
  showBoxId: true,
  interactive: true,
  autoResize: true,
  highlightColor: "rgba(255, 255, 0, 0.5)",
  lineWidth: 2,
  enableAccessibility: true,
  theme: "default",
}

/**
 * 主题配置表
 */
export const THEME_PRESETS: Record<string, Partial<BaseVisualizerOptions>> = {
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

/**
 * 可视化器基类
 * 提供Canvas管理、几何计算、事件系统等共享能力
 */
export abstract class BaseVisualizer {
  protected canvas: HTMLCanvasElement
  protected ctx: CanvasRenderingContext2D
  protected image: HTMLImageElement | HTMLCanvasElement | null = null
  protected options: BaseVisualizerOptions
  protected highlightedIndex: number = -1
  protected listeners: Map<string, EventListener[]> = new Map()

  constructor(
    container: string | HTMLElement,
    options: Partial<BaseVisualizerOptions> = {}
  ) {
    this.options = { ...DEFAULT_OPTIONS, ...options }

    const containerElement =
      typeof container === "string"
        ? document.getElementById(container)
        : container

    if (!containerElement) {
      throw new Error("容器元素不存在")
    }

    // 创建画布
    this.canvas = document.createElement("canvas")
    this.canvas.width = this.options.width
    this.canvas.height = this.options.height
    this.canvas.style.maxWidth = "100%"
    this.canvas.setAttribute("role", "img")
    this.canvas.setAttribute("aria-label", "OCR识别结果可视化")
    this.canvas.tabIndex = 0

    const ctx = this.canvas.getContext("2d")
    if (!ctx) {
      throw new Error("无法创建2D渲染上下文")
    }
    this.ctx = ctx

    containerElement.appendChild(this.canvas)

    // 应用主题
    this.applyTheme(this.options.theme || "default")
  }

  // ==================== Canvas 工具方法 ====================

  /**
   * 获取缩放比例
   */
  protected getScaleFactors(): { scaleX: number; scaleY: number } {
    if (!this.image) return { scaleX: 1, scaleY: 1 }
    const img = this.image as HTMLImageElement
    return {
      scaleX: this.canvas.width / (img.naturalWidth || img.width),
      scaleY: this.canvas.height / (img.naturalHeight || img.height),
    }
  }

  /**
   * 缩放点坐标
   */
  protected scalePoints(points: Point[]): Point[] {
    const { scaleX, scaleY } = this.getScaleFactors()
    return points.map((p) => ({ x: p.x * scaleX, y: p.y * scaleY }))
  }

  /**
   * 绘制多边形框
   */
  protected drawPolygon(
    points: Point[],
    strokeStyle: string,
    lineWidth: number
  ): void {
    if (!points || points.length < 2) return

    this.ctx.strokeStyle = strokeStyle
    this.ctx.lineWidth = lineWidth
    this.ctx.beginPath()
    this.ctx.moveTo(points[0].x, points[0].y)
    for (let i = 1; i < points.length; i++) {
      this.ctx.lineTo(points[i].x, points[i].y)
    }
    this.ctx.closePath()
    this.ctx.stroke()
  }

  /**
   * 绘制填充多边形
   */
  protected drawFilledPolygon(
    points: Point[],
    strokeStyle: string,
    fillStyle: string,
    lineWidth: number
  ): void {
    this.drawPolygon(points, strokeStyle, lineWidth)
    this.ctx.fillStyle = fillStyle
    this.ctx.fill()
  }

  /**
   * 绘制文本标签（带背景）
   */
  protected drawTextLabel(
    text: string,
    x: number,
    y: number,
    bgColor?: string,
    textColor?: string
  ): void {
    const bg = bgColor || this.options.backgroundColor
    const color = textColor || this.options.textColor

    const textWidth =
      this.ctx.measureText(text).width + this.options.padding * 2
    const textHeight = this.options.fontSize + this.options.padding * 2

    // 背景
    this.ctx.fillStyle = bg
    this.ctx.fillRect(x, y - textHeight, textWidth, textHeight)

    // 文本
    this.ctx.fillStyle = color
    this.ctx.font = `${this.options.fontSize}px Arial`
    this.ctx.fillText(text, x + this.options.padding, y - this.options.padding)
  }

  /**
   * 判断点是否在多边形内（射线法）
   */
  protected pointInPolygon(x: number, y: number, polygon: Point[]): boolean {
    let inside = false
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x
      const yi = polygon[i].y
      const xj = polygon[j].x
      const yj = polygon[j].y

      const intersect =
        yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi

      if (intersect) {
        inside = !inside
      }
    }
    return inside
  }

  /**
   * 在多边形列表中查找包含指定坐标的多边形索引
   */
  protected findPolygonIndexAt(
    x: number,
    y: number,
    boxes: Point[][]
  ): number {
    for (let i = boxes.length - 1; i >= 0; i--) {
      const scaledPoints = this.scalePoints(boxes[i])
      if (this.pointInPolygon(x, y, scaledPoints)) {
        return i
      }
    }
    return -1
  }

  // ==================== 画布管理 ====================

  /**
   * 调整画布大小以适配容器
   */
  protected resizeCanvas(): void {
    if (!this.image) return

    const imgWidth =
      this.image instanceof HTMLImageElement
        ? this.image.naturalWidth
        : this.image.width
    const imgHeight =
      this.image instanceof HTMLImageElement
        ? this.image.naturalHeight
        : this.image.height

    const containerWidth =
      this.canvas.parentElement?.clientWidth || this.options.width
    const scale = Math.min(
      containerWidth / imgWidth,
      this.options.height / imgHeight
    )

    this.canvas.width = imgWidth * scale
    this.canvas.height = imgHeight * scale
  }

  /**
   * 设置 ResizeObserver
   */
  protected setupResizeObserver(container: HTMLElement): void {
    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(() => {
        this.resizeCanvas()
        this.render()
      })
      observer.observe(container)
    } else {
      window.addEventListener("resize", () => {
        this.resizeCanvas()
        this.render()
      })
    }
  }

  // ==================== 事件系统 ====================

  /**
   * 添加事件监听器
   */
  public addEventListener(event: string, listener: EventListener): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event)!.push(listener)
  }

  /**
   * 移除事件监听器
   */
  public removeEventListener(event: string, listener: EventListener): void {
    if (!this.listeners.has(event)) return
    const listeners = this.listeners.get(event)!
    const index = listeners.indexOf(listener)
    if (index !== -1) {
      listeners.splice(index, 1)
    }
  }

  /**
   * 触发事件
   */
  protected triggerEvent(event: string, data?: any): void {
    if (!this.listeners.has(event)) return
    const listeners = this.listeners.get(event)!
    const customEvent = new CustomEvent(event, { detail: data })
    listeners.forEach((listener) => listener(customEvent))
  }

  // ==================== 主题 ====================

  /**
   * 应用主题
   */
  protected applyTheme(theme: string): void {
    if (theme === "default") return
    const preset = THEME_PRESETS[theme]
    if (preset) {
      Object.assign(this.options, preset)
    }
  }

  // ==================== 公共方法 ====================

  /**
   * 加载图像
   */
  public async loadImage(
    image: string | HTMLImageElement | HTMLCanvasElement
  ): Promise<void> {
    if (typeof image === "string") {
      const img = new Image()
      img.crossOrigin = "anonymous"

      return new Promise((resolve, reject) => {
        img.onload = () => {
          this.image = img
          this.resizeCanvas()
          this.render()
          resolve()
        }
        img.onerror = () => reject(new Error("图像加载失败"))
        img.src = image
      })
    } else {
      this.image = image
      this.resizeCanvas()
      this.render()
    }
  }

  /**
   * 更新可视化选项
   */
  public updateOptions(options: Partial<BaseVisualizerOptions>): void {
    this.options = { ...this.options, ...options }
    this.render()
  }

  /**
   * 导出为图像
   */
  public exportImage(
    type: "png" | "jpeg" | "webp" = "png",
    quality: number = 0.95
  ): string {
    return this.canvas.toDataURL(`image/${type}`, quality)
  }

  /**
   * 清除显示
   */
  public clear(): void {
    this.image = null
    this.highlightedIndex = -1
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
  }

  /**
   * 销毁组件
   */
  public dispose(): void {
    if (this.canvas.parentElement) {
      this.canvas.parentElement.removeChild(this.canvas)
    }
    this.image = null
    this.listeners.clear()
  }

  // ==================== 抽象方法 ====================

  /**
   * 子类必须实现的渲染方法
   */
  abstract render(): void
}
