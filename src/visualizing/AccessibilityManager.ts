import { OCRResult, TableResult, LayoutResult } from "../typings"
import { TextVisualizer } from "./TextVisualizer"
import { TableVisualizer } from "./TableVisualizer"
import { LayoutVisualizer } from "./LayoutVisualizer"

/**
 * 无障碍管理器
 * 管理可视化组件的无障碍支持（ARIA、键盘导航等）
 */
export class AccessibilityManager {
  private container: HTMLDivElement | null = null
  private ariaLive: HTMLDivElement | null = null
  private canvas: HTMLCanvasElement

  constructor(canvas: HTMLCanvasElement, parentContainer: HTMLElement) {
    this.canvas = canvas
    this.setup(parentContainer)
  }

  /**
   * 初始化无障碍支持
   */
  private setup(parentContainer: HTMLElement): void {
    // 创建无障碍容器
    this.container = document.createElement("div")
    this.container.className = "paddleocr-accessibility"
    this.container.setAttribute("role", "region")
    this.container.setAttribute("aria-label", "OCR识别结果文本")
    this.container.style.position = "absolute"
    this.container.style.width = "1px"
    this.container.style.height = "1px"
    this.container.style.overflow = "hidden"
    this.container.style.clip = "rect(0, 0, 0, 0)"

    // 创建实时区域
    this.ariaLive = document.createElement("div")
    this.ariaLive.setAttribute("aria-live", "polite")
    this.ariaLive.setAttribute("aria-atomic", "true")
    this.container.appendChild(this.ariaLive)

    parentContainer.appendChild(this.container)

    // 设置键盘导航
    this.canvas.addEventListener("keydown", this.handleKeyDown.bind(this))
  }

  /**
   * 更新 ARIA 摘要
   */
  public updateSummary(
    result: OCRResult | TableResult | LayoutResult,
    mode: "text" | "table" | "layout"
  ): void {
    if (!this.container || !this.ariaLive) return

    let summaryText = "OCR识别结果: "

    if (mode === "text" && "textDetection" in result) {
      const ocrResult = result as OCRResult
      summaryText += `检测到${ocrResult.textDetection.length}个文本区域，识别出${ocrResult.textRecognition.length}行文本内容。`

      // 创建文本摘要列表
      const textSummary = document.createElement("div")
      textSummary.setAttribute("role", "list")
      textSummary.setAttribute("aria-label", "识别出的文本内容")

      ocrResult.textRecognition.forEach((item, index) => {
        const textItem = document.createElement("div")
        textItem.setAttribute("role", "listitem")
        textItem.textContent = `${index + 1}. ${item.text}`
        textSummary.appendChild(textItem)
      })

      this.rebuildContainer(textSummary)
    } else if (mode === "table" && "cells" in result) {
      summaryText += `识别出${(result as TableResult).cells.length}个表格单元格。`
    } else if (mode === "layout" && "regions" in result) {
      summaryText += `检测到${(result as LayoutResult).regions.length}个版面区域。`
    }

    this.ariaLive.textContent = summaryText
  }

  /**
   * 更新高亮元素的 ARIA 信息
   */
  public updateHighlightInfo(description: string): void {
    if (!this.ariaLive) return
    this.ariaLive.textContent = description

    this.canvas.setAttribute(
      "aria-label",
      `OCR识别结果可视化, 当前选中: ${description}`
    )
  }

  /**
   * 更新模式标签
   */
  public updateModeLabel(mode: "text" | "table" | "layout"): void {
    const modeLabel =
      mode === "text" ? "文本" : mode === "table" ? "表格" : "版面"
    this.canvas.setAttribute(
      "aria-label",
      `OCR${modeLabel}识别结果可视化`
    )
  }

  /**
   * 键盘事件回调类型
   */
  private onNavigate: ((direction: number) => void) | null = null
  private onSelect: (() => void) | null = null

  /**
   * 设置键盘导航回调
   */
  public setNavigationCallbacks(
    onNavigate: (direction: number) => void,
    onSelect: () => void
  ): void {
    this.onNavigate = onNavigate
    this.onSelect = onSelect
  }

  /**
   * 处理键盘事件
   */
  private handleKeyDown(event: KeyboardEvent): void {
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault()
      this.onNavigate?.(1)
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault()
      this.onNavigate?.(-1)
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      this.onSelect?.()
    }
  }

  /**
   * 重建无障碍容器内容
   */
  private rebuildContainer(summaryElement: HTMLElement): void {
    if (!this.container) return

    while (this.container.firstChild) {
      this.container.removeChild(this.container.firstChild)
    }

    this.container.appendChild(summaryElement)
    this.ariaLive = document.createElement("div")
    this.ariaLive.setAttribute("aria-live", "polite")
    this.ariaLive.setAttribute("aria-atomic", "true")
    this.container.appendChild(this.ariaLive)
  }

  /**
   * 导出无障碍文本
   */
  public exportAccessibleText(
    result: OCRResult | TableResult | LayoutResult,
    mode: "text" | "table" | "layout"
  ): string {
    let textContent = ""

    if (mode === "text" && "textRecognition" in result) {
      textContent =
        "文本识别结果:\n" +
        (result as OCRResult).textRecognition
          .map(
            (line, index) =>
              `${index + 1}. ${line.text} (置信度: ${(
                line.score * 100
              ).toFixed(1)}%)`
          )
          .join("\n")
    } else if (mode === "table" && "cells" in result) {
      const table = result as TableResult
      textContent = "表格识别结果:\n"
      let currentRow = -1

      table.cells.forEach((cell) => {
        if (cell.row > currentRow) {
          if (currentRow >= 0) textContent += "\n"
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
    } else if (mode === "layout" && "regions" in result) {
      textContent =
        "版面分析结果:\n" +
        (result as LayoutResult).regions
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

  /**
   * 销毁
   */
  public dispose(): void {
    if (this.container && this.container.parentElement) {
      this.container.parentElement.removeChild(this.container)
    }
    this.container = null
    this.ariaLive = null
  }
}
