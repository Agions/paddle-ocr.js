import { PaddleOCR } from "./PaddleOCRFacade"
import { OCRResult, TableResult, LayoutResult, ProcessOptions } from "./typings"

// Worker 上下文
const ctx: Worker = self as any

// 全局 OCR 实例（复用，避免每次请求都创建新实例）
let ocrInstance: PaddleOCR | null = null
let ocrOptions: any = null

/**
 * 获取或创建 OCR 实例
 */
async function getOCRInstance(options?: any): Promise<PaddleOCR> {
  // 如果选项变化，需要重新初始化
  if (ocrInstance && ocrOptions && JSON.stringify(ocrOptions) === JSON.stringify(options)) {
    return ocrInstance
  }

  // 销毁旧实例
  if (ocrInstance) {
    await ocrInstance.dispose()
    ocrInstance = null
  }

  // 创建新实例
  ocrInstance = new PaddleOCR(options || {})
  await ocrInstance.init()
  ocrOptions = options

  return ocrInstance
}

// 处理消息
self.onmessage = async (e: MessageEvent) => {
  const { type, payload } = e.data

  try {
    switch (type) {
      case "recognize":
        {
          const ocr = await getOCRInstance(payload.options)
          const result = await ocr.recognize(payload.image, payload.options)
          self.postMessage({ type: "recognize_result", result })
        }
        break

      case "recognizeTable":
        {
          const ocr = await getOCRInstance(payload.options)
          const result = await ocr.recognizeTable(payload.image, payload.options)
          self.postMessage({ type: "recognize_table_result", result })
        }
        break

      case "analyzeLayout":
        {
          const ocr = await getOCRInstance(payload.options)
          const result = await ocr.analyzeLayout(payload.image, payload.options)
          self.postMessage({ type: "analyze_layout_result", result })
        }
        break

      case "dispose":
        {
          if (ocrInstance) {
            await ocrInstance.dispose()
            ocrInstance = null
            ocrOptions = null
          }
          self.postMessage({ type: "dispose_complete" })
        }
        break

      default:
        self.postMessage({ type: "error", error: `未知消息类型: ${type}` })
    }
  } catch (error) {
    self.postMessage({
      type: "error",
      error: error instanceof Error ? error.message : String(error),
    })
  }
}
