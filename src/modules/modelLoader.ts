import { PaddleOCROptions } from "../typings"
import { isNode, isBrowser } from "../utils/env"

// 定义类型接口，避免TS报错
interface TensorflowNode {
  setBackend: (backend: string) => Promise<boolean>
}

interface OnnxRuntime {
  InferenceSession: {
    create: (path: string, options: any) => Promise<any>
  }
  env?: {
    wasm?: {
      wasmPaths?: any
      numThreads?: number
    }
  }
}

interface TensorflowEngine {
  endScope(): void
  // 兼容不同版本的TF.js
  dispose?(): void
  disposeVariables?(): void
}

/**
 * 模型加载器 - 负责加载和管理OCR模型
 */
export class ModelLoader {
  private options: PaddleOCROptions
  private modelCache: Map<string, any> = new Map()
  private loadingPromises: Map<string, Promise<any>> = new Map()
  private initialized = false

  /**
   * 支持的文本检测模型
   */
  public static readonly DETECTION_MODELS = [
    "DB", // 标准DBNet模型
    "DB++", // 改进版DBNet模型
    "East", // EAST文本检测器
    "SAST", // 方向感知文本检测
    "PSENet", // 渐进尺度扩展网络
    "FCENet", // 傅里叶轮廓嵌入网络
  ]

  /**
   * 支持的文本识别模型
   */
  public static readonly RECOGNITION_MODELS = [
    "CRNN", // 经典CRNN模型
    "SVTR", // 视觉Transformer识别
    "SVTR_LCNet", // 轻量级SVTR
    "Rosetta", // Rosetta识别模型
    "SEED", // SEED语义增强编码解码器
    "SAR", // 显式对齐注意力的序列识别
    "NRTR", // 基于Transformer的OCR
    "ViTSTR", // 基于Vision Transformer的识别
    "ABINet", // 自适应二元集成网络
    "VisionLAN", // 语言感知视觉表示学习
    "SPIN", // 视觉语言自监督学习
    "RobustScanner", // 稳健文本识别器
    "PP-OCRv3", // 飞桨OCRv3模型
  ]

  /**
   * 支持的布局分析模型
   */
  public static readonly LAYOUT_MODELS = [
    "PicoDetLayout", // 基于PicoDet的轻量级布局分析模型
    "LayoutXLM", // 跨语言布局分析模型
    "LayoutLMv2", // 微软第二代布局分析模型
    "PP-Structure", // 飞桨文档版面分析模型
  ]

  /**
   * 支持的表格识别模型
   */
  public static readonly TABLE_MODELS = [
    "TableMaster", // 端到端表格识别
    "TableNet", // 表格结构和内容识别
    "SLANet", // 结构线条感知网络
    "PP-Structure", // 飞桨文档结构化分析
  ]

  /**
   * 创建模型加载器实例
   * @param options 配置选项
   */
  constructor(options: PaddleOCROptions) {
    this.options = options
  }

  /**
   * 初始化模型加载器
   */
  public async init(): Promise<void> {
    if (this.initialized) {
      return
    }

    // 根据后端类型选择合适的处理方法
    if (this.options.useTensorflow) {
      await this.initTensorflow()
    } else if (this.options.useONNX) {
      await this.initONNX()
    } else {
      throw new Error("未指定模型后端，请设置useTensorflow或useONNX选项")
    }

    this.initialized = true
  }

  /**
   * 初始化TensorFlow.js环境
   */
  private async initTensorflow(): Promise<void> {
    try {
      const tf = await this.loadTensorflow()

      // 根据运行环境设置合适的后端
      if (isBrowser()) {
        if (this.options.useWasm) {
          try {
            // 尝试加载WASM后端
            const tfWasm = await import("@tensorflow/tfjs-backend-wasm")
            await tfWasm.setWasmPaths(
              this.options.modelPath + "/tfjs-backend-wasm/"
            )
            await tf.setBackend("wasm")
            console.log("已成功启用TensorFlow.js WASM后端")
          } catch (error) {
            console.warn("WASM后端初始化失败，将使用WebGL后端", error)
            await tf.setBackend("webgl")
          }
        } else {
          await tf.setBackend("webgl")
          console.log("已启用TensorFlow.js WebGL后端")
        }
      } else if (isNode()) {
        if (this.options.enableGPU) {
          try {
            // 使用动态导入和类型断言处理Node.js特定依赖
            try {
              // 尝试动态导入GPU版本
              const tfNodeGPU = (await this.safeImport(
                "@tensorflow/tfjs-node-gpu"
              )) as TensorflowNode
              await tf.setBackend("tensorflow")
              console.log("已成功启用TensorFlow.js GPU后端")
            } catch (error) {
              console.warn("GPU后端初始化失败，将使用CPU后端", error)
              const tfNode = (await this.safeImport(
                "@tensorflow/tfjs-node"
              )) as TensorflowNode
              await tf.setBackend("tensorflow")
            }
          } catch (error) {
            console.warn("无法加载Node.js后端，将使用默认后端", error)
          }
        } else {
          try {
            const tfNode = (await this.safeImport(
              "@tensorflow/tfjs-node"
            )) as TensorflowNode
            await tf.setBackend("tensorflow")
            console.log("已启用TensorFlow.js CPU后端")
          } catch (error) {
            console.warn("无法加载Node.js后端，将使用默认后端", error)
          }
        }
      }

      // 设置内存和线程优化
      await tf.ready()
      if (isBrowser()) {
        // 浏览器环境下的优化设置
        tf.env().set("WEBGL_FORCE_F16_TEXTURES", true) // 使用低精度纹理以节省内存
        tf.env().set("WEBGL_PACK", true) // 启用纹理打包以提高性能
        tf.env().set("WEBGL_CPU_FORWARD", false) // 禁用CPU前向传播
        tf.env().set("WEBGL_PACK_DEPTHWISECONV", true) // 启用深度卷积打包
      }
    } catch (error) {
      console.error("TensorFlow.js初始化失败:", error)
      throw new Error("TensorFlow.js初始化失败: " + (error as Error).message)
    }
  }

  /**
   * 安全地导入模块，处理可能不存在的模块
   */
  private async safeImport(moduleName: string): Promise<any> {
    try {
      // 使用动态导入
      return await import(/* webpackIgnore: true */ moduleName)
    } catch (error) {
      console.warn(`导入模块 ${moduleName} 失败:`, error)
      // 返回一个空对象以防止后续操作出错
      return {}
    }
  }

  /**
   * 加载TensorFlow.js库
   */
  private async loadTensorflow(): Promise<any> {
    try {
      // 动态导入TensorFlow.js
      const tf = await import("@tensorflow/tfjs")
      return tf
    } catch (error) {
      console.error("无法加载TensorFlow.js:", error)
      throw new Error("无法加载TensorFlow.js: " + (error as Error).message)
    }
  }

  /**
   * 初始化ONNX Runtime环境
   */
  private async initONNX(): Promise<void> {
    try {
      if (isBrowser()) {
        // 浏览器环境下的ONNX Runtime初始化
        const ort = (await import("onnxruntime-web")) as OnnxRuntime

        // 设置WASM文件路径 - 使用类型断言解决类型不匹配问题
        const wasmPaths = {
          "ort-wasm.wasm": `${this.options.modelPath}/onnxruntime-web/ort-wasm.wasm`,
          "ort-wasm-threaded.wasm": `${this.options.modelPath}/onnxruntime-web/ort-wasm-threaded.wasm`,
          "ort-wasm-simd.wasm": `${this.options.modelPath}/onnxruntime-web/ort-wasm-simd.wasm`,
          "ort-wasm-simd-threaded.wasm": `${this.options.modelPath}/onnxruntime-web/ort-wasm-simd-threaded.wasm`,
        }

        // 设置ONNX Runtime选项
        const ortOptions = {
          executionProviders: ["wasm"],
          graphOptimizationLevel: "all",
          enableCpuMemArena: true,
          enableMemPattern: true,
          enableProfiling: false,
        }

        // 使用类型断言解决类型不匹配问题
        if (ort.env && ort.env.wasm) {
          ort.env.wasm.wasmPaths = wasmPaths as any
          ort.env.wasm.numThreads =
            navigator.hardwareConcurrency > 4
              ? 4
              : navigator.hardwareConcurrency
        }

        console.log("已初始化ONNX Runtime Web环境")
      } else if (isNode()) {
        // Node.js环境下的ONNX Runtime初始化 - 使用安全导入
        try {
          const ort = (await this.safeImport("onnxruntime-node")) as OnnxRuntime
          console.log("已初始化ONNX Runtime Node环境")
        } catch (error) {
          console.warn(
            "ONNX Runtime Node环境初始化失败，可能影响Node.js环境下的性能",
            error
          )
        }
      }
    } catch (error) {
      console.error("ONNX Runtime初始化失败:", error)
      throw new Error("ONNX Runtime初始化失败: " + (error as Error).message)
    }
  }

  /**
   * 加载模型
   * @param modelType 模型类型，如'det'、'rec'、'layout'、'table'
   * @param modelName 模型名称
   * @param language 语言（仅用于识别模型）
   */
  public async loadModel(
    modelType: "det" | "rec" | "layout" | "table",
    modelName: string,
    language?: string
  ): Promise<any> {
    // 生成模型标识符
    const modelId = this.getModelId(modelType, modelName, language)

    // 检查模型是否已缓存
    if (this.modelCache.has(modelId)) {
      return this.modelCache.get(modelId)
    }

    // 检查模型是否正在加载
    if (this.loadingPromises.has(modelId)) {
      return this.loadingPromises.get(modelId)
    }

    // 开始加载模型
    let loadPromise: Promise<any>
    if (this.options.useTensorflow) {
      loadPromise = this.loadTensorflowModel(modelType, modelName, language)
    } else if (this.options.useONNX) {
      loadPromise = this.loadONNXModel(modelType, modelName, language)
    } else {
      throw new Error("未指定模型后端")
    }

    // 缓存加载Promise以避免重复加载
    this.loadingPromises.set(modelId, loadPromise)

    try {
      // 等待模型加载完成
      const model = await loadPromise

      // 将模型添加到缓存
      this.modelCache.set(modelId, model)

      // 从加载Promise缓存中移除
      this.loadingPromises.delete(modelId)

      return model
    } catch (error) {
      // 加载失败时从Promise缓存中移除
      this.loadingPromises.delete(modelId)
      console.error(`加载模型 ${modelId} 失败:`, error)
      throw error
    }
  }

  /**
   * 使用TensorFlow.js加载模型
   */
  private async loadTensorflowModel(
    modelType: "det" | "rec" | "layout" | "table",
    modelName: string,
    language?: string
  ): Promise<any> {
    try {
      const tf = await import("@tensorflow/tfjs")

      // 构建模型路径
      let modelPath = `${this.options.modelPath}/`

      switch (modelType) {
        case "det":
          modelPath += `det_${modelName.toLowerCase()}/model.json`
          break
        case "rec":
          modelPath += `rec_${modelName.toLowerCase()}/${
            language ? `model_${language.toLowerCase()}` : "model"
          }.json`
          break
        case "layout":
          modelPath += `layout_${modelName.toLowerCase()}/model.json`
          break
        case "table":
          modelPath += `table_${modelName.toLowerCase()}/model.json`
          break
        default:
          throw new Error(`不支持的模型类型: ${modelType}`)
      }

      console.log(`正在加载TensorFlow.js模型: ${modelPath}`)

      // 加载模型
      const model = await tf.loadGraphModel(modelPath)

      // 预热模型 - 通过小批量数据预热提高首次推理速度
      await this.warmupTensorflowModel(model, modelType)

      return model
    } catch (error) {
      console.error(`加载TensorFlow.js模型失败:`, error)
      throw new Error(`加载TensorFlow.js模型失败: ${(error as Error).message}`)
    }
  }

  /**
   * 使用ONNX Runtime加载模型
   */
  private async loadONNXModel(
    modelType: "det" | "rec" | "layout" | "table",
    modelName: string,
    language?: string
  ): Promise<any> {
    try {
      // 使用条件导入，并处理可能的导入错误
      let ort: OnnxRuntime
      if (isBrowser()) {
        ort = (await import("onnxruntime-web")) as OnnxRuntime
      } else {
        try {
          ort = (await this.safeImport("onnxruntime-node")) as OnnxRuntime
        } catch (error) {
          console.warn("无法导入onnxruntime-node，将使用onnxruntime-web", error)
          ort = (await import("onnxruntime-web")) as OnnxRuntime
        }
      }

      // 构建模型路径
      let modelPath = `${this.options.modelPath}/`

      switch (modelType) {
        case "det":
          modelPath += `det_${modelName.toLowerCase()}/model.onnx`
          break
        case "rec":
          modelPath += `rec_${modelName.toLowerCase()}/${
            language ? `model_${language.toLowerCase()}` : "model"
          }.onnx`
          break
        case "layout":
          modelPath += `layout_${modelName.toLowerCase()}/model.onnx`
          break
        case "table":
          modelPath += `table_${modelName.toLowerCase()}/model.onnx`
          break
        default:
          throw new Error(`不支持的模型类型: ${modelType}`)
      }

      console.log(`正在加载ONNX模型: ${modelPath}`)

      // 设置ONNX会话选项
      const sessionOptions = {
        executionProviders: isBrowser() ? ["wasm"] : ["cpu"],
        graphOptimizationLevel: "all",
        enableCpuMemArena: true,
        enableMemPattern: true,
      }

      // 创建会话
      const session = await ort.InferenceSession.create(
        modelPath,
        sessionOptions
      )

      return session
    } catch (error) {
      console.error(`加载ONNX模型失败:`, error)
      throw new Error(`加载ONNX模型失败: ${(error as Error).message}`)
    }
  }

  /**
   * 预热TensorFlow.js模型
   */
  private async warmupTensorflowModel(
    model: any,
    modelType: string
  ): Promise<void> {
    try {
      const tf = await import("@tensorflow/tfjs")

      // 根据模型类型创建不同的预热输入
      let dummyInput: any

      switch (modelType) {
        case "det":
          // 检测模型通常接受形状为[1, height, width, 3]的输入
          dummyInput = tf.zeros([1, 64, 64, 3])
          break
        case "rec":
          // 识别模型通常接受形状为[1, height, width, 3]或[1, 3, height, width]的输入
          dummyInput = tf.zeros([1, 32, 320, 3])
          break
        case "layout":
        case "table":
          // 版面和表格模型通常接受较大尺寸的输入
          dummyInput = tf.zeros([1, 128, 128, 3])
          break
        default:
          // 默认预热输入
          dummyInput = tf.zeros([1, 64, 64, 3])
      }

      // 执行一次推理以预热模型
      const result = await model.predict(dummyInput)

      // 清理资源
      tf.dispose([dummyInput, result])
    } catch (error) {
      console.warn(`模型预热失败:`, error)
      // 预热失败不应阻止模型加载
    }
  }

  /**
   * 生成模型标识符
   */
  private getModelId(
    modelType: string,
    modelName: string,
    language?: string
  ): string {
    return `${modelType}_${modelName.toLowerCase()}${
      language ? `_${language.toLowerCase()}` : ""
    }`
  }

  /**
   * 加载词汇表文件
   * @param modelType 模型类型
   * @param modelName 模型名称
   * @param language 语言代码
   */
  public async loadVocab(
    modelType: "rec",
    modelName: string,
    language: string
  ): Promise<string[]> {
    try {
      const vocabPath = `${
        this.options.modelPath
      }/rec_${modelName.toLowerCase()}/vocab_${language.toLowerCase()}.txt`

      console.log(`加载词汇表: ${vocabPath}`)

      let vocabText: string

      if (isBrowser()) {
        // 浏览器环境使用fetch
        const response = await fetch(vocabPath)
        if (!response.ok) {
          throw new Error(`HTTP错误 ${response.status}: ${response.statusText}`)
        }
        vocabText = await response.text()
      } else {
        // Node.js环境使用fs
        try {
          const fs = require("fs").promises
          vocabText = await fs.readFile(vocabPath, "utf-8")
        } catch (error) {
          throw new Error(`读取词汇表文件失败: ${(error as Error).message}`)
        }
      }

      // 处理词汇表数据
      const vocab = vocabText.trim().split("\n")
      console.log(`词汇表加载完成，包含 ${vocab.length} 个字符`)

      return vocab
    } catch (error) {
      console.error(`加载词汇表失败:`, error)
      throw new Error(`加载词汇表失败: ${(error as Error).message}`)
    }
  }

  /**
   * 释放所有模型资源
   */
  public async dispose(): Promise<void> {
    try {
      // 停止所有进行中的加载
      this.loadingPromises.clear()

      // 清理TensorFlow.js模型
      if (this.options.useTensorflow) {
        for (const [id, model] of this.modelCache.entries()) {
          if (model && typeof model.dispose === "function") {
            model.dispose()
            console.log(`已释放TensorFlow.js模型: ${id}`)
          }
        }

        // 清理TensorFlow内存
        try {
          const tf = await import("@tensorflow/tfjs")
          const engine = tf.engine() as TensorflowEngine

          // 安全地调用可能存在的方法
          if (typeof tf.disposeVariables === "function") {
            tf.disposeVariables()
          }

          if (typeof engine.endScope === "function") {
            engine.endScope()
          }

          // 兼容不同版本的TF.js
          if (typeof engine.dispose === "function") {
            engine.dispose()
          }
        } catch (e) {
          console.warn("清理TensorFlow内存失败:", e)
        }
      }

      // ONNX模型不需要显式释放，GC会自动处理

      // 清空缓存
      this.modelCache.clear()
      this.initialized = false

      console.log("已成功释放所有模型资源")
    } catch (error) {
      console.error("释放模型资源时出错:", error)
      throw new Error(`释放模型资源失败: ${(error as Error).message}`)
    }
  }
}
