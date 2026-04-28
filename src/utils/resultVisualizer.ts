import {
  OCRResult,
  TextBox,
  TableResult,
  LayoutResult,
  Point,
} from "../typings"
import * as Config from "../core/Constants"

/**
 * OCR结果可视化组件
 * 用于在浏览器环境中可视化展示OCR识别结果
 */
export class ResultVisualizer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private image: HTMLImageElement | HTMLCanvasElement | null = null
  private result: OCRResult | TableResult | LayoutResult | null = null
  private options: VisualizerOptions
  private highlightedIndex: number = -1
  private mode: "text" | "table" | "layout" = "text"
  private listeners: Map<string, EventListener[]> = new Map()
  private accessibilityContainer: HTMLDivElement | null = null
  private ariaLive: HTMLDivElement | null = null

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
      boxColor: Config.VISUALIZATION_COLORS.TEXT_BOX,
      textColor: "#FFFFFF",
      backgroundColor: "rgba(0, 0, 0, 0.7)",
      fontSize: 14,
      padding: 8,
      showConfidence: true,
      showBoxId: true,
      interactive: true,
      autoResize: true,
      highlightColor: Config.VISUALIZATION_COLORS.HIGHLIGHT,
      lineWidth: 2,
      enableAccessibility: true,
      theme: Config.THEMES.DEFAULT,
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

    // 创建画布
    this.canvas = document.createElement("canvas")
    this.canvas.width = this.options.width
    this.canvas.height = this.options.height
    this.canvas.style.maxWidth = "100%"

    // 添加无障碍属性
    this.canvas.setAttribute("role", "img")
    this.canvas.setAttribute("aria-label", "OCR识别结果可视化")
    this.canvas.tabIndex = 0 // 使画布可获取焦点

    const ctx = this.canvas.getContext("2d")
    if (!ctx) {
      throw new Error("无法创建2D渲染上下文")
    }
    this.ctx = ctx

    // 添加到容器
    containerElement.appendChild(this.canvas)

    // 设置无障碍支持
    if (this.options.enableAccessibility) {
      this.setupAccessibility(containerElement)
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
    this.applyTheme(this.options.theme || Config.THEMES.DEFAULT)
  }

  /**
   * 设置无障碍支持
   * @param container 容器元素
   */
  private setupAccessibility(container: HTMLElement): void {
    // 创建无障碍容器
    this.accessibilityContainer = document.createElement("div")
    this.accessibilityContainer.className = "paddleocr-accessibility"
    this.accessibilityContainer.setAttribute("role", "region")
    this.accessibilityContainer.setAttribute("aria-label", "OCR识别结果文本")
    this.accessibilityContainer.style.position = "absolute"
    this.accessibilityContainer.style.width = "1px"
    this.accessibilityContainer.style.height = "1px"
    this.accessibilityContainer.style.overflow = "hidden"
    this.accessibilityContainer.style.clip = "rect(0, 0, 0, 0)"

    // 创建实时区域
    this.ariaLive = document.createElement("div")
    this.ariaLive.setAttribute("aria-live", "polite")
    this.ariaLive.setAttribute("aria-atomic", "true")
    this.accessibilityContainer.appendChild(this.ariaLive)

    // 添加到容器
    container.appendChild(this.accessibilityContainer)

    // 设置键盘导航
    this.canvas.addEventListener("keydown", this.handleKeyDown.bind(this))
  }

  /**
   * 处理键盘事件
   */
  private handleKeyDown(event: KeyboardEvent): void {
    if (!this.result) {
      return
    }

    // 左右方向键导航
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault()
      this.navigateResults(1)
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault()
      this.navigateResults(-1)
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      if (this.highlightedIndex !== -1) {
        this.triggerEvent("click", {
          index: this.highlightedIndex,
          element: this.getElementByIndex(this.highlightedIndex),
        })
      }
    }
  }

  /**
   * 结果导航
   */
  private navigateResults(direction: number): void {
    let maxIndex = 0

    if (this.mode === "text" && "textDetection" in this.result!) {
      maxIndex = (this.result as OCRResult).textDetection.length - 1
    } else if (this.mode === "table" && "cells" in this.result!) {
      maxIndex = (this.result as TableResult).cells.length - 1
    } else if (this.mode === "layout" && "regions" in this.result!) {
      maxIndex = (this.result as LayoutResult).regions.length - 1
    }

    if (maxIndex < 0) return

    // 计算新的索引
    let newIndex = this.highlightedIndex + direction

    // 边界检查
    if (newIndex < 0) {
      newIndex = maxIndex
    } else if (newIndex > maxIndex) {
      newIndex = 0
    }

    // 更新高亮
    this.highlightedIndex = newIndex
    this.render()

    // 更新无障碍提示
    this.updateAccessibilityInfo()

    // 触发hover事件
    this.triggerEvent("hover", {
      index: this.highlightedIndex,
      element: this.getElementByIndex(this.highlightedIndex),
    })
  }

  /**
   * 更新无障碍信息
   */
  private updateAccessibilityInfo(): void {
    if (!this.ariaLive || this.highlightedIndex === -1) {
      return
    }

    const element = this.getElementByIndex(this.highlightedIndex)
    let description = ""

    if (this.mode === "text" && element) {
      const { recognition } = element
      if (recognition) {
        description = `文本 ${this.highlightedIndex + 1}: ${
          recognition.text
        }, 置信度: ${(recognition.score * 100).toFixed(1)}%`
      }
    } else if (this.mode === "table" && element) {
      description = `单元格 ${this.highlightedIndex + 1}: 第${
        element.row + 1
      }行第${element.col + 1}列, 内容: ${element.text}`
    } else if (this.mode === "layout" && element) {
      description = `区域 ${this.highlightedIndex + 1}: 类型: ${
        element.type
      }, 置信度: ${(element.score * 100).toFixed(1)}%`
      if (typeof element.content === "string") {
        description += `, 内容: ${element.content}`
      }
    }

    this.ariaLive.textContent = description

    // 更新画布的aria-label
    this.canvas.setAttribute(
      "aria-label",
      `OCR识别结果可视化, 当前选中: ${description}`
    )
  }

  /**
   * 应用主题
   */
  private applyTheme(theme: string): void {
    if (theme === "default") {
      return // 默认主题已经在构造函数中设置
    }

    switch (theme) {
      case "dark":
        this.options.boxColor = "rgba(0, 200, 255, 0.6)"
        this.options.textColor = "#FFFFFF"
        this.options.backgroundColor = "rgba(0, 0, 0, 0.8)"
        this.options.highlightColor = "rgba(255, 150, 0, 0.7)"
        break
      case "light":
        this.options.boxColor = Config.VISUALIZATION_COLORS.TEXT_BOX
        this.options.textColor = "#000000"
        this.options.backgroundColor = "rgba(255, 255, 255, 0.8)"
        this.options.highlightColor = "rgba(255, 200, 0, 0.6)"
        break
      case "highContrast":
        this.options.boxColor = "rgba(255, 255, 0, 0.8)"
        this.options.textColor = "#FFFFFF"
        this.options.backgroundColor = "#000000"
        this.options.highlightColor = "#FF0000"
        this.options.lineWidth = 3
        break
    }
  }

  /**
   * 设置可视化模式
   * @param mode 模式：text, table 或 layout
   */
  public setMode(mode: "text" | "table" | "layout"): void {
    this.mode = mode
    this.highlightedIndex = -1
    this.render()

    // 更新无障碍标签
    if (this.options.enableAccessibility) {
      this.canvas.setAttribute(
        "aria-label",
        `OCR${
          mode === "text" ? "文本" : mode === "table" ? "表格" : "版面"
        }识别结果可视化`
      )
      this.updateAccessibilityInfo()
    }
  }

  /**
   * 加载图像
   * @param image 图像源
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
   * 设置OCR结果
   * @param result OCR结果
   */
  public setResult(result: OCRResult | TableResult | LayoutResult): void {
    this.result = result
    this.highlightedIndex = -1
    this.render()

    // 更新无障碍信息
    if (this.options.enableAccessibility && this.accessibilityContainer) {
      let summaryText = "OCR识别结果: "

      if ("textDetection" in result && "textRecognition" in result) {
        summaryText += `检测到${result.textDetection.length}个文本区域，识别出${result.textRecognition.length}行文本内容。`

        // 创建文本摘要
        if (this.accessibilityContainer) {
          const textSummary = document.createElement("div")
          textSummary.setAttribute("role", "list")
          textSummary.setAttribute("aria-label", "识别出的文本内容")

          result.textRecognition.forEach((item, index) => {
            const textItem = document.createElement("div")
            textItem.setAttribute("role", "listitem")
            textItem.textContent = `${index + 1}. ${item.text}`
            textSummary.appendChild(textItem)
          })

          // 清空并更新无障碍容器
          while (this.accessibilityContainer.firstChild) {
            this.accessibilityContainer.removeChild(
              this.accessibilityContainer.firstChild
            )
          }

          this.accessibilityContainer.appendChild(textSummary)
          this.ariaLive = document.createElement("div")
          this.ariaLive.setAttribute("aria-live", "polite")
          this.ariaLive.setAttribute("aria-atomic", "true")
          this.accessibilityContainer.appendChild(this.ariaLive)
        }
      } else if ("cells" in result) {
        summaryText += `识别出${result.cells.length}个表格单元格。`
      } else if ("regions" in result) {
        summaryText += `检测到${result.regions.length}个版面区域。`
      }

      if (this.ariaLive) {
        this.ariaLive.textContent = summaryText
      }
    }
  }

  /**
   * 更新可视化选项
   * @param options 可视化选项
   */
  public updateOptions(options: Partial<VisualizerOptions>): void {
    this.options = { ...this.options, ...options }
    this.render()
  }

  /**
   * 渲染可视化结果
   */
  public render(): void {
    if (!this.image) {
      return
    }

    const { width, height } = this.canvas

    // 清除画布
    this.ctx.clearRect(0, 0, width, height)

    // 绘制图像
    this.ctx.drawImage(this.image, 0, 0, width, height)

    // 根据模式渲染不同类型的结果
    if (this.result) {
      if (this.mode === "text" && "textDetection" in this.result) {
        this.renderTextResult(this.result as OCRResult)
      } else if (this.mode === "table" && "cells" in this.result) {
        this.renderTableResult(this.result as TableResult)
      } else if (this.mode === "layout" && "regions" in this.result) {
        this.renderLayoutResult(this.result as LayoutResult)
      }
    }

    // 触发渲染完成事件
    this.triggerEvent("render")
  }

  /**
   * 渲染OCR文本结果
   * @param result OCR结果
   */
  private renderTextResult(result: OCRResult): void {
    const { textDetection, textRecognition } = result
    const { width, height } = this.canvas
    const scaleX = width / (this.image as HTMLImageElement).naturalWidth
    const scaleY = height / (this.image as HTMLImageElement).naturalHeight

    // 绘制文本框和文本
    textDetection.forEach((box, index) => {
      const isHighlighted = index === this.highlightedIndex
      // 查找对应的识别结果
      const recognitionResult = textRecognition.find(
        (t) => t.box && t.box.id === box.id
      )

      // 绘制框
      this.ctx.strokeStyle = isHighlighted
        ? this.options.highlightColor
        : this.options.boxColor
      this.ctx.lineWidth = this.options.lineWidth
      this.ctx.beginPath()

      // 缩放点坐标
      const scaledPoints = box.box.map((point) => ({
        x: point.x * scaleX,
        y: point.y * scaleY,
      }))

      // 绘制多边形
      this.ctx.moveTo(scaledPoints[0].x, scaledPoints[0].y)
      for (let i = 1; i < scaledPoints.length; i++) {
        this.ctx.lineTo(scaledPoints[i].x, scaledPoints[i].y)
      }
      this.ctx.closePath()
      this.ctx.stroke()

      // 绘制文字
      if (recognitionResult) {
        const textX = Math.min(...scaledPoints.map((p) => p.x))
        const textY = Math.min(...scaledPoints.map((p) => p.y))

        // 绘制文本背景
        this.ctx.fillStyle = this.options.backgroundColor
        const textContent = recognitionResult.text
        const textWidth =
          this.ctx.measureText(textContent).width + this.options.padding * 2
        const textHeight = this.options.fontSize + this.options.padding * 2
        this.ctx.fillRect(textX, textY - textHeight, textWidth, textHeight)

        // 绘制文本
        this.ctx.fillStyle = this.options.textColor
        this.ctx.font = `${this.options.fontSize}px Arial`
        this.ctx.fillText(
          textContent,
          textX + this.options.padding,
          textY - this.options.padding
        )

        // 绘制置信度
        if (this.options.showConfidence) {
          const confidenceText = `${(recognitionResult.score * 100).toFixed(
            1
          )}%`
          this.ctx.fillText(
            confidenceText,
            textX + textWidth + 5,
            textY - this.options.padding
          )
        }

        // 绘制框ID
        if (this.options.showBoxId) {
          this.ctx.fillText(`#${box.id}`, textX - 5, textY - textHeight - 5)
        }
      }
    })
  }

  /**
   * 渲染表格结果
   * @param result 表格结果
   */
  private renderTableResult(result: TableResult): void {
    const { cells } = result
    const { width, height } = this.canvas
    const scaleX = width / (this.image as HTMLImageElement).naturalWidth
    const scaleY = height / (this.image as HTMLImageElement).naturalHeight

    // 绘制单元格
    cells.forEach((cell, index) => {
      const isHighlighted = index === this.highlightedIndex

      // 绘制单元格框
      this.ctx.strokeStyle = isHighlighted
        ? this.options.highlightColor
        : this.options.boxColor
      this.ctx.lineWidth = this.options.lineWidth
      this.ctx.beginPath()

      // 缩放点坐标
      const scaledPoints = cell.box.map((point) => ({
        x: point.x * scaleX,
        y: point.y * scaleY,
      }))

      // 绘制多边形
      this.ctx.moveTo(scaledPoints[0].x, scaledPoints[0].y)
      for (let i = 1; i < scaledPoints.length; i++) {
        this.ctx.lineTo(scaledPoints[i].x, scaledPoints[i].y)
      }
      this.ctx.closePath()
      this.ctx.stroke()

      // 绘制单元格内容
      const textX = Math.min(...scaledPoints.map((p) => p.x))
      const textY = Math.min(...scaledPoints.map((p) => p.y))

      // 绘制文本背景
      this.ctx.fillStyle = this.options.backgroundColor
      const textWidth =
        this.ctx.measureText(cell.text).width + this.options.padding * 2
      const textHeight = this.options.fontSize + this.options.padding * 2
      this.ctx.fillRect(textX, textY - textHeight, textWidth, textHeight)

      // 绘制文本
      this.ctx.fillStyle = this.options.textColor
      this.ctx.font = `${this.options.fontSize}px Arial`
      this.ctx.fillText(
        cell.text,
        textX + this.options.padding,
        textY - this.options.padding
      )

      // 绘制单元格信息
      if (this.options.showBoxId) {
        this.ctx.fillText(
          `R${cell.row}C${cell.col}`,
          textX - 5,
          textY - textHeight - 5
        )
      }
    })
  }

  /**
   * 渲染版面分析结果
   * @param result 版面分析结果
   */
  private renderLayoutResult(result: LayoutResult): void {
    const { regions } = result
    const { width, height } = this.canvas
    const scaleX = width / (this.image as HTMLImageElement).naturalWidth
    const scaleY = height / (this.image as HTMLImageElement).naturalHeight

    // 绘制区域
    regions.forEach((region, index) => {
      const isHighlighted = index === this.highlightedIndex

      // 根据区域类型选择颜色
      let regionColor = this.options.boxColor
      switch (region.type) {
        case "text":
          regionColor = Config.VISUALIZATION_COLORS.TEXT_BOX
          break
        case "title":
          regionColor = Config.VISUALIZATION_COLORS.TABLE_BOX
          break
        case "figure":
          regionColor = Config.VISUALIZATION_COLORS.LAYOUT_REGION
          break
        case "table":
          regionColor = "rgba(255, 165, 0, 0.5)"
          break
        default:
          regionColor = "rgba(128, 128, 128, 0.5)"
      }

      // 绘制区域框
      this.ctx.strokeStyle = isHighlighted
        ? this.options.highlightColor
        : regionColor
      this.ctx.lineWidth = this.options.lineWidth
      this.ctx.beginPath()

      // 缩放点坐标
      const scaledPoints = region.box.map((point) => ({
        x: point.x * scaleX,
        y: point.y * scaleY,
      }))

      // 绘制多边形
      this.ctx.moveTo(scaledPoints[0].x, scaledPoints[0].y)
      for (let i = 1; i < scaledPoints.length; i++) {
        this.ctx.lineTo(scaledPoints[i].x, scaledPoints[i].y)
      }
      this.ctx.closePath()
      this.ctx.stroke()

      // 填充区域
      this.ctx.fillStyle = regionColor.replace("0.5", "0.2")
      this.ctx.fill()

      // 绘制区域类型
      const textX = Math.min(...scaledPoints.map((p) => p.x))
      const textY = Math.min(...scaledPoints.map((p) => p.y))

      // 绘制文本背景
      this.ctx.fillStyle = this.options.backgroundColor
      const textContent = region.type.toUpperCase()
      const textWidth =
        this.ctx.measureText(textContent).width + this.options.padding * 2
      const textHeight = this.options.fontSize + this.options.padding * 2
      this.ctx.fillRect(textX, textY - textHeight, textWidth, textHeight)

      // 绘制文本
      this.ctx.fillStyle = this.options.textColor
      this.ctx.font = `${this.options.fontSize}px Arial`
      this.ctx.fillText(
        textContent,
        textX + this.options.padding,
        textY - this.options.padding
      )

      // 绘制置信度
      if (this.options.showConfidence) {
        const confidenceText = `${(region.score * 100).toFixed(1)}%`
        this.ctx.fillText(
          confidenceText,
          textX + textWidth + 5,
          textY - this.options.padding
        )
      }
    })
  }

  /**
   * 调整画布大小
   */
  private resizeCanvas(): void {
    if (!this.image) {
      return
    }

    const imgWidth =
      this.image instanceof HTMLImageElement
        ? this.image.naturalWidth
        : this.image.width
    const imgHeight =
      this.image instanceof HTMLImageElement
        ? this.image.naturalHeight
        : this.image.height

    // 保持宽高比例
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
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    // 鼠标移动事件
    this.canvas.addEventListener("mousemove", this.handleMouseMove.bind(this))

    // 点击事件
    this.canvas.addEventListener("click", this.handleClick.bind(this))

    // 鼠标离开事件
    this.canvas.addEventListener("mouseleave", () => {
      this.highlightedIndex = -1
      this.render()
    })

    // 设置触控支持
    this.setupTouchEvents()
  }

  /**
   * 设置调整大小观察器
   */
  private setupResizeObserver(container: HTMLElement): void {
    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(() => {
        this.resizeCanvas()
        this.render()
      })
      observer.observe(container)
    } else {
      // 兼容性处理
      window.addEventListener("resize", () => {
        this.resizeCanvas()
        this.render()
      })
    }
  }

  /**
   * 处理鼠标移动事件
   */
  private handleMouseMove(event: MouseEvent): void {
    if (!this.result) {
      return
    }

    const rect = this.canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    // 根据模式查找鼠标指向的元素
    let index = -1

    if (this.mode === "text" && "textDetection" in this.result) {
      index = this.findElementIndex(
        x,
        y,
        (this.result as OCRResult).textDetection
      )
    } else if (this.mode === "table" && "cells" in this.result) {
      index = this.findCellIndex(x, y, (this.result as TableResult).cells)
    } else if (this.mode === "layout" && "regions" in this.result) {
      index = this.findRegionIndex(x, y, (this.result as LayoutResult).regions)
    }

    if (index !== this.highlightedIndex) {
      this.highlightedIndex = index
      this.render()

      if (index !== -1) {
        this.updateAccessibilityInfo()
        this.triggerEvent("hover", {
          index,
          element: this.getElementByIndex(index),
        })
      } else {
        this.triggerEvent("hover", { index: -1, element: null })
      }
    }
  }

  /**
   * 处理点击事件
   */
  private handleClick(event: MouseEvent): void {
    if (this.highlightedIndex !== -1) {
      this.triggerEvent("click", {
        index: this.highlightedIndex,
        element: this.getElementByIndex(this.highlightedIndex),
      })
    }
  }

  /**
   * 查找元素索引
   */
  private findElementIndex(x: number, y: number, elements: TextBox[]): number {
    const { width, height } = this.canvas
    const scaleX = width / (this.image as HTMLImageElement).naturalWidth
    const scaleY = height / (this.image as HTMLImageElement).naturalHeight

    for (let i = elements.length - 1; i >= 0; i--) {
      const box = elements[i].box
      const scaledPoints = box.map((point) => ({
        x: point.x * scaleX,
        y: point.y * scaleY,
      }))

      if (this.pointInPolygon(x, y, scaledPoints)) {
        return i
      }
    }

    return -1
  }

  /**
   * 查找单元格索引
   */
  private findCellIndex(
    x: number,
    y: number,
    cells: TableResult["cells"]
  ): number {
    const { width, height } = this.canvas
    const scaleX = width / (this.image as HTMLImageElement).naturalWidth
    const scaleY = height / (this.image as HTMLImageElement).naturalHeight

    for (let i = cells.length - 1; i >= 0; i--) {
      const box = cells[i].box
      const scaledPoints = box.map((point) => ({
        x: point.x * scaleX,
        y: point.y * scaleY,
      }))

      if (this.pointInPolygon(x, y, scaledPoints)) {
        return i
      }
    }

    return -1
  }

  /**
   * 查找区域索引
   */
  private findRegionIndex(
    x: number,
    y: number,
    regions: LayoutResult["regions"]
  ): number {
    const { width, height } = this.canvas
    const scaleX = width / (this.image as HTMLImageElement).naturalWidth
    const scaleY = height / (this.image as HTMLImageElement).naturalHeight

    for (let i = regions.length - 1; i >= 0; i--) {
      const box = regions[i].box
      const scaledPoints = box.map((point) => ({
        x: point.x * scaleX,
        y: point.y * scaleY,
      }))

      if (this.pointInPolygon(x, y, scaledPoints)) {
        return i
      }
    }

    return -1
  }

  /**
   * 判断点是否在多边形内
   */
  private pointInPolygon(x: number, y: number, polygon: Point[]): boolean {
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
   * 根据索引获取元素
   */
  private getElementByIndex(index: number): any {
    if (index === -1) {
      return null
    }

    if (this.mode === "text" && "textDetection" in this.result!) {
      const detection = (this.result as OCRResult).textDetection[index]
      const recognition = (this.result as OCRResult).textRecognition.find(
        (t) => t.box && t.box.id === detection.id
      )
      return { detection, recognition }
    } else if (this.mode === "table" && "cells" in this.result!) {
      return (this.result as TableResult).cells[index]
    } else if (this.mode === "layout" && "regions" in this.result!) {
      return (this.result as LayoutResult).regions[index]
    }

    return null
  }

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
    if (!this.listeners.has(event)) {
      return
    }

    const listeners = this.listeners.get(event)!
    const index = listeners.indexOf(listener)

    if (index !== -1) {
      listeners.splice(index, 1)
    }
  }

  /**
   * 触发事件
   */
  private triggerEvent(event: string, data?: any): void {
    if (!this.listeners.has(event)) {
      return
    }

    const listeners = this.listeners.get(event)!
    const customEvent = new CustomEvent(event, { detail: data })

    listeners.forEach((listener) => {
      listener(customEvent)
    })
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
    this.highlightedIndex = -1
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
  }

  /**
   * 销毁组件
   */
  public dispose(): void {
    // 移除事件监听器
    if (this.options.interactive) {
      this.canvas.removeEventListener(
        "mousemove",
        this.handleMouseMove.bind(this)
      )
      this.canvas.removeEventListener("click", this.handleClick.bind(this))
      this.canvas.removeEventListener("keydown", this.handleKeyDown.bind(this))
      this.canvas.removeEventListener(
        "touchstart",
        this.handleTouchStart.bind(this)
      )
      this.canvas.removeEventListener(
        "touchmove",
        this.handleTouchMove.bind(this)
      )
      this.canvas.removeEventListener(
        "touchend",
        this.handleTouchEnd.bind(this)
      )
    }

    // 移除画布
    if (this.canvas.parentElement) {
      this.canvas.parentElement.removeChild(this.canvas)
    }

    // 移除无障碍容器
    if (
      this.accessibilityContainer &&
      this.accessibilityContainer.parentElement
    ) {
      this.accessibilityContainer.parentElement.removeChild(
        this.accessibilityContainer
      )
    }

    // 清除引用
    this.image = null
    this.result = null
    this.listeners.clear()
    this.accessibilityContainer = null
    this.ariaLive = null
  }

  /**
   * 设置触控支持
   */
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

  private touchStartX: number = 0
  private touchStartY: number = 0
  private isTouching: boolean = false

  /**
   * 处理触摸开始事件
   */
  private handleTouchStart(event: TouchEvent): void {
    if (event.touches.length !== 1) return

    event.preventDefault()
    const touch = event.touches[0]
    this.touchStartX = touch.clientX
    this.touchStartY = touch.clientY
    this.isTouching = true

    // 检测触摸位置是否在元素上
    const rect = this.canvas.getBoundingClientRect()
    const x = touch.clientX - rect.left
    const y = touch.clientY - rect.top

    let index = -1

    if (this.mode === "text" && "textDetection" in this.result!) {
      index = this.findElementIndex(
        x,
        y,
        (this.result as OCRResult).textDetection
      )
    } else if (this.mode === "table" && "cells" in this.result!) {
      index = this.findCellIndex(x, y, (this.result as TableResult).cells)
    } else if (this.mode === "layout" && "regions" in this.result!) {
      index = this.findRegionIndex(x, y, (this.result as LayoutResult).regions)
    }

    if (index !== this.highlightedIndex) {
      this.highlightedIndex = index
      this.render()

      if (index !== -1) {
        this.updateAccessibilityInfo()
        this.triggerEvent("hover", {
          index,
          element: this.getElementByIndex(index),
        })
      }
    }
  }

  /**
   * 处理触摸移动事件
   */
  private handleTouchMove(event: TouchEvent): void {
    if (!this.isTouching || event.touches.length !== 1) return

    event.preventDefault()
    const touch = event.touches[0]

    // 检测触摸位置是否在元素上
    const rect = this.canvas.getBoundingClientRect()
    const x = touch.clientX - rect.left
    const y = touch.clientY - rect.top

    let index = -1

    if (this.mode === "text" && "textDetection" in this.result!) {
      index = this.findElementIndex(
        x,
        y,
        (this.result as OCRResult).textDetection
      )
    } else if (this.mode === "table" && "cells" in this.result!) {
      index = this.findCellIndex(x, y, (this.result as TableResult).cells)
    } else if (this.mode === "layout" && "regions" in this.result!) {
      index = this.findRegionIndex(x, y, (this.result as LayoutResult).regions)
    }

    if (index !== this.highlightedIndex) {
      this.highlightedIndex = index
      this.render()

      if (index !== -1) {
        this.updateAccessibilityInfo()
        this.triggerEvent("hover", {
          index,
          element: this.getElementByIndex(index),
        })
      }
    }
  }

  /**
   * 处理触摸结束事件
   */
  private handleTouchEnd(event: TouchEvent): void {
    event.preventDefault()

    if (this.highlightedIndex !== -1) {
      this.triggerEvent("click", {
        index: this.highlightedIndex,
        element: this.getElementByIndex(this.highlightedIndex),
      })
    }

    this.isTouching = false
  }

  /**
   * 导出为无障碍文本
   */
  public exportAccessibleText(): string {
    if (!this.result) {
      return "无OCR识别结果"
    }

    let textContent = ""

    if (this.mode === "text" && "textRecognition" in this.result) {
      textContent =
        "文本识别结果:\n" +
        (this.result as OCRResult).textRecognition
          .map(
            (line, index) =>
              `${index + 1}. ${line.text} (置信度: ${(line.score * 100).toFixed(
                1
              )}%)`
          )
          .join("\n")
    } else if (this.mode === "table" && "cells" in this.result) {
      textContent = "表格识别结果:\n"

      const table = this.result as TableResult
      let currentRow = -1

      table.cells.forEach((cell) => {
        if (cell.row > currentRow) {
          if (currentRow >= 0) {
            textContent += "\n"
          }
          currentRow = cell.row
          textContent += `第 ${currentRow + 1} 行: `
        } else {
          textContent += " | "
        }

        textContent += cell.text
      })

      if (table.html) {
        textContent += "\n\n表格HTML:\n" + table.html
      }
    } else if (this.mode === "layout" && "regions" in this.result) {
      textContent =
        "版面分析结果:\n" +
        (this.result as LayoutResult).regions
          .map((region, index) => {
            let regionText = `${index + 1}. 类型: ${region.type}, 置信度: ${(
              region.score * 100
            ).toFixed(1)}%`
            if (typeof region.content === "string") {
              regionText += `, 内容: ${region.content}`
            }
            return regionText
          })
          .join("\n")
    }

    return textContent
  }
}

/**
 * 可视化选项接口
 */
export interface VisualizerOptions {
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

// 简化版可视化组件 - 轻量级
export class LightVisualizer {
  private container: HTMLElement
  private options: Partial<VisualizerOptions>

  constructor(container: string | HTMLElement, options?: Partial<VisualizerOptions>) {
    this.container = typeof container === "string" 
      ? document.getElementById(container)! 
      : container
    this.options = options || {}
  }

  render(result: OCRResult | TableResult | LayoutResult): void {
    // 简单渲染实现
    const div = document.createElement("div")
    div.className = "paddleocr-light-result"
    div.textContent = JSON.stringify(result, null, 2)
    this.container.innerHTML = ""
    this.container.appendChild(div)
  }

  clear(): void {
    this.container.innerHTML = ""
  }
}

