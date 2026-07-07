/**
 * OCR Worker 入口（与 PaddleOcrWorker 协议匹配）
 */

import { PaddleOcr } from "./paddleOcr"
import type { PaddleOcrOptions, OcrResult, TableResult, LayoutResult, ImageSource, ProcessOptions } from "./typings"

let ocr: PaddleOcr | null = null
let lastOptions: PaddleOcrOptions | null = null

async function getOcr(options?: PaddleOcrOptions): Promise<PaddleOcr> {
  if (ocr && JSON.stringify(lastOptions) === JSON.stringify(options)) return ocr
  if (ocr) { await ocr.dispose(); ocr = null }
  ocr = new PaddleOcr(options ?? {})
  await ocr.init()
  lastOptions = options ?? null
  return ocr
}

interface BaseReq { id: string; type: string; data: { options?: PaddleOcrOptions; image?: ImageSource; processOptions?: ProcessOptions } }

self.onmessage = async (e: MessageEvent<BaseReq>): Promise<void> => {
  const { type, id, data } = e.data
  const ocrOptions = data.options
  const image = data.image
  const processOptions = data.processOptions
  try {
    const inst = await getOcr(ocrOptions)
    let result: unknown
    switch (type) {
      case "init": result = { initialized: true }; break
      case "recognize": result = await inst.recognize(image!, processOptions) as OcrResult; break
      case "recognizeTable": result = await inst.recognizeTable(image!) as TableResult; break
      case "analyzeLayout": result = await inst.analyzeLayout(image!) as LayoutResult; break
      case "dispose": await inst.dispose(); ocr = null; lastOptions = null; break
    }
    (self as unknown as Worker).postMessage({ id, type: `${type}:success`, data: result })
  } catch (error) {
    (self as unknown as Worker).postMessage({ id, type: `${type}:error`, data: { message: String(error) } })
  }
}
