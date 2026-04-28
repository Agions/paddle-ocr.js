import { LayoutResult } from "../typings"
import { BaseVisualizer, REGION_COLORS } from "./BaseVisualizer"

/**
 * 版面分析可视化器
 * 负责渲染版面分析结果和区域标注
 */
export class LayoutVisualizer extends BaseVisualizer {
  private result: LayoutResult | null = null

  /**
   * 设置版面分析结果
   */
  public setResult(result: LayoutResult): void {
    this.result = result
    this.highlightedIndex = -1
    this.render()
  }

  /**
   * 获取当前结果
   */
  public getResult(): LayoutResult | null {
    return this.result
  }

  /**
   * 根据坐标查找区域索引
   */
  public findIndexAt(x: number, y: number): number {
    if (!this.result) return -1
    return this.findPolygonIndexAt(
      x,
      y,
      this.result.regions.map((region) => region.box)
    )
  }

  /**
   * 获取指定索引的区域
   */
  public getElementByIndex(
    index: number
  ): LayoutResult["regions"][number] | null {
    if (index === -1 || !this.result) return null
    return this.result.regions[index] || null
  }

  /**
   * 获取无障碍文本描述
   */
  public getAccessibilityText(index: number): string {
    const element = this.getElementByIndex(index)
    if (!element) return ""

    let description = `区域 ${index + 1}: 类型: ${
      element.type
    }, 置信度: ${(element.score * 100).toFixed(1)}%`
    if (typeof element.content === "string") {
      description += `, 内容: ${element.content}`
    }
    return description
  }

  /**
   * 获取区域类型对应的颜色
   */
  private getRegionColor(type: string): string {
    return REGION_COLORS[type] || REGION_COLORS.default
  }

  /**
   * 渲染版面分析结果
   */
  public render(): void {
    if (!this.image || !this.result) return

    const { width, height } = this.canvas
    this.ctx.clearRect(0, 0, width, height)
    this.ctx.drawImage(this.image, 0, 0, width, height)

    const { regions } = this.result

    regions.forEach((region, index) => {
      const isHighlighted = index === this.highlightedIndex
      const regionColor = this.getRegionColor(region.type)
      const scaledPoints = this.scalePoints(region.box)

      // 绘制区域框（带填充）
      this.drawFilledPolygon(
        scaledPoints,
        isHighlighted ? this.options.highlightColor : regionColor,
        regionColor.replace("0.5", "0.2"),
        this.options.lineWidth
      )

      // 绘制区域类型标签
      const textX = Math.min(...scaledPoints.map((p) => p.x))
      const textY = Math.min(...scaledPoints.map((p) => p.y))
      const textContent = region.type.toUpperCase()

      this.drawTextLabel(textContent, textX, textY)

      // 绘制置信度
      if (this.options.showConfidence) {
        const confidenceText = `${(region.score * 100).toFixed(1)}%`
        const labelWidth =
          this.ctx.measureText(textContent).width + this.options.padding * 2
        this.ctx.fillStyle = this.options.textColor
        this.ctx.font = `${this.options.fontSize}px Arial`
        this.ctx.fillText(
          confidenceText,
          textX + labelWidth + 5,
          textY - this.options.padding
        )
      }
    })

    this.triggerEvent("render")
  }
}
