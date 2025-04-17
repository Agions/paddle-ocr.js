import {
  PaddleOCROptions,
  OCRResult,
  TableResult,
  LayoutResult,
  ImageSource,
  ProcessOptions,
} from "./typings"
import { loadImage } from "./utils/image"
import { TextDetector } from "./modules/textDetector"
import { TextRecognizer } from "./modules/textRecognizer"
import { TableRecognizer } from "./modules/tableRecognizer"
import { LayoutAnalyzer } from "./modules/layoutAnalyzer"
import { isNode, isBrowser } from "./utils/env"

/**
 * PaddleOCR - 基于飞桨的OCR识别库
 */
class PaddleOCR {
  private options: PaddleOCROptions
  private detector: TextDetector | null = null
  private recognizer: TextRecognizer | null = null
  private tableRecognizer: TableRecognizer | null = null
  private layoutAnalyzer: LayoutAnalyzer | null = null
  private isInitialized = false

  // 静态属性，将在主入口中被设置
  public static version: string

  /**
   * 创建PaddleOCR实例
   * @param options 配置选项
   */
  constructor(options: PaddleOCROptions = {}) {
    // 默认配置
    const defaultOptions: PaddleOCROptions = {
      modelPath: isBrowser() ? "/models" : "./models",
      useTensorflow: true,
      useONNX: false,
      useWasm: true,
      enableDetection: true,
      detectionModel: "DB",
      enableRecognition: true,
      recognitionModel: "CRNN",
      language: "ch",
      enableTable: false,
      enableLayout: false,
      enableFormula: false,
      maxSideLen: 960,
      threshold: 0.3,
      batchSize: 1,
      enableGPU: false,
    }

    this.options = { ...defaultOptions, ...options }
  }

  /**
   * 初始化模型
   */
  public async init(): Promise<void> {
    if (this.isInitialized) {
      return
    }

    try {
      // 初始化进度
      let progress = 0
      const updateProgress = (increment: number, stage: string) => {
        progress += increment
        if (this.options.onProgress) {
          this.options.onProgress(progress, stage)
        }
      }

      // 设置环境
      if (isNode()) {
        // Node环境特定设置
        if (this.options.useTensorflow) {
          try {
            // 在Node环境中尝试加载tfjs-node
            require("@tensorflow/tfjs-node")
          } catch (e) {
            console.warn("未安装@tensorflow/tfjs-node，将使用CPU进行计算")
            require("@tensorflow/tfjs")
          }
        }
      } else if (isBrowser()) {
        // 浏览器环境特定设置
        const tf = require("@tensorflow/tfjs")
        if (this.options.useWasm) {
          try {
            await require("@tensorflow/tfjs-backend-wasm").setWasmPaths(
              this.options.modelPath + "/tfjs-backend-wasm/"
            )
            await tf.setBackend("wasm")
          } catch (e) {
            console.warn("WASM后端加载失败，将使用WebGL后端")
            await tf.setBackend("webgl")
          }
        } else {
          await tf.setBackend("webgl")
        }
      }

      // 初始化各个模块
      if (this.options.enableDetection) {
        this.detector = new TextDetector(this.options)
        await this.detector.init()
        updateProgress(25, "文本检测模型加载完成")
      }

      if (this.options.enableRecognition) {
        this.recognizer = new TextRecognizer(this.options)
        await this.recognizer.init()
        updateProgress(25, "文本识别模型加载完成")
      }

      if (this.options.enableTable) {
        this.tableRecognizer = new TableRecognizer(this.options)
        await this.tableRecognizer.init()
        updateProgress(25, "表格识别模型加载完成")
      }

      if (this.options.enableLayout) {
        this.layoutAnalyzer = new LayoutAnalyzer(this.options)
        await this.layoutAnalyzer.init()
        updateProgress(25, "版面分析模型加载完成")
      }

      this.isInitialized = true
      updateProgress(0, "初始化完成")
    } catch (error) {
      console.error("PaddleOCR初始化失败:", error)
      throw error
    }
  }

  /**
   * 执行OCR识别
   * @param image 输入图像
   * @param options 处理选项
   */
  public async recognize(
    image: ImageSource,
    options: ProcessOptions = {}
  ): Promise<OCRResult> {
    if (!this.isInitialized) {
      await this.init()
    }

    // 处理选项
    const processOptions: ProcessOptions = {
      mode: "text",
      returnOriginalImage: false,
      useAngle: false,
      useDeskew: false,
      ...options,
    }

    // 加载图像
    const startTime = Date.now()
    const img = await loadImage(image)

    let detectionResults = []
    let recognitionResults = []

    // 文本检测
    let detectionTime = 0
    if (this.detector && this.options.enableDetection) {
      const detectionStart = Date.now()
      detectionResults = await this.detector.detect(img)
      detectionTime = Date.now() - detectionStart
    }

    // 文本识别
    let recognitionTime = 0
    if (this.recognizer && this.options.enableRecognition) {
      const recognitionStart = Date.now()
      if (detectionResults.length > 0) {
        recognitionResults = await this.recognizer.recognize(
          img,
          detectionResults
        )
      } else {
        // 如果没有检测结果，则对整个图像进行识别
        recognitionResults = await this.recognizer.recognize(img)
      }
      recognitionTime = Date.now() - recognitionStart
    }

    const totalTime = Date.now() - startTime

    return {
      textDetection: detectionResults,
      textRecognition: recognitionResults,
      duration: {
        preprocess: totalTime - detectionTime - recognitionTime,
        detection: detectionTime,
        recognition: recognitionTime,
        total: totalTime,
      },
    }
  }

  /**
   * 表格识别
   * @param image 输入图像
   * @param options 处理选项
   */
  public async recognizeTable(
    image: ImageSource,
    options: ProcessOptions = {}
  ): Promise<TableResult> {
    if (!this.isInitialized) {
      await this.init()
    }

    if (!this.tableRecognizer || !this.options.enableTable) {
      throw new Error("表格识别未启用，请设置enableTable选项为true")
    }

    const img = await loadImage(image)
    return await this.tableRecognizer.recognize(img)
  }

  /**
   * 版面分析
   * @param image 输入图像
   * @param options 处理选项
   */
  public async analyzeLayout(
    image: ImageSource,
    options: ProcessOptions = {}
  ): Promise<LayoutResult> {
    if (!this.isInitialized) {
      await this.init()
    }

    if (!this.layoutAnalyzer || !this.options.enableLayout) {
      throw new Error("版面分析未启用，请设置enableLayout选项为true")
    }

    const img = await loadImage(image)
    return await this.layoutAnalyzer.analyze(img)
  }

  /**
   * 获取当前配置
   */
  public getOptions(): PaddleOCROptions {
    return { ...this.options }
  }

  /**
   * 更新配置
   * @param options 新的配置选项
   */
  public updateOptions(options: Partial<PaddleOCROptions>): void {
    this.options = { ...this.options, ...options }
  }

  /**
   * 释放资源
   */
  public async dispose(): Promise<void> {
    try {
      if (this.detector) {
        await this.detector.dispose()
        this.detector = null
      }

      if (this.recognizer) {
        await this.recognizer.dispose()
        this.recognizer = null
      }

      if (this.tableRecognizer) {
        await this.tableRecognizer.dispose()
        this.tableRecognizer = null
      }

      if (this.layoutAnalyzer) {
        await this.layoutAnalyzer.dispose()
        this.layoutAnalyzer = null
      }

      this.isInitialized = false
    } catch (error) {
      console.error("释放资源失败:", error)
      throw error
    }
  }
}

export default PaddleOCR
