/**
 * 条码识别（QR / EAN / Code128 / ...）
 */

import type { BarcodeResult, OcrImageData } from "../typings"
import { BaseRecognizer } from "./baseRecognizer"

export class BarcodeRecognizer extends BaseRecognizer {
  async init(): Promise<void> {
    if (this.isInitialized) return
    await this.modelLoader.load({ type: "barcode" })
    this.isInitialized = true
  }

  async detect(_image: OcrImageData): Promise<BarcodeResult[]> {
    this.ensureReady()
    return []
  }
}
