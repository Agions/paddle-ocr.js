/**
 * 公式识别
 */

import type { FormulaResult, FormulaType, OcrImageData, PaddleOcrOptions, Point } from "../typings"
import { BaseRecognizer } from "./baseRecognizer"

export class FormulaRecognizer extends BaseRecognizer {
  async init(): Promise<void> {
    if (this.isInitialized) return
    await this.modelLoader.load({ type: "formula", name: "LaTeX" })
    this.isInitialized = true
  }

  /** 识别公式（当前为占位实现） */
  async recognize(image: OcrImageData): Promise<FormulaResult[]> {
    this.ensureReady()
    return []
  }

  toLatex(formula: FormulaResult): string {
    if (formula.latex) return formula.latex
    if (formula.tex) return `$${formula.tex}$`
    if (formula.html) return htmlToLatex(formula.html)
    return formula.text
  }
}

function htmlToLatex(html: string): string {
  return html
    .replace(/<sup>/g, "^").replace(/<\/sup>/g, "")
    .replace(/<sub>/g, "_").replace(/<\/sub>/g, "")
    .replace(/<frac>/g, "\\frac{").replace(/<\/frac>/g, "}")
}
