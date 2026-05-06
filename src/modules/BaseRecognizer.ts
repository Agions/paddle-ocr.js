/**
 * 通用识别器基类
 * 提供统一的 dispose 模式和资源管理
 */

import { PaddleOCROptions } from "../typings"

/**
 * 识别器基类接口
 */
export interface BaseRecognizerInterface {
  init(): Promise<void>
  dispose(): Promise<void>
  readonly isInitialized: boolean
}

/**
 * 通用识别器基类
 * 所有识别器模块应继承此类以获得统一的资源管理
 */
export abstract class BaseRecognizer implements BaseRecognizerInterface {
  protected options: PaddleOCROptions
  public isInitialized = false

  constructor(options: PaddleOCROptions) {
    this.options = options
  }

  /**
   * 初始化识别器（由子类实现）
   */
  public abstract init(): Promise<void>

  /**
   * 统一资源释放方法
   * 子类应调用 super.dispose() 确保基类资源被释放
   * 子类应在调用 super.dispose() 之前释放自己的模型
   */
  public async dispose(): Promise<void> {
    this.isInitialized = false
  }

  /**
   * 安全释放模型资源
   * 统一处理 TensorFlow.js 和原生对象的释放
   * 子类应调用此方法释放自己的模型
   */
  protected disposeModel(model: any): void {
    if (!model) return

    // TensorFlow.js 张量/模型
    if (typeof model.dispose === "function") {
      try {
        model.dispose()
      } catch (error) {
        console.warn("模型释放失败:", error)
      }
    }

    // 清除引用
    if (typeof model === "object") {
      Object.keys(model).forEach((key) => {
        model[key] = null
      })
    }
  }

  /**
   * 检查是否已初始化
   */
  public checkInitialized(): void {
    if (!this.isInitialized) {
      throw new Error("识别器未初始化，请先调用 init()")
    }
  }
}
