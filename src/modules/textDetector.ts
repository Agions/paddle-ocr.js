/**
 * 文本检测（DB / EAST / PAN）
 */

import type { OcrImageData, TextBox, TextLine } from "../typings"
import { BaseRecognizer, runInference } from "./baseRecognizer"

export class TextDetector extends BaseRecognizer {
  async init(): Promise<void> {
    if (this.isInitialized) return
    await this.modelLoader.load({ type: "detection", name: this.options.detectionModel ?? "DB" })
    this.isInitialized = true
  }

  /** 检测文本区域 */
  async detect(image: OcrImageData): Promise<TextBox[]> {
    this.ensureReady()
    const { data, width, height } = this.preprocess(image)
    const model = await this.modelLoader.load({ type: "detection", name: this.options.detectionModel ?? "DB" })
    const result = await runInference(model, data, height, width)
    return this.postprocess(result, width, height)
  }

  /** TODO: 实现真实 DB 后处理 (box reconstruction + NMS) */
  private postprocess(_predictions: unknown, _w: number, _h: number): TextBox[] {
    return []
  }
}
