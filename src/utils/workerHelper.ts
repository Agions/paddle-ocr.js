/**
 * Web Worker 助手：把长耗时识别放到后台线程
 * 协议：out {type, id, data}；in {id, type, data}（type 以 :success/:error 结尾）
 */

import type { PaddleOcrOptions, OcrResult, TableResult, LayoutResult, ProcessOptions } from "../typings"
import { isBrowser } from "./env"

type WorkerMessageType = "init" | "recognize" | "recognizeTable" | "analyzeLayout"
type WorkerResponseType = `${WorkerMessageType}:success` | `${WorkerMessageType}:error`
type PendingTask = { resolve: (v: unknown) => void; reject: (e: Error) => void }

export class PaddleOcrWorker {
  private worker: Worker | null = null
  private pending = new Map<string, PendingTask>()
  private workerUrl = "paddle-ocr-worker.js"
  private options: PaddleOcrOptions
  isInitialized = false

  constructor(options: PaddleOcrOptions, workerUrl?: string) {
    this.options = options
    if (workerUrl) this.workerUrl = workerUrl
  }

  async init(): Promise<void> {
    if (this.isInitialized) return
    if (!isBrowser()) throw new Error("PaddleOcrWorker is browser-only")
    this.worker = new Worker(this.workerUrl)
    this.worker.addEventListener("message", this.onMessage)
    this.worker.addEventListener("error", (e) => { throw new Error(`Worker error: ${e.message}`) })
    await this.call("init", { options: this.options })
    this.isInitialized = true
  }

  recognize(image: ImageData | HTMLCanvasElement | HTMLImageElement, options?: ProcessOptions): Promise<OcrResult> {
    return this.call("recognize", { image, options })
  }

  recognizeTable(image: ImageData | HTMLCanvasElement | HTMLImageElement, options?: ProcessOptions): Promise<TableResult> {
    return this.call("recognizeTable", { image, options })
  }

  analyzeLayout(image: ImageData | HTMLCanvasElement | HTMLImageElement, options?: ProcessOptions): Promise<LayoutResult> {
    return this.call("analyzeLayout", { image, options })
  }

  async updateOptions(options: Partial<PaddleOcrOptions>): Promise<void> {
    this.options = { ...this.options, ...options }
    this.dispose()
    await this.init()
  }

  dispose(): void {
    this.worker?.terminate()
    this.worker = null
    this.isInitialized = false
    this.pending.clear()
  }

  private call(type: WorkerMessageType, data: unknown): Promise<any> {
    if (!this.worker) throw new Error("Worker not initialized")
    const id = Math.random().toString(36).slice(2)
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      this.worker!.postMessage({ type, id, data })
    })
  }

  private onMessage = (event: MessageEvent): void => {
    const { id, type, data } = event.data as { id: string; type: WorkerResponseType; data: unknown }
    const p = this.pending.get(id)
    if (!p) return
    this.pending.delete(id)
    if (type.endsWith(":success")) p.resolve(data)
    else if (type.endsWith(":error")) p.reject(new Error((data as { message: string }).message))
  }
}
