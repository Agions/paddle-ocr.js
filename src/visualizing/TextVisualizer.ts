import { OCRResult, TextBox } from "../typings"
import { BaseVisualizer } from "./BaseVisualizer"

/**
 * OCR文本可视化器
 * 负责渲染文本检测结果和识别文本
 */
export class TextVisualizer extends BaseVisualizer {
  private result: OCRResult | null = null

  /**
   * 设置OCR结果
   */
  public setResult(result: OCRResult): void {
    this.result = result
    this.highlightedIndex = -1
    this.render()
  }

  /**
   * 获取高亮索引
   */
  public getHighlightedIndex(): number {
    return this.highlightedIndex
  }

  /**
   * 获取当前结果
   */
  public getResult(): OCRResult | null {
    return this.result
  }

  /**
   * 根据坐标查找文本框索引
   */
  public findIndexAt(x: number, y: number): number {
    if (!this.result) return -1
    return this.findPolygonIndexAt(
      x,
      y,
      this.result.textDetection.map((box) => box.box)
    )
  }

  /**
   * 获取指定索引的元素信息
   */
  public getElementByIndex(index: number): {
    detection: TextBox
    recognition: { text: string; score: number }
  } | null {
    if (index === -1 || !this.result) return null

    const detection = this.result.textDetection[index]
    if (!detection) return null

    // 找到对应的识别结果（通过检测ID匹配）
    const recognition = this.result.textRecognition.find((recognition) =>
      recognition.box && recognition.box.id !== undefined
        ? String(recognition.box.id) === String(detection.id)
        : false
    )

    if (!recognition) return null

    return {
      detection,
      recognition: { text: recognition.text, score: recognition.score },
    }
  }

  /**
   * 获取无障碍文本描述
   */
  public getAccessibilityText(index: number): string {
    const element = this.getElementByIndex(index)
    if (!element) return ""

    return `文本 ${index + 1}: ${element.recognition.text}, 置信度: ${(
      element.recognition.score * 100
    ).toFixed(1)}%`
  }

  /**
   * 渲染文本识别结果
   */
  public render(): void {
    if (!this.image || !this.result) return

    const { width, height } = this.canvas
    this.ctx.clearRect(0, 0, width, height)
    this.ctx.drawImage(this.image, 0, 0, width, height)

    const { textDetection, textRecognition } = this.result

    textDetection.forEach((box, index) => {
      const isHighlighted = index === this.highlightedIndex
      // 找到对应的识别结果（通过检测ID匹配）
      const recognitionResult = textRecognition.find((recognition) =>
        recognition.box && recognition.box.id !== undefined
          ? String(recognition.box.id) === String(box.id)
          : false
      )

      const scaledPoints = this.scalePoints(box.box)

      // 绘制文本框
      this.drawPolygon(
        scaledPoints,
        isHighlighted ? this.options.highlightColor : this.options.boxColor,
        this.options.lineWidth
      )

      // 绘制文字标签
      if (recognitionResult) {
        const textX = Math.min(...scaledPoints.map((p) => p.x))
        const textY = Math.min(...scaledPoints.map((p) => p.y))

        this.drawTextLabel(recognitionResult.text, textX, textY)

        // 绘制置信度
        if (this.options.showConfidence) {
          const confidenceText = `${(recognitionResult.score * 100).toFixed(
            1
          )}%`
          const textWidth =
            this.ctx.measureText(recognitionResult.text).width +
            this.options.padding * 2
          this.ctx.fillStyle = this.options.textColor
          this.ctx.font = `${this.options.fontSize}px Arial`
          this.ctx.fillText(
            confidenceText,
            textX + textWidth + 5,
            textY - this.options.padding
          )
        }

        // 绘制框ID
        if (this.options.showBoxId) {
          const textHeight = this.options.fontSize + this.options.padding * 2
          this.ctx.fillStyle = this.options.textColor
          this.ctx.font = `${this.options.fontSize}px Arial`
          this.ctx.fillText(`#${box.id}`, textX - 5, textY - textHeight - 5)
        }
      }
    })

    this.triggerEvent("render")
  }
}