/**
 * 版面分析（PP-Layout）
 * 通过 DI 共享 TextDetector/TextRecognizer/TableRecognizer
 */

import type { LayoutRegion, LayoutResult, OcrImageData, PaddleOcrOptions, Point, TextBox, TextLine } from "../typings"
import { BaseRecognizer } from "./baseRecognizer"
import { ImageProcessor } from "../utils/imageProcessor"

export class LayoutAnalyzer extends BaseRecognizer {
  /** DI 共享 */
  constructor(
    options: PaddleOcrOptions,
    private textDetector?: { detect(image: OcrImageData): Promise<TextBox[]> },
    private textRecognizer?: { recognize(image: OcrImageData, boxes?: TextBox[]): Promise<TextLine[]> },
    private tableRecognizer?: { recognize(image: OcrImageData): Promise<unknown> },
  ) {
    super(options)
  }

  async init(): Promise<void> {
    if (this.isInitialized) return
    await this.modelLoader.load({ type: "layout" })
    this.isInitialized = true
  }

  async analyze(image: OcrImageData): Promise<LayoutResult> {
    this.ensureReady()
    const processed = ImageProcessor.preprocess(image, true)
    const regions = mockRegions(processed.width, processed.height)
    const processedRegions = await Promise.all(regions.map((r) => this.processRegion(image, r)))
    return {
      regions: processedRegions,
      pageWidth: image.width,
      pageHeight: image.height,
      duration: { preprocess: 0, detection: 0, total: 0 },
    }
  }

  private async processRegion(image: OcrImageData, region: { type: LayoutRegion["type"]; bbox: Point[]; score: number }): Promise<LayoutRegion> {
    const crop = ImageProcessor.cropRegion(image, region.bbox)
    if (this.isTextType(region.type) && this.textDetector && this.textRecognizer) {
      const boxes = await this.textDetector.detect(crop)
      const lines = await this.textRecognizer.recognize(crop, boxes)
      return { ...region, confidence: region.score, content: lines.map((l) => l.text).join("\n") }
    }
    if (region.type === "table" && this.tableRecognizer) {
      const table = await this.tableRecognizer.recognize(crop)
      return { ...region, confidence: region.score, content: table as string }
    }
    return { ...region, confidence: region.score }
  }

  private isTextType(type: LayoutRegion["type"]): boolean {
    return type === "text" || type === "title" || type === "header" || type === "footer" || type === "reference" || type === "comment"
  }
}

function mockRegions(w: number, h: number): Array<{ type: LayoutRegion["type"]; bbox: Point[]; score: number }> {
  const box = (x1: number, y1: number, x2: number, y2: number): Point[] => [
    { x: x1 * w, y: y1 * h }, { x: x2 * w, y: y1 * h },
    { x: x2 * w, y: y2 * h }, { x: x1 * w, y: y2 * h },
  ]
  return [
    { type: "title", bbox: box(0.1, 0.05, 0.9, 0.15), score: 0.95 },
    { type: "text", bbox: box(0.1, 0.2, 0.45, 0.6), score: 0.92 },
    { type: "figure", bbox: box(0.55, 0.2, 0.9, 0.5), score: 0.88 },
    { type: "table", bbox: box(0.2, 0.65, 0.8, 0.9), score: 0.91 },
  ]
}
