/**
 * 识别器基类：统一 dispose / 资源管理
 */

import type { PaddleOcrOptions, OcrImageData } from "../typings"
import { ModelLoader, LoadedModel } from "../utils/modelLoader"
import { ImageProcessor } from "../utils/imageProcessor"

export abstract class BaseRecognizer {
  isInitialized = false
  protected options: PaddleOcrOptions
  protected modelLoader: ModelLoader

  constructor(options: PaddleOcrOptions) {
    this.options = options
    this.modelLoader = new ModelLoader(options)
  }

  abstract init(): Promise<void>

  /** 释放资源（包括 ModelLoader 缓存的模型） */
  async dispose(): Promise<void> {
    this.isInitialized = false
    this.modelLoader.dispose()
  }

  protected ensureReady(): void {
    if (!this.isInitialized) throw new Error(`${this.constructor.name}: not initialized, call init() first`)
  }

  /** 取预处理后的张量（NCHW float32 通道置后） */
  protected preprocess(image: OcrImageData) {
    return ImageProcessor.preprocess(image, true)
  }
}

/** 用模型做推理并自动释放输入张量 */
export async function runInference(model: LoadedModel, data: Float32Array, h: number, w: number): Promise<unknown> {
  const tf = require("@tensorflow/tfjs")
  const input = tf.tensor(data).reshape([1, h, w, 3])
  try {
    return await model.predict(input)
  } finally {
    input.dispose()
  }
}
