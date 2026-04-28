import PaddleOCR from "./paddleocr"
import { OCRResult, TableResult, LayoutResult, ProcessOptions } from "./typings"

// 添加版本信息
PaddleOCR.version = "0.2.0"

// Worker上下文
const ctx: Worker = self as any

// 全局OCR实例（复用，避免每次请求都创建新实例）
let ocrInstance: PaddleOCR | null = null
let ocrOptions: any = null

/**
 * 获取或创建OCR实例
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
  ocrOptions = options
  ocrInstance = new PaddleOCR(options)
  await ocrInstance.init()
  return ocrInstance
}

// 处理消息
ctx.addEventListener("message", async (event) => {
  const { type, id, data } = event.data

  try {
    let result: OCRResult | TableResult | LayoutResult | null = null

    // 初始化OCR
    if (type === "init") {
      await getOCRInstance(data.options)
      ctx.postMessage({
        id,
        type: "init:success",
        data: { success: true },
      })
      return
    }

    // 获取复用的OCR实例
    const ocr = await getOCRInstance(data.options)

    // 根据操作类型执行不同的OCR任务
    switch (type) {
      case "recognize":
        result = await ocr.recognize(
          data.image,
          data.processOptions as ProcessOptions
        )
        break
      case "recognizeTable":
        result = await ocr.recognizeTable(
          data.image,
          data.processOptions as ProcessOptions
        )
        break
      case "analyzeLayout":
        result = await ocr.analyzeLayout(
          data.image,
          data.processOptions as ProcessOptions
        )
        break
      default:
        throw new Error(`不支持的操作类型: ${type}`)
    }

    // 返回结果
    ctx.postMessage({
      id,
      type: `${type}:success`,
      data: result,
    })
  } catch (error) {
    // 错误处理
    ctx.postMessage({
      id,
      type: `${type}:error`,
      data: {
        message: (error as Error).message,
        stack: (error as Error).stack,
      },
    })
  }
})

// 通知Worker已准备好
ctx.postMessage({ type: "ready" })

// Worker环境不需要导出
