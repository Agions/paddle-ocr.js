import PaddleOCR from "./paddleocr"
import { OCRResult, TableResult, LayoutResult, ProcessOptions } from "./typings"

// 添加版本信息
PaddleOCR.version = "0.2.0"

// Worker上下文
const ctx: Worker = self as any

// 处理消息
ctx.addEventListener("message", async (event) => {
  const { type, id, data } = event.data

  try {
    let result: OCRResult | TableResult | LayoutResult | null = null
    let ocr: PaddleOCR | null = null

    // 初始化OCR
    if (type === "init") {
      ocr = new PaddleOCR(data.options)
      await ocr.init()

      // 返回初始化成功消息
      ctx.postMessage({
        id,
        type: "init:success",
        data: { success: true },
      })
      return
    }

    // 创建OCR实例
    ocr = new PaddleOCR(data.options)
    await ocr.init()

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

    // 销毁OCR实例
    await ocr.dispose()

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
