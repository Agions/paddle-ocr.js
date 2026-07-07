/**
 * 表格识别（结构 + 单元格 + 单元格文本）
 * 通过 DI 复用共享 TextDetector/TextRecognizer（不再各自 new）
 */

import type { OcrImageData, PaddleOcrOptions, Point, TableResult, TableCell, TextBox, TextLine } from "../typings"
import { BaseRecognizer } from "./baseRecognizer"
import { ImageProcessor } from "../utils/imageProcessor"

export class TableRecognizer extends BaseRecognizer {
  /** DI 共享：调用方传入全局的 detector/recognizer */
  constructor(
    options: PaddleOcrOptions,
    private textDetector?: { detect(image: OcrImageData): Promise<TextBox[]> },
    private textRecognizer?: { recognize(image: OcrImageData, boxes?: TextBox[]): Promise<TextLine[]> },
  ) {
    super(options)
  }

  async init(): Promise<void> {
    if (this.isInitialized) return
    await Promise.all([
      this.modelLoader.load({ type: "table", subPath: "table/structure/model" }),
      this.modelLoader.load({ type: "table", subPath: "table/cell/model" }),
    ])
    this.isInitialized = true
  }

  async recognize(image: OcrImageData): Promise<TableResult> {
    this.ensureReady()
    const processed = ImageProcessor.preprocess(image, true)
    const structure = mockStructure(processed.width, processed.height)
    const cells = this.expandCells(structure, processed.width, processed.height)
    const contents = await this.fillCells(image, cells)
    return this.build(structure, contents)
  }

  /** 由结构线生成单元格 bbox */
  private expandCells(structure: { rows: number; cols: number; lines: { horizontal: Array<{ y: number; x1: number; x2: number }>; vertical: Array<{ x: number; y1: number; y2: number }> } }, width: number, height: number): Array<{ row: number; col: number; bbox: Point[] }> {
    const cells: Array<{ row: number; col: number; bbox: Point[] }> = []
    for (let r = 0; r < structure.rows - 1; r++) {
      for (let c = 0; c < structure.cols - 1; c++) {
        const h1 = structure.lines.horizontal[r], h2 = structure.lines.horizontal[r + 1]
        const v1 = structure.lines.vertical[c], v2 = structure.lines.vertical[c + 1]
        cells.push({
          row: r,
          col: c,
          bbox: [
            { x: v1.x * width, y: h1.y * height },
            { x: v2.x * width, y: h1.y * height },
            { x: v2.x * width, y: h2.y * height },
            { x: v1.x * width, y: h2.y * height },
          ],
        })
      }
    }
    return cells
  }

  /** 对每个单元格做文本识别 */
  private async fillCells(image: OcrImageData, cells: Array<{ row: number; col: number; bbox: Point[] }>): Promise<TableCell[]> {
    if (!this.textDetector || !this.textRecognizer) return cells.map((c) => ({ row: c.row, col: c.col, bbox: c.bbox, content: "" }))
    const out: TableCell[] = []
    for (const c of cells) {
      const crop = ImageProcessor.cropRegion(image, c.bbox)
      const textBoxes = await this.textDetector.detect(crop)
      const lines = await this.textRecognizer.recognize(crop, textBoxes)
      out.push({ row: c.row, col: c.col, bbox: c.bbox, content: lines.map((l) => l.text).join(" ") })
    }
    return out
  }

  private build(structure: unknown, cells: TableCell[]): TableResult {
    return {
      table: { cells, bbox: [] },
      structure,
      html: toHtml(cells),
      markdown: toMarkdown(cells),
      duration: { preprocess: 0, detection: 0, recognition: 0, total: 0 },
    }
  }
}

function mockStructure(w: number, h: number) {
  return {
    rows: 5,
    cols: 4,
    lines: {
      horizontal: [0.1, 0.3, 0.5, 0.7, 0.9].map((y) => ({ y, x1: 0.1, x2: 0.9 })),
      vertical: [0.1, 0.3, 0.5, 0.7, 0.9].map((x) => ({ x, y1: 0.1, y2: 0.9 })),
    },
    width: w,
    height: h,
  }
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"'/]/g, (c) => `&#x${c.charCodeAt(0).toString(16)};`)
}

function toHtml(cells: TableCell[]): string {
  const rowCount = Math.max(...cells.map((c) => c.row)) + 1
  const colCount = Math.max(...cells.map((c) => c.col)) + 1
  let html = '<table border="1" cellspacing="0" cellpadding="5">'
  for (let r = 0; r < rowCount; r++) {
    html += "<tr>"
    for (let c = 0; c < colCount; c++) {
      const cell = cells.find((x) => x.row === r && x.col === c)
      html += `<td>${escapeHtml(cell?.content ?? "")}</td>`
    }
    html += "</tr>"
  }
  return html + "</table>"
}

function toMarkdown(cells: TableCell[]): string {
  const rowCount = Math.max(...cells.map((c) => c.row)) + 1
  const colCount = Math.max(...cells.map((c) => c.col)) + 1
  const lines: string[] = []
  lines.push("|" + Array(colCount).fill("").map((_, i) => ` 列${i + 1} `).join("|") + "|")
  lines.push("|" + Array(colCount).fill(" --- ").join("|") + "|")
  for (let r = 0; r < rowCount; r++) {
    const row: string[] = []
    for (let c = 0; c < colCount; c++) {
      row.push(" " + (cells.find((x) => x.row === r && x.col === c)?.content ?? "") + " ")
    }
    lines.push("|" + row.join("|") + "|")
  }
  return lines.join("\n")
}
