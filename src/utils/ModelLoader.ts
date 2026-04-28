import { PaddleOCROptions } from "../typings"
import { buildModelPath } from "./modelPath"

/**
 * 统一的模型加载器
 * 使用策略模式加载不同后端的模型
 */
export class ModelLoader {
  private cache = new Map<string, any>()

  constructor(private options: PaddleOCROptions) {}

  /**
   * 加载文本检测模型
   */
  async loadDetectionModel(): Promise<any> {
    return this.loadModel({
      modelType: "detection",
      modelName: this.options.detectionModel || "DB",
      language: this.getLanguage(),
    })
  }

  /**
   * 加载文本识别模型
   */
  async loadRecognitionModel(): Promise<any> {
    return this.loadModel({
      modelType: "recognition",
      modelName: this.options.recognitionModel || "CRNN",
      language: this.getLanguage(),
    })
  }

  /**
   * 获取语言配置（处理字符串和数组类型）
   */
  private getLanguage(): string {
    const lang = this.options.language || "ch"
    // 如果是数组，使用第一个语言
    return Array.isArray(lang) ? lang[0] : lang
  }

  /**
   * 加载表格识别模型
   */
  async loadTableModel(): Promise<any> {
    return this.loadModel({
      modelType: "table",
      modelName: "TableRec",
    })
  }

  /**
   * 加载布局分析模型
   */
  async loadLayoutModel(): Promise<any> {
    return this.loadModel({
      modelType: "layout",
      modelName: "Layout",
    })
  }

  /**
   * 加载公式识别模型
   */
  async loadFormulaModel(): Promise<any> {
    return this.loadModel({
      modelType: "formula",
      modelName: "LaTeX",
    })
  }

  /**
   * 加载条码识别模型
   */
  async loadBarcodeModel(): Promise<any> {
    return this.loadModel({
      modelType: "barcode",
      modelName: "Detect",
    })
  }

  /**
   * 统一的模型加载方法
   */
  private async loadModel(config: {
    modelType:
      | "detection"
      | "recognition"
      | "layout"
      | "table"
      | "formula"
      | "barcode"
    modelName: string
    language?: string
  }): Promise<any> {
    const cacheKey = `${config.modelType}-${config.modelName}-${config.language || ""}`

    // 检查缓存
    if (this.cache.has(cacheKey)) {
      console.log(`[ModelLoader] 使用缓存的模型: ${cacheKey}`)
      return this.cache.get(cacheKey)
    }

    // 构建模型路径
    const extension = this.options.useTensorflow ? ".json" : ".onnx"
    const modelPath = buildModelPath({
      modelPath: this.options.modelPath,
      modelType: config.modelType,
      modelName: config.modelName,
      language: config.language,
      extension: extension as ".json" | ".onnx",
    })

    console.log(`[ModelLoader] 加载模型: ${modelPath}`)

    try {
      let model: any

      if (this.options.useTensorflow) {
        model = await this.loadTensorFlowModel(modelPath)
      } else if (this.options.useONNX) {
        model = await this.loadONNXModel(modelPath)
      } else {
        throw new Error("未指定模型后端")
      }

      // 缓存模型
      this.cache.set(cacheKey, model)

      console.log(`[ModelLoader] 模型加载成功: ${cacheKey}`)
      return model
    } catch (error) {
      console.error(`[ModelLoader] 模型加载失败: ${modelPath}`, error)
      throw error
    }
  }

  /**
   * 加载 TensorFlow.js 模型
   */
  private async loadTensorFlowModel(modelPath: string): Promise<any> {
    const tf = require("@tensorflow/tfjs") as any
    return await tf.loadGraphModel(modelPath)
  }

  /**
   * 加载 ONNX 模型
   */
  private async loadONNXModel(modelPath: string): Promise<any> {
    const ort = require("onnxruntime-web") as any
    return await ort.InferenceSession.create(modelPath)
  }

  /**
   * 释放所有缓存的模型
   */
  dispose(): void {
    const keys = Array.from(this.cache.keys())
    for (const key of keys) {
      const model = this.cache.get(key)
      if (model && typeof model.dispose === "function") {
        console.log(`[ModelLoader] 释放模型: ${key}`)
        model.dispose()
      }
      this.cache.delete(key)
    }
  }
}
