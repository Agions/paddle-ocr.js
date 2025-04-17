import {
  PaddleOCROptions,
  OCRResult,
  TableResult,
  LayoutResult,
  ProcessOptions,
} from "../typings"
import { isBrowser } from "./env"

/**
 * Worker消息类型
 */
type WorkerMessageType =
  | "init"
  | "recognize"
  | "recognizeTable"
  | "analyzeLayout"

/**
 * 正在处理的请求
 */
interface PendingRequest {
  resolve: (value: any) => void
  reject: (reason: any) => void
  type: WorkerMessageType
}

/**
 * PaddleOCR Worker助手类
 * 用于简化在浏览器中使用Web Worker的过程
 */
export class PaddleOCRWorker {
  private worker: Worker | null = null
  private pendingRequests: Map<string, PendingRequest> = new Map()
  private options: PaddleOCROptions
  private isInitialized: boolean = false
  private workerUrl: string | null = null

  /**
   * 构造函数
   * @param options PaddleOCR选项
   * @param workerUrl Worker脚本URL，默认为"paddle-ocr-worker.js"
   */
  constructor(
    options: PaddleOCROptions,
    workerUrl: string = "paddle-ocr-worker.js"
  ) {
    this.options = options
    this.workerUrl = workerUrl
  }

  /**
   * 初始化Worker
   */
  async init(): Promise<void> {
    if (!isBrowser()) {
      throw new Error("Worker助手仅支持浏览器环境")
    }

    if (this.isInitialized) return

    return new Promise<void>((resolve, reject) => {
      try {
        // 创建Worker
        this.worker = new Worker(this.workerUrl!)

        // 监听消息
        this.worker.addEventListener(
          "message",
          this.handleWorkerMessage.bind(this)
        )

        // 监听错误
        this.worker.addEventListener("error", (error) => {
          console.error("Worker错误:", error)
          reject(new Error(`Worker错误: ${error.message}`))
        })

        // 等待Worker准备就绪
        const readyHandler = (event: MessageEvent) => {
          if (event.data.type === "ready") {
            this.worker!.removeEventListener("message", readyHandler)

            // 初始化Worker中的PaddleOCR
            this.sendMessage("init", { options: this.options })
              .then(() => {
                this.isInitialized = true
                resolve()
              })
              .catch(reject)
          }
        }

        this.worker.addEventListener("message", readyHandler)
      } catch (error) {
        reject(error)
      }
    })
  }

  /**
   * 文本识别
   * @param image 图像数据
   * @param processOptions 处理选项
   * @returns 识别结果
   */
  async recognize(
    image: ImageData | HTMLCanvasElement | HTMLImageElement,
    processOptions?: ProcessOptions
  ): Promise<OCRResult> {
    return this.sendMessage("recognize", {
      image,
      processOptions,
    }) as Promise<OCRResult>
  }

  /**
   * 表格识别
   * @param image 图像数据
   * @param processOptions 处理选项
   * @returns 表格识别结果
   */
  async recognizeTable(
    image: ImageData | HTMLCanvasElement | HTMLImageElement,
    processOptions?: ProcessOptions
  ): Promise<TableResult> {
    return this.sendMessage("recognizeTable", {
      image,
      processOptions,
    }) as Promise<TableResult>
  }

  /**
   * 版面分析
   * @param image 图像数据
   * @param processOptions 处理选项
   * @returns 版面分析结果
   */
  async analyzeLayout(
    image: ImageData | HTMLCanvasElement | HTMLImageElement,
    processOptions?: ProcessOptions
  ): Promise<LayoutResult> {
    return this.sendMessage("analyzeLayout", {
      image,
      processOptions,
    }) as Promise<LayoutResult>
  }

  /**
   * 销毁Worker
   */
  dispose(): void {
    if (this.worker) {
      this.worker.terminate()
      this.worker = null
    }

    this.isInitialized = false
    this.pendingRequests.clear()
  }

  /**
   * 更新选项
   * @param options 新的选项
   */
  async updateOptions(options: Partial<PaddleOCROptions>): Promise<void> {
    this.options = { ...this.options, ...options }

    // 如果已初始化，则重新初始化Worker
    if (this.isInitialized) {
      this.dispose()
      await this.init()
    }
  }

  /**
   * 发送消息到Worker
   * @param type 消息类型
   * @param data 消息数据
   * @returns 处理结果的Promise
   */
  private sendMessage(type: WorkerMessageType, data: any): Promise<any> {
    if (!this.worker) {
      throw new Error("Worker未初始化")
    }

    return new Promise((resolve, reject) => {
      // 生成唯一ID
      const id = Date.now().toString() + Math.random().toString(36).substring(2)

      // 存储请求
      this.pendingRequests.set(id, { resolve, reject, type })

      // 发送消息
      this.worker!.postMessage({ type, id, data })
    })
  }

  /**
   * 处理Worker消息
   * @param event 消息事件
   */
  private handleWorkerMessage(event: MessageEvent): void {
    const { id, type, data } = event.data

    // 查找挂起的请求
    const request = this.pendingRequests.get(id)
    if (!request) return

    // 从挂起的请求中移除
    this.pendingRequests.delete(id)

    // 处理成功/错误
    if (type.endsWith(":success")) {
      request.resolve(data)
    } else if (type.endsWith(":error")) {
      const error = new Error(data.message)
      error.stack = data.stack
      request.reject(error)
    }
  }
}
