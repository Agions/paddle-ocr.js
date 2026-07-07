/**
 * 文本识别（CRNN / SVTR / NRTR）
 * 模型对象共享：与 TableRecognizer/LayoutAnalyzer 复用同一 TextRecognizer 实例
 */

import type { OcrImageData, TextBox, TextLine } from "../typings"
import { BaseRecognizer, runInference } from "./baseRecognizer"
import { ImageProcessor } from "../utils/imageProcessor"
import { isNode } from "../utils/env"

export class TextRecognizer extends BaseRecognizer {
  private vocab: string[] = []

  async init(): Promise<void> {
    if (this.isInitialized) return
    await this.loadVocab()
    await this.modelLoader.load({ type: "recognition", name: this.options.recognitionModel ?? "CRNN", language: this.options.language ?? "ch" })
    this.isInitialized = true
  }

  /** 加载字符表 (vocab) */
  private async loadVocab(): Promise<void> {
    const lang = this.options.language ?? "ch"
    const path = `${this.options.modelPath}/rec_${this.options.recognitionModel?.toLowerCase() ?? "crnn"}/vocab_${lang}.txt`
    try {
      const text = isNode()
        ? await require("fs").promises.readFile(path, "utf-8") // eslint-disable-line @typescript-eslint/no-var-requires
        : await (await fetch(path)).text()
      this.vocab = text.trim().split("\n")
    } catch {
      this.vocab = "abcdefghijklmnopqrstuvwxyz0123456789".split("")
    }
  }

  /** 识别文本行 */
  async recognize(image: OcrImageData, boxes?: TextBox[]): Promise<TextLine[]> {
    this.ensureReady()
    if (boxes && boxes.length > 0) {
      return Promise.all(boxes.map(async (box) => {
        const crop = ImageProcessor.cropRegion(image, box.box)
        return this.recognizeOne(crop, box)
      }))
    }
    const line = await this.recognizeOne(image)
    return [line]
  }

  private async recognizeOne(image: OcrImageData, box?: TextBox): Promise<TextLine> {
    const { data, width, height } = this.preprocess(image)
    const model = await this.modelLoader.load({ type: "recognition", name: this.options.recognitionModel ?? "CRNN", language: this.options.language ?? "ch" })
    const result = await runInference(model, data, height, width)
    const text = this.decode(result)
    return { text, score: 0.9, box }
  }

  /** TODO: 真实 CTC / Attention 解码 */
  private decode(_result: unknown): string {
    return ""
  }
}
