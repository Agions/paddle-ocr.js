/**
 * 条码识别（QR / EAN / Code128 / ...）
 */

import type { BarcodeResult, BarcodeType, OcrImageData, PaddleOcrOptions } from "../typings"
import { BaseRecognizer } from "./baseRecognizer"

const FORMAT_MAP: Record<string, BarcodeType> = {
  QR_CODE: "qr", DATA_MATRIX: "data_matrix", AZTEC: "aztec",
  CODABAR: "codabar", CODE_128: "code_128", CODE_39: "code_39", CODE_93: "code_93",
  EAN_13: "ean_13", EAN_8: "ean_8", ITF: "itf",
  PDF_417: "pdf_417", UPC_A: "upc_a", UPC_E: "upc_e",
}

export class BarcodeRecognizer extends BaseRecognizer {
  async init(): Promise<void> {
    if (this.isInitialized) return
    await this.modelLoader.load({ type: "barcode" })
    this.isInitialized = true
  }

  async detect(image: OcrImageData): Promise<BarcodeResult[]> {
    this.ensureReady()
    return []
  }
}
