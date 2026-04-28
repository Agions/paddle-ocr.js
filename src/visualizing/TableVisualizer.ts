import { TableResult } from "../typings"
import { BaseVisualizer } from "./BaseVisualizer"

/**
 * 表格可视化器
 * 负责渲染表格识别结果和单元格
 */
export class TableVisualizer extends BaseVisualizer {
  private result: TableResult | null = null

  /**
   * 设置表格结果
   */
  public setResult(result: TableResult): void {
    this.result = result
    this.highlightedIndex = -1
    this.render()
  }

  /**
   * 获取当前结果
   */
  public getResult(): TableResult | null {
    return this.result
  }

  /**
   * 根据坐标查找单元格索引
   */
  public findIndexAt(x: number, y: number): number {
    if (!this.result) return -1
    return this.findPolygonIndexAt(
      x,
      y,
      this.result.cells.map((cell) => cell.box)
    )
  }

  /**
   * 获取指定索引的单元格
   */
  public getElementByIndex(
    index: number
  ): TableResult["cells"][number] | null {
    if (index === -1 || !this.result) return null
    return this.result.cells[index] || null
  }

  /**
   * 获取无障碍文本描述
   */
  public getAccessibilityText(index: number): string {
    const element = this.getElementByIndex(index)
    if (!element) return ""
    return `单元格 ${index + 1}: 第${element.row + 1}行第${
      element.col + 1
    }列, 内容: ${element.text}`
  }

  /**
   * 渲染表格识别结果
   */
  public render(): void {
    if (!this.image || !this.result) return

    const { width, height } = this.canvas
    this.ctx.clearRect(0, 0, width, height)
    this.ctx.drawImage(this.image, 0, 0, width, height)

    const { cells } = this.result

    cells.forEach((cell, index) => {
      const isHighlighted = index === this.highlightedIndex
      const scaledPoints = this.scalePoints(cell.box)

      // 绘制单元格框
      this.drawPolygon(
        scaledPoints,
        isHighlighted ? this.options.highlightColor : this.options.boxColor,
        this.options.lineWidth
      )

      // 绘制单元格内容
      const textX = Math.min(...scaledPoints.map((p) => p.x))
      const textY = Math.min(...scaledPoints.map((p) => p.y))

      this.drawTextLabel(cell.text, textX, textY)

      // 绘制单元格坐标信息
      if (this.options.showBoxId) {
        const textHeight = this.options.fontSize + this.options.padding * 2
        this.ctx.fillStyle = this.options.textColor
        this.ctx.font = `${this.options.fontSize}px Arial`
        this.ctx.fillText(
          `R${cell.row}C${cell.col}`,
          textX - 5,
          textY - textHeight - 5
        )
      }
    })

    this.triggerEvent("render")
  }
}
