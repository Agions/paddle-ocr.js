/**
 * 公式识别
 */

import type { FormulaResult, OcrImageData } from "../typings"
import { BaseRecognizer } from "./baseRecognizer"

export class FormulaRecognizer extends BaseRecognizer {
  async init(): Promise<void> {
    if (this.isInitialized) return
    await this.modelLoader.load({ type: "formula", name: "LaTeX" })
    this.isInitialized = true
  }

  /** 占位实现（待接入真实公式模型） */
  async recognize(_image: OcrImageData): Promise<FormulaResult[]> {
    this.ensureReady()
    return []
  }

  toLatex(formula: FormulaResult): string {
    if (formula.latex) return formula.latex
    if (formula.tex) return `$${formula.tex}$`
    return formula.html ? htmlToLatex(formula.html) : formula.text ?? ""
  }
}

function htmlToLatex(html: string): string {
  return html
    .replace(/<sup>/g, "^").replace(/<\/sup>/g, "")
    .replace(/<sub>/g, "_").replace(/<\/sub>/g, "")
    .replace(/<frac>/g, "\\frac{").replace(/<\/frac>/g, "}")
}
