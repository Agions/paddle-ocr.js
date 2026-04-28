import { PaddleOCROptions } from "../typings"
import * as tf from "@tensorflow/tfjs"
import * as ort from "onnxruntime-web"
import { buildModelPath, buildWasmPath } from "../utils/modelPath"
import { isBrowser } from "../utils/env"

/**
 * 模型加载器 - 支持多种后端和模型格式
 */
export class ModelLoader {
  private options: PaddleOCROptions
  private modelsCache: Map<string, any> = new Map()
  private isInitialized = false

  constructor(options: PaddleOCROptions) {
    this.options = options
  }

  public async init(): Promise<void> {
    if (this.isInitialized) return

    // 初始化后端
    await this.initializeBackend()
    this.isInitialized = true
  }

  /**
   * 初始化 ML 后端
   */
  private async initializeBackend(): Promise<void> {
    // TensorFlow.js 初始化
    if (this.options.useTensorflow && this.options.useWasm) {
      await this.initTFWasm()
    } else if (this.options.useTensorflow && this.options.enableGPU) {
      await this.initTFGPU()
    } else if (this.options.useTensorflow) {
      await this.initTFCPU()
    }

    // ONNX Runtime 初始化
    if (this.options.useONNX) {
      await this.initONNXRuntime()
    }
  }

  /**
   * 初始化 TensorFlow.js WASM 后端
   */
  private async initTFWasm(): Promise<void> {
    console.log("加载 TensorFlow.js WASM 后端...")
    try {
      await tf.setBackend("wasm")
      await tf.ready()
      console.log("TensorFlow.js WASM 后端加载完成")
    } catch (error) {
      console.error("TensorFlow.js WASM 后端加载失败:", error)
      throw error
    }
  }

  /**
   * 初始化 TensorFlow.js GPU 后端
   */
  private async initTFGPU(): Promise<void> {
    if (!isBrowser()) {
      console.log("Node.js 环境，使用 TensorFlow.js CPU 后端")
      return this.initTFCPU()
    }

    console.log("加载 TensorFlow.js GPU 后端...")
    try {
      await tf.setBackend("webgl")
      await tf.ready()
      console.log("TensorFlow.js GPU 后端加载完成")
    } catch (error) {
      console.warn("GPU 后端加载失败，回退到 CPU 后端:", error)
      return this.initTFCPU()
    }
  }

  /**
   * 初始化 TensorFlow.js CPU 后端
   */
  private async initTFCPU(): Promise<void> {
    console.log("加载 TensorFlow.js CPU 后端...")
    try {
      await tf.setBackend("cpu")
      await tf.ready()
      console.log("TensorFlow.js CPU 后端加载完成")
    } catch (error) {
      console.error("TensorFlow.js CPU 后端加载失败:", error)
      throw error
    }
  }

  /**
   * 初始化 ONNX Runtime
   */
  private async initONNXRuntime(): Promise<void> {
    console.log("配置 ONNX Runtime...")
    if (isBrowser()) {
      // 浏览器端需要配置 Wasm 路径
      ort.env.wasm.wasmPaths = {
        "ort-wasm.wasm": buildWasmPath(this.options.modelPath || "./models", "ort-wasm.wasm"),
        "ort-wasm-threaded.wasm": buildWasmPath(
          this.options.modelPath || "./models",
          "ort-wasm-threaded.wasm"
        ),
        "ort-wasm-simd.wasm": buildWasmPath(
          this.options.modelPath || "./models",
          "ort-wasm-simd.wasm"
        ),
        "ort-wasm-simd-threaded.wasm": buildWasmPath(
          this.options.modelPath || "./models",
          "ort-wasm-simd-threaded.wasm"
        ),
      } as any
      console.log("ONNX Runtime 配置完成")
    }
  }

  /**
   * 加载文本检测模型
   */
  public async loadDetectionModel(
    modelName: string = "DB",
    language: string = "ch"
  ): Promise<any> {
    return this.loadModel({
      modelType: "detection",
      modelName,
      language,
      framework: this.options.useONNX ? "onnx" : "tfjs",
    })
  }

  /**
   * 加载文本识别模型
   */
  public async loadRecognitionModel(
    modelName: string = "CRNN",
    language: string = "ch"
  ): Promise<any> {
    return this.loadModel({
      modelType: "recognition",
      modelName,
      language,
      framework: this.options.useONNX ? "onnx" : "tfjs",
    })
  }

  /**
   * 加载布局分析模型
   */
  public async loadLayoutModel(modelName: string = "LayoutLM"): Promise<any> {
    return this.loadModel({
      modelType: "layout",
      modelName,
      framework: this.options.useONNX ? "onnx" : "tfjs",
    })
  }

  /**
   * 加载表格识别模型
   */
  public async loadTableModel(modelName: string = "TableRec"): Promise<any> {
    return this.loadModel({
      modelType: "table",
      modelName,
      framework: this.options.useONNX ? "onnx" : "tfjs",
    })
  }

  /**
   * 加载公式识别模型
   */
  public async loadFormulaModel(modelName: string = "TexiRec"): Promise<any> {
    return this.loadModel({
      modelType: "formula",
      modelName,
      framework: this.options.useONNX ? "onnx" : "tfjs",
    })
  }

  /**
   * 加载条码识别模型
   */
  public async loadBarcodeModel(): Promise<any> {
    return this.loadModel({
      modelType: "barcode",
      modelName: "detect",
      framework: this.options.useONNX ? "onnx" : "tfjs",
    })
  }

  /**
   * 模型加载配置
   */
  private async loadModel(
    config: {
      modelType: "detection" | "recognition" | "layout" | "table" | "formula" | "barcode"
      modelName: string
      language?: string
      framework: "tfjs" | "onnx"
    }
  ): Promise<any> {
    const cacheKey = `${config.modelType}-${config.modelName}-${config.framework}-${config.language || "default"}`

    // 检查缓存
    if (this.modelsCache.has(cacheKey)) {
      console.log(`从缓存加载模型: ${cacheKey}`)
      return this.modelsCache.get(cacheKey)
    }

    try {
      if (config.framework === "tfjs") {
        return await this.loadTFJSModel(config)
      } else {
        return await this.loadONNXModel(config)
      }
    } catch (error) {
      console.error(`模型加载失败 (${cacheKey}):`, error)
      throw error
    }
  }

  /**
   * 加载 TensorFlow.js 模型
   */
  private async loadTFJSModel(
    config: {
      modelType: "detection" | "recognition" | "layout" | "table" | "formula" | "barcode"
      modelName: string
      language?: string
      framework: "tfjs" | "onnx"
    }
  ): Promise<any> {
    const modelPath = buildModelPath({
      modelPath: this.options.modelPath || "./models",
      modelType: config.modelType,
      modelName: config.modelName,
      language: config.language,
      extension: ".json",
    })

    console.log(`正在加载TensorFlow.js模型: ${modelPath}`)
    const model = await tf.loadGraphModel(modelPath)
    console.log("TensorFlow.js 模型加载完成")

    // 缓存模型
    const cacheKey = `${config.modelType}-${config.modelName}-tfjs-${config.language || "default"}`
    this.modelsCache.set(cacheKey, model)

    return model
  }

  /**
   * 加载 ONNX 模型
   */
  private async loadONNXModel(
    config: {
      modelType: "detection" | "recognition" | "layout" | "table" | "formula" | "barcode"
      modelName: string
      language?: string
      framework: "tfjs" | "onnx"
    }
  ): Promise<any> {
    const modelPath = buildModelPath({
      modelPath: this.options.modelPath || "./models",
      modelType: config.modelType,
      modelName: config.modelName,
      language: config.language,
      extension: ".onnx",
    })

    console.log(`正在加载ONNX模型: ${modelPath}`)
    const session = await ort.InferenceSession.create(modelPath, {
      executionProviders: this.options.enableGPU
        ? ["webgl", "wasm"]
        : ["wasm"],
    })
    console.log("ONNX 模型加载完成")

    // 缓存模型
    const cacheKey = `${config.modelType}-${config.modelName}-onnx-${config.language || "default"}`
    this.modelsCache.set(cacheKey, session)

    return session
  }

  /**
   * 释放模型资源
   */
  public dispose(): void {
    console.log("释放所有模型...")
    this.modelsCache.forEach((model) => {
      try {
        model.dispose?.()
        // ONNX session 可能有不同的释放方法
      } catch (error) {
        console.warn("释放模型失败:", error)
      }
    })
    this.modelsCache.clear()
    this.isInitialized = false
  }
}

export default ModelLoader
