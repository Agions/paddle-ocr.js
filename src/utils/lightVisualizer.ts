import {
  OCRResult,
  TextBox,
  TableResult,
  LayoutResult,
  Point,
} from "../typings"

/**
 * 轻量级OCR结果可视化组件
 * 适用于移动设备和性能受限的环境
 */
export class LightVisualizer {
  private container: HTMLElement
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private image: HTMLImageElement | HTMLCanvasElement | null = null
  private result: OCRResult | TableResult | LayoutResult | null = null
  private options: LightVisualizerOptions
  private selectedId: number = -1
  private mode: "text" | "table" | "layout" = "text"
  private isReady: boolean = false
  private maxBoxesToRender: number = 50 // 最大渲染框数量，提高性能

  /**
   * 创建轻量级OCR结果可视化组件
   * @param container 容器元素或其ID
   * @param options 可视化选项
   */
  constructor(
    container: string | HTMLElement,
    options: Partial<LightVisualizerOptions> = {}
  ) {
    // 默认选项
    const defaultOptions: LightVisualizerOptions = {
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

    this.options = { ...defaultOptions, ...options }

    // 获取容器元素
    const containerEl =
      typeof container === "string"
        ? document.getElementById(container)
        : container

    if (!containerEl) {
      throw new Error("容器元素不存在")
    }

    this.container = containerEl

    // 创建画布
    this.canvas = document.createElement("canvas")
    this.canvas.width = this.options.width
    this.canvas.height = this.options.height
    this.canvas.style.width = "100%"
    this.canvas.style.maxWidth = "100%"

    // 无障碍属性
    this.canvas.setAttribute("role", "img")
    this.canvas.setAttribute("aria-label", "OCR识别结果简易可视化")

    const ctx = this.canvas.getContext("2d", {
      alpha: true,
      desynchronized: true, // 启用非同步渲染，提高性能
    })

    if (!ctx) {
      throw new Error("无法创建2D渲染上下文")
    }
    this.ctx = ctx

    // 添加到容器
    containerEl.appendChild(this.canvas)

    // 设置事件监听
    if (!this.options.optimizeForMobile) {
      this.canvas.addEventListener("click", this.handleClick.bind(this))
    } else {
      this.setupTouchEvents()
    }

    // 设置响应式支持
    if (this.options.responsive) {
      this.setupResizeHandler()
    }

    // 创建结果列表视图（如果需要）
    if (this.options.renderMode === "list") {
      this.createResultListView()
    }
  }

  /**
   * 创建结果列表视图
   */
  private createResultListView(): void {
    const listContainer = document.createElement("div")
    listContainer.className = "paddleocr-result-list"
    listContainer.style.marginTop = "10px"
    listContainer.style.maxHeight = "200px"
    listContainer.style.overflowY = "auto"
    listContainer.style.fontSize = `${this.options.fontSize}px`
    listContainer.style.border = "1px solid #eee"
    listContainer.style.borderRadius = "4px"

    this.container.appendChild(listContainer)
  }

  /**
   * 更新结果列表视图
   */
  private updateResultListView(): void {
    if (this.options.renderMode !== "list" || !this.result) return

    const listContainer = this.container.querySelector(".paddleocr-result-list")
    if (!listContainer) return

    // 清空列表
    listContainer.innerHTML = ""

    // 添加结果项
    if (this.mode === "text" && "textRecognition" in this.result) {
      const items = this.result.textRecognition.slice(0, this.maxBoxesToRender)

      items.forEach((item, index) => {
        const listItem = document.createElement("div")
        listItem.className = "paddleocr-result-item"
        listItem.style.padding = "5px 8px"
        listItem.style.borderBottom = "1px solid #eee"
        listItem.style.cursor = "pointer"

        if (index === this.selectedId) {
          listItem.style.backgroundColor = "#f0f7ff"
          listItem.style.fontWeight = "bold"
        }

        listItem.textContent = item.text

        // 添加点击事件
        listItem.addEventListener("click", () => {
          this.selectedId = index
          this.render()
          this.updateResultListView()
        })

        listContainer.appendChild(listItem)
      })
    } else if (this.mode === "table" && "cells" in this.result) {
      const items = this.result.cells.slice(0, this.maxBoxesToRender)

      items.forEach((cell, index) => {
        const listItem = document.createElement("div")
        listItem.className = "paddleocr-result-item"
        listItem.style.padding = "5px 8px"
        listItem.style.borderBottom = "1px solid #eee"
        listItem.style.cursor = "pointer"

        if (index === this.selectedId) {
          listItem.style.backgroundColor = "#f0f7ff"
          listItem.style.fontWeight = "bold"
        }

        listItem.textContent = `R${cell.row}C${cell.col}: ${cell.text}`

        // 添加点击事件
        listItem.addEventListener("click", () => {
          this.selectedId = index
          this.render()
          this.updateResultListView()
        })

        listContainer.appendChild(listItem)
      })
    } else if (this.mode === "layout" && "regions" in this.result) {
      const items = this.result.regions.slice(0, this.maxBoxesToRender)

      items.forEach((region, index) => {
        const listItem = document.createElement("div")
        listItem.className = "paddleocr-result-item"
        listItem.style.padding = "5px 8px"
        listItem.style.borderBottom = "1px solid #eee"
        listItem.style.cursor = "pointer"

        if (index === this.selectedId) {
          listItem.style.backgroundColor = "#f0f7ff"
          listItem.style.fontWeight = "bold"
        }

        listItem.textContent = `${region.type.toUpperCase()}`
        if (typeof region.content === "string") {
          listItem.textContent += `: ${region.content.slice(0, 30)}${
            region.content.length > 30 ? "..." : ""
          }`
        }

        // 添加点击事件
        listItem.addEventListener("click", () => {
          this.selectedId = index
          this.render()
          this.updateResultListView()
        })

        listContainer.appendChild(listItem)
      })
    }
  }

  /**
   * 设置触控事件
   */
  private setupTouchEvents(): void {
    this.canvas.addEventListener(
      "touchstart",
      this.handleTouchStart.bind(this),
      { passive: true }
    )
    this.canvas.addEventListener("touchend", this.handleTouchEnd.bind(this), {
      passive: true,
    })
  }

  private lastTouchTime: number = 0
  private lastTouchX: number = 0
  private lastTouchY: number = 0

  /**
   * 处理触摸开始事件
   */
  private handleTouchStart(event: TouchEvent): void {
    if (event.touches.length !== 1) return

    const touch = event.touches[0]
    this.lastTouchX = touch.clientX
    this.lastTouchY = touch.clientY
    this.lastTouchTime = Date.now()
  }

  /**
   * 处理触摸结束事件
   */
  private handleTouchEnd(event: TouchEvent): void {
    // 检查是否为简单点击（防止滚动误触）
    const timeDiff = Date.now() - this.lastTouchTime

    if (timeDiff < 300) {
      const touch = event.changedTouches[0]
      const rect = this.canvas.getBoundingClientRect()
      const x = touch.clientX - rect.left
      const y = touch.clientY - rect.top

      this.handleTap(x, y)
    }
  }

  /**
   * 处理点击或轻触
   */
  private handleTap(x: number, y: number): void {
    if (!this.result || !this.isReady) return

    let id = -1

    if (this.mode === "text" && "textDetection" in this.result) {
      const boxes = this.result.textDetection.slice(0, this.maxBoxesToRender)
      id = this.findBoxAtPosition(x, y, boxes)
    } else if (this.mode === "table" && "cells" in this.result) {
      const cells = this.result.cells.slice(0, this.maxBoxesToRender)
      id = this.findBoxAtPosition(x, y, cells)
    } else if (this.mode === "layout" && "regions" in this.result) {
      const regions = this.result.regions.slice(0, this.maxBoxesToRender)
      id = this.findBoxAtPosition(x, y, regions)
    }

    if (id >= 0) {
      this.selectedId = id
      this.render()
      this.updateResultListView()

      // 触发选择事件
      if (typeof this.options.onSelect === "function") {
        let selectedItem: any = null

        if (this.mode === "text" && "textDetection" in this.result) {
          const box = this.result.textDetection[id]
          const text = this.result.textRecognition.find(
            (t) => t.box && t.box.id === box.id
          )
          selectedItem = { box, text }
        } else if (this.mode === "table" && "cells" in this.result) {
          selectedItem = this.result.cells[id]
        } else if (this.mode === "layout" && "regions" in this.result) {
          selectedItem = this.result.regions[id]
        }

        this.options.onSelect(id, selectedItem)
      }
    }
  }

  /**
   * 处理点击事件
   */
  private handleClick(event: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    this.handleTap(x, y)
  }

  /**
   * 查找点击位置下的框
   */
  private findBoxAtPosition(x: number, y: number, items: any[]): number {
    const { width, height } = this.canvas
    const scaleX = width / (this.image as HTMLImageElement).naturalWidth
    const scaleY = height / (this.image as HTMLImageElement).naturalHeight

    for (let i = items.length - 1; i >= 0; i--) {
      const item = items[i]
      const box = "box" in item ? item.box : []

      if (!box || !Array.isArray(box) || box.length < 3) continue

      // 缩放点坐标
      const points = box.map((point) => ({
        x: point.x * scaleX,
        y: point.y * scaleY,
      }))

      if (this.pointInPolygon(x, y, points)) {
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
   * 设置响应式处理
   */
  private setupResizeHandler(): void {
    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(() => {
        this.resizeCanvas()
        if (this.isReady) {
          this.render()
        }
      })
      observer.observe(this.container)
    } else {
      // 兼容性处理
      window.addEventListener("resize", () => {
        this.resizeCanvas()
        if (this.isReady) {
          this.render()
        }
      })
    }
  }

  /**
   * 调整画布大小
   */
  private resizeCanvas(): void {
    if (!this.image || !this.container) return

    const containerWidth = this.container.clientWidth
    const imgWidth =
      this.image instanceof HTMLImageElement
        ? this.image.naturalWidth
        : this.image.width
    const imgHeight =
      this.image instanceof HTMLImageElement
        ? this.image.naturalHeight
        : this.image.height

    // 保持宽高比
    const aspectRatio = imgWidth / imgHeight

    this.canvas.width = Math.min(containerWidth, this.options.width)
    this.canvas.height = this.canvas.width / aspectRatio

    // 限制最大高度
    if (this.canvas.height > this.options.height) {
      this.canvas.height = this.options.height
      this.canvas.width = this.canvas.height * aspectRatio
    }
  }

  /**
   * 加载图像
   * @param image 图像源
   */
  public async loadImage(
    image: string | HTMLImageElement | HTMLCanvasElement
  ): Promise<void> {
    try {
      if (typeof image === "string") {
        const img = new Image()
        img.crossOrigin = "anonymous"

        await new Promise<void>((resolve, reject) => {
          img.onload = () => {
            this.image = img
            this.isReady = true
            resolve()
          }
          img.onerror = () => reject(new Error("图像加载失败"))
          img.src = image
        })
      } else {
        this.image = image
        this.isReady = true
      }

      this.resizeCanvas()
      this.render()
    } catch (error) {
      console.error("加载图像失败:", error)
      throw error
    }
  }

  /**
   * 设置OCR结果
   * @param result OCR结果
   */
  public setResult(result: OCRResult | TableResult | LayoutResult): void {
    this.result = result
    this.selectedId = -1

    if (this.isReady) {
      this.render()
      this.updateResultListView()
    }
  }

  /**
   * 设置渲染模式
   * @param mode 模式：text, table 或 layout
   */
  public setMode(mode: "text" | "table" | "layout"): void {
    this.mode = mode
    this.selectedId = -1

    if (this.isReady) {
      this.render()
      this.updateResultListView()
    }
  }

  /**
   * 渲染结果
   */
  public render(): void {
    if (!this.image || !this.isReady) return

    const { width, height } = this.canvas

    // 清除画布
    this.ctx.clearRect(0, 0, width, height)

    // 绘制图像
    this.ctx.drawImage(this.image, 0, 0, width, height)

    // 根据模式渲染
    if (this.result) {
      if (this.mode === "text" && "textDetection" in this.result) {
        this.renderText(this.result)
      } else if (this.mode === "table" && "cells" in this.result) {
        this.renderTable(this.result)
      } else if (this.mode === "layout" && "regions" in this.result) {
        this.renderLayout(this.result)
      }
    }
  }

  /**
   * 渲染文本识别结果
   */
  private renderText(result: OCRResult): void {
    const { width, height } = this.canvas
    const scaleX = width / (this.image as HTMLImageElement).naturalWidth
    const scaleY = height / (this.image as HTMLImageElement).naturalHeight

    // 仅渲染部分框以提高性能
    const boxes = result.textDetection.slice(0, this.maxBoxesToRender)

    boxes.forEach((box, index) => {
      const isSelected = index === this.selectedId

      // 查找对应的文本识别结果
      const text = result.textRecognition.find(
        (t) => t.box && t.box.id === box.id
      )

      // 设置样式
      this.ctx.strokeStyle = isSelected ? "#ff9900" : this.options.color
      this.ctx.lineWidth = isSelected
        ? this.options.lineWidth + 1
        : this.options.lineWidth

      // 绘制框
      this.drawBox(box.box, scaleX, scaleY)

      // 在简单模式下不绘制文本
      if (this.options.renderMode === "simple") return

      // 绘制文本
      if (text) {
        const points = box.box.map((p) => ({
          x: p.x * scaleX,
          y: p.y * scaleY,
        }))
        const textX = Math.min(...points.map((p) => p.x))
        const textY = Math.min(...points.map((p) => p.y))

        // 绘制文本背景
        this.ctx.fillStyle = this.options.bgColor
        const textWidth = this.ctx.measureText(text.text).width + 4
        const textHeight = this.options.fontSize + 4
        this.ctx.fillRect(textX, textY - textHeight, textWidth, textHeight)

        // 绘制文本
        this.ctx.fillStyle = this.options.textColor
        this.ctx.font = `${this.options.fontSize}px Arial`
        this.ctx.fillText(text.text, textX + 2, textY - 2)
      }
    })
  }

  /**
   * 渲染表格识别结果
   */
  private renderTable(result: TableResult): void {
    const { width, height } = this.canvas
    const scaleX = width / (this.image as HTMLImageElement).naturalWidth
    const scaleY = height / (this.image as HTMLImageElement).naturalHeight

    // 仅渲染部分单元格以提高性能
    const cells = result.cells.slice(0, this.maxBoxesToRender)

    cells.forEach((cell, index) => {
      const isSelected = index === this.selectedId

      // 设置样式
      this.ctx.strokeStyle = isSelected ? "#ff9900" : this.options.color
      this.ctx.lineWidth = isSelected
        ? this.options.lineWidth + 1
        : this.options.lineWidth

      // 绘制单元格框
      this.drawBox(cell.box, scaleX, scaleY)

      // 在简单模式下不绘制内容
      if (this.options.renderMode === "simple") return

      // 绘制单元格内容
      const points = cell.box.map((p) => ({ x: p.x * scaleX, y: p.y * scaleY }))
      const textX = Math.min(...points.map((p) => p.x))
      const textY = Math.min(...points.map((p) => p.y))

      // 绘制文本背景
      this.ctx.fillStyle = this.options.bgColor
      const displayText =
        cell.text.length > 10 ? cell.text.substring(0, 10) + "..." : cell.text
      const textWidth = this.ctx.measureText(displayText).width + 4
      const textHeight = this.options.fontSize + 4
      this.ctx.fillRect(textX, textY - textHeight, textWidth, textHeight)

      // 绘制文本
      this.ctx.fillStyle = this.options.textColor
      this.ctx.font = `${this.options.fontSize}px Arial`
      this.ctx.fillText(displayText, textX + 2, textY - 2)
    })
  }

  /**
   * 渲染版面分析结果
   */
  private renderLayout(result: LayoutResult): void {
    const { width, height } = this.canvas
    const scaleX = width / (this.image as HTMLImageElement).naturalWidth
    const scaleY = height / (this.image as HTMLImageElement).naturalHeight

    // 仅渲染部分区域以提高性能
    const regions = result.regions.slice(0, this.maxBoxesToRender)

    regions.forEach((region, index) => {
      const isSelected = index === this.selectedId

      // 根据区域类型选择颜色
      let color = this.options.color
      switch (region.type) {
        case "text":
          color = "#0066cc"
          break
        case "title":
          color = "#cc0000"
          break
        case "figure":
          color = "#00cc00"
          break
        case "table":
          color = "#cc6600"
          break
        default:
          color = "#666666"
      }

      // 设置样式
      this.ctx.strokeStyle = isSelected ? "#ff9900" : color
      this.ctx.lineWidth = isSelected
        ? this.options.lineWidth + 1
        : this.options.lineWidth

      // 绘制区域框
      this.drawBox(region.box, scaleX, scaleY)

      // 在简单模式下不绘制标签
      if (this.options.renderMode === "simple") return

      // 绘制区域类型标签
      const points = region.box.map((p) => ({
        x: p.x * scaleX,
        y: p.y * scaleY,
      }))
      const textX = Math.min(...points.map((p) => p.x))
      const textY = Math.min(...points.map((p) => p.y))

      // 绘制文本背景
      this.ctx.fillStyle = this.options.bgColor
      const labelText = region.type.toUpperCase()
      const textWidth = this.ctx.measureText(labelText).width + 4
      const textHeight = this.options.fontSize + 4
      this.ctx.fillRect(textX, textY - textHeight, textWidth, textHeight)

      // 绘制文本
      this.ctx.fillStyle = this.options.textColor
      this.ctx.font = `${this.options.fontSize}px Arial`
      this.ctx.fillText(labelText, textX + 2, textY - 2)
    })
  }

  /**
   * 绘制框
   */
  private drawBox(box: Point[], scaleX: number, scaleY: number): void {
    if (!box || !Array.isArray(box) || box.length < 3) return

    this.ctx.beginPath()

    // 缩放点坐标
    const points = box.map((point) => ({
      x: point.x * scaleX,
      y: point.y * scaleY,
    }))

    // 绘制多边形
    this.ctx.moveTo(points[0].x, points[0].y)
    for (let i = 1; i < points.length; i++) {
      this.ctx.lineTo(points[i].x, points[i].y)
    }
    this.ctx.closePath()
    this.ctx.stroke()
  }

  /**
   * 更新选项
   * @param options 新选项
   */
  public updateOptions(options: Partial<LightVisualizerOptions>): void {
    this.options = { ...this.options, ...options }

    if (this.isReady) {
      this.render()
      this.updateResultListView()
    }
  }

  /**
   * 获取数据URL
   */
  public toDataURL(type: string = "image/png", quality: number = 0.9): string {
    return this.canvas.toDataURL(type, quality)
  }

  /**
   * 清除结果
   */
  public clear(): void {
    const { width, height } = this.canvas
    this.ctx.clearRect(0, 0, width, height)
    this.result = null
    this.selectedId = -1

    // 清除列表视图
    if (this.options.renderMode === "list") {
      const listContainer = this.container.querySelector(
        ".paddleocr-result-list"
      )
      if (listContainer) {
        listContainer.innerHTML = ""
      }
    }
  }

  /**
   * 销毁组件
   */
  public dispose(): void {
    // 移除事件监听
    this.canvas.removeEventListener("click", this.handleClick.bind(this))
    this.canvas.removeEventListener(
      "touchstart",
      this.handleTouchStart.bind(this)
    )
    this.canvas.removeEventListener("touchend", this.handleTouchEnd.bind(this))

    // 移除画布
    if (this.canvas.parentElement) {
      this.canvas.parentElement.removeChild(this.canvas)
    }

    // 移除列表视图
    if (this.options.renderMode === "list") {
      const listContainer = this.container.querySelector(
        ".paddleocr-result-list"
      )
      if (listContainer && listContainer.parentElement) {
        listContainer.parentElement.removeChild(listContainer)
      }
    }

    // 清除引用
    this.image = null
    this.result = null
    this.isReady = false
  }
}

/**
 * 轻量级可视化选项接口
 */
export interface LightVisualizerOptions {
  width: number
  height: number
  color: string
  textColor: string
  bgColor: string
  fontSize: number
  lineWidth: number
  responsive: boolean
  optimizeForMobile: boolean
  renderMode: "simple" | "list" | "full"
  onSelect?: (id: number, item: any) => void
}
