import { PaddleOCROptions, TextBox } from "../typings"
import { OCRImageData as ImageData } from "../utils/image"
import { ImageProcessor } from "../utils/imageProcessor"
import { ModelLoader } from "../utils/ModelLoader"
import { BaseRecognizer } from "./BaseRecognizer"

/**
 * 文本检测类
 * 负责检测图像中的文本区域
 */
export class TextDetector extends BaseRecognizer {
  private modelLoader: ModelLoader
  private model: any = null

  /**
   * 创建文本检测器实例
   * @param options 配置选项
   */
  constructor(options: PaddleOCROptions) {
    super(options)
    this.modelLoader = new ModelLoader(options)
  }

  /**
   * 初始化检测模型
   */
  public async init(): Promise<void> {
    if (this.isInitialized) {
      return
    }

    try {
      // 使用 ModelLoader 统一加载模型
      this.model = await this.modelLoader.loadDetectionModel()
      this.isInitialized = true
    } catch (error) {
      console.error("文本检测模型初始化失败:", error)
      throw error
    }
  }

  /**
   * 检测图像中的文本区域
   * @param image 输入图像
   */
  public async detect(image: ImageData): Promise<TextBox[]> {
    this.checkInitialized()

    try {
      // 预处理图像
      const processedImage = ImageProcessor.preprocess(image)

      // 根据模型类型执行推理
      let predictions
      if (this.options.useTensorflow) {
        predictions = await this.detectWithTensorflow(processedImage)
      } else if (this.options.useONNX) {
        predictions = await this.detectWithONNX(processedImage)
      } else {
        throw new Error("未指定模型后端")
      }

      // 后处理结果
      return this.postprocess(predictions, image.width, image.height)
    } catch (error) {
      console.error("文本检测失败:", error)
      throw error
    }
  }

  /**
   * 使用 TensorFlow 进行检测
   */
  private async detectWithTensorflow(processedImage: any): Promise<any> {
    const tf = require("@tensorflow/tfjs")
    const input = tf
      .tensor(processedImage.data)
      .reshape([1, processedImage.height, processedImage.width, 3])

    // 执行模型推理
    const result = await this.model.predict(input)

    // 释放张量
    input.dispose()

    return result
  }

  /**
   * 使用 ONNX 进行检测
   */
  private async detectWithONNX(processedImage: any): Promise<any> {
    // 准备 ONNX 输入
    const input = new Float32Array(processedImage.data)
    const inputTensor = new (require("onnxruntime-web").Tensor)(
      "float32",
      input,
      [1, 3, processedImage.height, processedImage.width]
    )

    // 运行推理
    const feeds = { input: inputTensor }
    const results = await this.model.run(feeds)

    return results
  }

  /**
   * 后处理检测结果
   */
  private postprocess(
    predictions: any,
    originalWidth: number,
    originalHeight: number
  ): TextBox[] {
    // TODO: 实现真实的 DBNet/EAST 后处理逻辑
    return []
  }

  /**
   * 释放资源
   */
  public async dispose(): Promise<void> {
    // 释放模型
    this.disposeModel(this.model)
    this.model = null
    
    // 释放 ModelLoader
    if (this.modelLoader && typeof this.modelLoader.dispose === "function") {
      await this.modelLoader.dispose()
    }
    
    // 调用基类清理
    await super.dispose()
  }
}
