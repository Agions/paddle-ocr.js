import {
  OCRResult,
  TextBox,
  TableResult,
  LayoutResult,
} from "../typings"
import { BaseVisualizer, BaseVisualizerOptions } from "./BaseVisualizer"
import { TextVisualizer } from "./TextVisualizer"
import { TableVisualizer } from "./TableVisualizer"
import { LayoutVisualizer } from "./LayoutVisualizer"
import { AccessibilityManager } from "./AccessibilityManager"

/**
 * 可视化选项接口（保持向后兼容）
 */
export interface VisualizerOptions extends BaseVisualizerOptions {}

/**
 * OCR结果可视化组件（门面类）
 *
 * 重构说明：原 1,241 行上帝类拆分为：
 * - BaseVisualizer: Canvas 管理、几何计算、事件系统
 * - TextVisualizer: 文本渲染
 * - TableVisualizer: 表格渲染
 * - LayoutVisualizer: 版面渲染
 * - AccessibilityManager: 无障碍支持
 * - ResultVisualizer: 门面类（本文件），保持 API 兼容
 */
export class ResultVisualizer {
  private textVisualizer: TextVisualizer
  private tableVisualizer: TableVisualizer
  private layoutVisualizer: LayoutVisualizer
  private accessibilityManager: AccessibilityManager | null = null

  private mode: "text" | "table" | "layout" = "text"
  private result: OCRResult | TableResult | LayoutResult | null = null
  private options: VisualizerOptions

  // 引用共享的画布（所有子可视化器共享同一个画布）
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private image: HTMLImageElement | HTMLCanvasElement | null = null

  private listeners: Map<string, EventListener[]> = new Map()

  /**
   * 创建OCR结果可视化组件
   * @param container 容器元素或其ID
   * @param options 可视化选项
   */
  constructor(
    container: string | HTMLElement,
    options: Partial<VisualizerOptions> = {}
  ) {
    // 默认选项
    const defaultOptions: VisualizerOptions = {
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

    this.options = { ...defaultOptions, ...options }

    // 获取容器元素
    const containerElement =
      typeof container === "string"
        ? document.getElementById(container)
        : container

    if (!containerElement) {
      throw new Error("容器元素不存在")
    }

    // 创建共享画布
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

    // 创建子可视化器（共享同一个 canvas context）
    // 注意：子可视化器不再自己创建 canvas，我们直接使用它们的渲染逻辑
    this.textVisualizer = new TextVisualizer(container, { ...this.options })
    this.tableVisualizer = new TableVisualizer(container, { ...this.options })
    this.layoutVisualizer = new LayoutVisualizer(container, { ...this.options })

    // 移除子可视化器创建的多余 canvas
    this.removeSubCanvases(containerElement)

    // 设置无障碍支持
    if (this.options.enableAccessibility) {
      this.accessibilityManager = new AccessibilityManager(
        this.canvas,
        containerElement
      )
      this.accessibilityManager.setNavigationCallbacks(
        (direction) => this.navigateResults(direction),
        () => this.selectCurrent()
      )
    }

    // 设置事件监听
    if (this.options.interactive) {
      this.setupEventListeners()
    }

    // 设置自动调整大小
    if (this.options.autoResize) {
      this.setupResizeObserver(containerElement)
    }

    // 应用主题
    this.applyTheme(this.options.theme || "default")
  }

  /**
   * 移除子可视化器创建的 canvas 元素
   */
  private removeSubCanvases(container: HTMLElement): void {
    const canvases = container.querySelectorAll("canvas")
    // 保留最后一个（我们的主 canvas）
    for (let i = 0; i < canvases.length - 1; i++) {
      canvases[i].remove()
    }
  }

  // ==================== 模式管理 ====================

  /**
   * 设置可视化模式
   */
  public setMode(mode: "text" | "table" | "layout"): void {
    this.mode = mode
    this.textVisualizer["highlightedIndex"] = -1
    this.tableVisualizer["highlightedIndex"] = -1
    this.layoutVisualizer["highlightedIndex"] = -1
    this.render()

    if (this.options.enableAccessibility && this.accessibilityManager) {
      this.accessibilityManager.updateModeLabel(mode)
    }
  }

  // ==================== 图像与结果 ====================

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
          this.syncImageToSubVisualizers()
          this.resizeCanvas()
          this.render()
          resolve()
        }
        img.onerror = () => reject(new Error("图像加载失败"))
        img.src = image
      })
    } else {
      this.image = image
      this.syncImageToSubVisualizers()
      this.resizeCanvas()
      this.render()
    }
  }

  /**
   * 同步图像到子可视化器
   */
  private syncImageToSubVisualizers(): void {
    // 直接设置子可视化器的 image 和 canvas
    for (const viz of [
      this.textVisualizer,
      this.tableVisualizer,
      this.layoutVisualizer,
    ] as BaseVisualizer[]) {
      viz["image"] = this.image
      viz["canvas"] = this.canvas
      viz["ctx"] = this.ctx
    }
  }

  /**
   * 设置OCR结果
   */
  public setResult(result: OCRResult | TableResult | LayoutResult): void {
    this.result = result

    // 分发结果到对应子可视化器
    if ("textDetection" in result) {
      this.textVisualizer.setResult(result as OCRResult)
      this.mode = "text"
    } else if ("cells" in result) {
      this.tableVisualizer.setResult(result as TableResult)
      this.mode = "table"
    } else if ("regions" in result) {
      this.layoutVisualizer.setResult(result as LayoutResult)
      this.mode = "layout"
    }

    this.render()

    // 更新无障碍
    if (this.options.enableAccessibility && this.accessibilityManager) {
      this.accessibilityManager.updateSummary(result, this.mode)
    }
  }

  // ==================== 渲染 ====================

  /**
   * 渲染可视化结果
   */
  public render(): void {
    if (!this.image) return

    const { width, height } = this.canvas
    this.ctx.clearRect(0, 0, width, height)
    this.ctx.drawImage(this.image, 0, 0, width, height)

    // 委托给当前模式的子可视化器
    if (this.result) {
      if (this.mode === "text" && "textDetection" in this.result) {
        this.textVisualizer["render"]()
      } else if (this.mode === "table" && "cells" in this.result) {
        this.tableVisualizer["render"]()
      } else if (this.mode === "layout" && "regions" in this.result) {
        this.layoutVisualizer["render"]()
      }
    }

    this.triggerEvent("render")
  }

  // ==================== 交互 ====================

  /**
   * 导航结果（方向键支持）
   */
  private navigateResults(direction: number): void {
    if (!this.result) return

    let maxIndex = 0
    if (this.mode === "text" && "textDetection" in this.result) {
      maxIndex = (this.result as OCRResult).textDetection.length - 1
    } else if (this.mode === "table" && "cells" in this.result) {
      maxIndex = (this.result as TableResult).cells.length - 1
    } else if (this.mode === "layout" && "regions" in this.result) {
      maxIndex = (this.result as LayoutResult).regions.length - 1
    }

    if (maxIndex < 0) return

    const currentViz = this.getCurrentVisualizer()
    let newIndex = (currentViz as any)["highlightedIndex"] + direction

    if (newIndex < 0) newIndex = maxIndex
    else if (newIndex > maxIndex) newIndex = 0

    ;(currentViz as any)["highlightedIndex"] = newIndex
    this.render()

    // 更新无障碍
    if (this.accessibilityManager) {
      const desc = (currentViz as any).getAccessibilityText(newIndex)
      this.accessibilityManager.updateHighlightInfo(desc)
    }

    this.triggerEvent("hover", {
      index: newIndex,
      element: (currentViz as any).getElementByIndex(newIndex),
    })
  }

  /**
   * 选择当前高亮项
   */
  private selectCurrent(): void {
    const currentViz = this.getCurrentVisualizer()
    const idx = (currentViz as any)["highlightedIndex"]

    if (idx !== -1) {
      this.triggerEvent("click", {
        index: idx,
        element: (currentViz as any).getElementByIndex(idx),
      })
    }
  }

  /**
   * 获取当前模式的可视化器
   */
  private getCurrentVisualizer(): TextVisualizer | TableVisualizer | LayoutVisualizer {
    switch (this.mode) {
      case "table":
        return this.tableVisualizer
      case "layout":
        return this.layoutVisualizer
      default:
        return this.textVisualizer
    }
  }

  /**
   * 根据坐标查找元素索引
   */
  private findIndexAt(x: number, y: number): number {
    const currentViz = this.getCurrentVisualizer()
    return (currentViz as any).findIndexAt(x, y)
  }

  // ==================== 事件处理 ====================

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    this.canvas.addEventListener("mousemove", this.handleMouseMove.bind(this))

    this.canvas.addEventListener("click", this.handleClick.bind(this))

    this.canvas.addEventListener("mouseleave", () => {
      const currentViz = this.getCurrentVisualizer()
      ;(currentViz as any)["highlightedIndex"] = -1
      this.render()
    })

    this.setupTouchEvents()
  }

  /**
   * 鼠标移动
   */
  private handleMouseMove(event: MouseEvent): void {
    if (!this.result) return

    const rect = this.canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    const index = this.findIndexAt(x, y)
    const currentViz = this.getCurrentVisualizer()
    const prevIndex = (currentViz as any)["highlightedIndex"]

    if (index !== prevIndex) {
      ;(currentViz as any)["highlightedIndex"] = index
      this.render()

      if (index !== -1) {
        if (this.accessibilityManager) {
          const desc = (currentViz as any).getAccessibilityText(index)
          this.accessibilityManager.updateHighlightInfo(desc)
        }
        this.triggerEvent("hover", {
          index,
          element: (currentViz as any).getElementByIndex(index),
        })
      } else {
        this.triggerEvent("hover", { index: -1, element: null })
      }
    }
  }

  /**
   * 点击
   */
  private handleClick(_event: MouseEvent): void {
    const currentViz = this.getCurrentVisualizer()
    const idx = (currentViz as any)["highlightedIndex"]

    if (idx !== -1) {
      this.triggerEvent("click", {
        index: idx,
        element: (currentViz as any).getElementByIndex(idx),
      })
    }
  }

  // ==================== 触控支持 ====================

  private touchStartX: number = 0
  private touchStartY: number = 0
  private isTouching: boolean = false

  private setupTouchEvents(): void {
    this.canvas.addEventListener(
      "touchstart",
      this.handleTouchStart.bind(this),
      { passive: false }
    )
    this.canvas.addEventListener("touchmove", this.handleTouchMove.bind(this), {
      passive: false,
    })
    this.canvas.addEventListener("touchend", this.handleTouchEnd.bind(this), {
      passive: false,
    })
  }

  private handleTouchStart(event: TouchEvent): void {
    if (event.touches.length !== 1) return
    event.preventDefault()

    const touch = event.touches[0]
    this.touchStartX = touch.clientX
    this.touchStartY = touch.clientY
    this.isTouching = true

    const rect = this.canvas.getBoundingClientRect()
    const x = touch.clientX - rect.left
    const y = touch.clientY - rect.top

    this.updateTouchHighlight(x, y)
  }

  private handleTouchMove(event: TouchEvent): void {
    if (!this.isTouching || event.touches.length !== 1) return
    event.preventDefault()

    const touch = event.touches[0]
    const rect = this.canvas.getBoundingClientRect()
    const x = touch.clientX - rect.left
    const y = touch.clientY - rect.top

    this.updateTouchHighlight(x, y)
  }

  private handleTouchEnd(event: TouchEvent): void {
    event.preventDefault()

    const currentViz = this.getCurrentVisualizer()
    const idx = (currentViz as any)["highlightedIndex"]

    if (idx !== -1) {
      this.triggerEvent("click", {
        index: idx,
        element: (currentViz as any).getElementByIndex(idx),
      })
    }

    this.isTouching = false
  }

  private updateTouchHighlight(x: number, y: number): void {
    if (!this.result) return

    const index = this.findIndexAt(x, y)
    const currentViz = this.getCurrentVisualizer()
    const prevIndex = (currentViz as any)["highlightedIndex"]

    if (index !== prevIndex) {
      ;(currentViz as any)["highlightedIndex"] = index
      this.render()

      if (index !== -1) {
        if (this.accessibilityManager) {
          const desc = (currentViz as any).getAccessibilityText(index)
          this.accessibilityManager.updateHighlightInfo(desc)
        }
        this.triggerEvent("hover", {
          index,
          element: (currentViz as any).getElementByIndex(index),
        })
      }
    }
  }

  // ==================== 画布管理 ====================

  private resizeCanvas(): void {
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

  private setupResizeObserver(container: HTMLElement): void {
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

  // ==================== 主题 ====================

  private applyTheme(theme: string): void {
    if (theme === "default") return
    const presets: Record<string, Partial<VisualizerOptions>> = {
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
    const preset = presets[theme]
    if (preset) {
      Object.assign(this.options, preset)
    }
  }

  // ==================== 事件系统（兼容旧 API） ====================

  public addEventListener(event: string, listener: EventListener): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event)!.push(listener)
  }

  public removeEventListener(event: string, listener: EventListener): void {
    if (!this.listeners.has(event)) return
    const list = this.listeners.get(event)!
    const idx = list.indexOf(listener)
    if (idx !== -1) list.splice(idx, 1)
  }

  private triggerEvent(event: string, data?: any): void {
    if (!this.listeners.has(event)) return
    const customEvent = new CustomEvent(event, { detail: data })
    this.listeners.get(event)!.forEach((l) => l(customEvent))
  }

  // ==================== 公共方法 ====================

  /**
   * 更新可视化选项
   */
  public updateOptions(options: Partial<VisualizerOptions>): void {
    this.options = { ...this.options, ...options }
    // 同步到子可视化器
    this.textVisualizer.updateOptions(options)
    this.tableVisualizer.updateOptions(options)
    this.layoutVisualizer.updateOptions(options)
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
    this.result = null
    this.textVisualizer["highlightedIndex"] = -1
    this.tableVisualizer["highlightedIndex"] = -1
    this.layoutVisualizer["highlightedIndex"] = -1
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
  }

  /**
   * 销毁组件
   */
  public dispose(): void {
    // 销毁子可视化器
    this.textVisualizer.dispose()
    this.tableVisualizer.dispose()
    this.layoutVisualizer.dispose()

    // 销毁无障碍管理器
    this.accessibilityManager?.dispose()

    // 移除画布
    if (this.canvas.parentElement) {
      this.canvas.parentElement.removeChild(this.canvas)
    }

    this.image = null
    this.result = null
    this.listeners.clear()
  }

  /**
   * 导出为无障碍文本
   */
  public exportAccessibleText(): string {
    if (!this.result) return "无OCR识别结果"
    if (this.accessibilityManager) {
      return this.accessibilityManager.exportAccessibleText(
        this.result,
        this.mode
      )
    }
    return "无OCR识别结果"
  }
}
