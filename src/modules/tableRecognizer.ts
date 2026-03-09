import { PaddleOCROptions, TableResult, Point } from "../typings"
import { ImageData } from "../utils/image"
import { TextDetector } from "./textDetector"
import { TextRecognizer } from "./textRecognizer"

/**
 * 表格识别类
 * 负责识别图像中的表格结构和内容
 */
export class TableRecognizer {
  private options: PaddleOCROptions
  private structureModel: any = null
  private cellDetector: any = null
  private textDetector: TextDetector | null = null
  private textRecognizer: TextRecognizer | null = null
  private isInitialized = false

  /**
   * 创建表格识别器实例
   * @param options 配置选项
   */
  constructor(options: PaddleOCROptions) {
    this.options = {
      ...options,
      // 确保表格识别所需的配置项
      enableTable: true,
    }
  }

  /**
   * 初始化表格识别模型
   */
  public async init(): Promise<void> {
    if (this.isInitialized) {
      return
    }

    try {
      // 根据设置的后端选择模型加载方式
      if (this.options.useTensorflow) {
        await this.initTensorflowModels()
      } else if (this.options.useONNX) {
        await this.initONNXModels()
      } else {
        throw new Error("未指定模型后端")
      }

      // 初始化文本检测和识别模块
      if (!this.textDetector) {
        this.textDetector = new TextDetector(this.options)
        await this.textDetector.init()
      }

      if (!this.textRecognizer) {
        this.textRecognizer = new TextRecognizer(this.options)
        await this.textRecognizer.init()
      }

      this.isInitialized = true
    } catch (error) {
      console.error("表格识别模型初始化失败:", error)
      throw error
    }
  }

  /**
   * 初始化TensorFlow模型
   */
  private async initTensorflowModels(): Promise<void> {
    const tf = require("@tensorflow/tfjs")

    // 表格结构识别模型
    const structureModelPath = `${this.options.modelPath}/table/structure/model.json`
    console.log(`加载表格结构识别模型: ${structureModelPath}`)
    this.structureModel = await tf.loadGraphModel(structureModelPath)

    // 表格单元格检测模型
    const cellDetectorPath = `${this.options.modelPath}/table/cell/model.json`
    console.log(`加载表格单元格检测模型: ${cellDetectorPath}`)
    this.cellDetector = await tf.loadGraphModel(cellDetectorPath)
  }

  /**
   * 初始化ONNX模型
   */
  private async initONNXModels(): Promise<void> {
    const ort = require("onnxruntime-web")

    // 表格结构识别模型
    const structureModelPath = `${this.options.modelPath}/table/structure/model.onnx`
    console.log(`加载表格结构识别模型: ${structureModelPath}`)
    this.structureModel = await ort.InferenceSession.create(structureModelPath)

    // 表格单元格检测模型
    const cellDetectorPath = `${this.options.modelPath}/table/cell/model.onnx`
    console.log(`加载表格单元格检测模型: ${cellDetectorPath}`)
    this.cellDetector = await ort.InferenceSession.create(cellDetectorPath)
  }

  /**
   * 识别图像中的表格
   * @param image 输入图像
   */
  public async recognize(image: ImageData): Promise<TableResult> {
    if (!this.isInitialized) {
      await this.init()
    }

    try {
      // 预处理图像
      const processedImage = this.preprocessImage(image)

      // 表格结构识别
      const structureResult = await this.recognizeTableStructure(processedImage)

      // 单元格检测
      const cellBoxes = await this.detectTableCells(
        processedImage,
        structureResult
      )

      // 单元格文本识别
      const cellContents = await this.recognizeCellContents(image, cellBoxes)

      // 生成最终表格结果
      return this.generateTableResult(structureResult, cellContents)
    } catch (error) {
      console.error("表格识别失败:", error)
      throw error
    }
  }

  /**
   * 图像预处理
   */
  private preprocessImage(image: ImageData): any {
    // 在实际实现中，这里会进行图像归一化、缩放等预处理
    // 简化处理，返回原始图像
    return {
      data: new Float32Array(image.data),
      width: image.width,
      height: image.height,
    }
  }

  /**
   * 识别表格结构
   */
  private async recognizeTableStructure(processedImage: any): Promise<any> {
    console.log("识别表格结构...")

    // 根据模型后端选择相应的处理方式
    if (this.options.useTensorflow) {
      return await this.recognizeStructureWithTensorflow(processedImage)
    } else if (this.options.useONNX) {
      return await this.recognizeStructureWithONNX(processedImage)
    } else {
      throw new Error("未指定模型后端")
    }
  }

  /**
   * 使用TensorFlow识别表格结构
   */
  private async recognizeStructureWithTensorflow(
    processedImage: any
  ): Promise<any> {
    const tf = require("@tensorflow/tfjs")
    const input = tf
      .tensor(processedImage.data)
      .reshape([1, processedImage.height, processedImage.width, 3])

    // 执行模型推理
    const result = await this.structureModel.predict(input)

    // 释放张量
    input.dispose()

    // 模拟表格结构结果
    return {
      rows: 5,
      cols: 4,
      lines: {
        horizontal: [
          { y: 0.1, x1: 0.1, x2: 0.9 },
          { y: 0.3, x1: 0.1, x2: 0.9 },
          { y: 0.5, x1: 0.1, x2: 0.9 },
          { y: 0.7, x1: 0.1, x2: 0.9 },
          { y: 0.9, x1: 0.1, x2: 0.9 },
        ],
        vertical: [
          { x: 0.1, y1: 0.1, y2: 0.9 },
          { x: 0.3, y1: 0.1, y2: 0.9 },
          { x: 0.5, y1: 0.1, y2: 0.9 },
          { x: 0.7, y1: 0.1, y2: 0.9 },
          { x: 0.9, y1: 0.1, y2: 0.9 },
        ],
      },
    }
  }

  /**
   * 使用ONNX识别表格结构
   */
  private async recognizeStructureWithONNX(processedImage: any): Promise<any> {
    // 准备ONNX输入
    const input = new Float32Array(processedImage.data)
    const inputTensor = new (require("onnxruntime-web").Tensor)(
      "float32",
      input,
      [1, 3, processedImage.height, processedImage.width]
    )

    // 运行推理
    const feeds = { input: inputTensor }
    const results = await this.structureModel.run(feeds)

    // 模拟表格结构结果
    return {
      rows: 5,
      cols: 4,
      lines: {
        horizontal: [
          { y: 0.1, x1: 0.1, x2: 0.9 },
          { y: 0.3, x1: 0.1, x2: 0.9 },
          { y: 0.5, x1: 0.1, x2: 0.9 },
          { y: 0.7, x1: 0.1, x2: 0.9 },
          { y: 0.9, x1: 0.1, x2: 0.9 },
        ],
        vertical: [
          { x: 0.1, y1: 0.1, y2: 0.9 },
          { x: 0.3, y1: 0.1, y2: 0.9 },
          { x: 0.5, y1: 0.1, y2: 0.9 },
          { x: 0.7, y1: 0.1, y2: 0.9 },
          { x: 0.9, y1: 0.1, y2: 0.9 },
        ],
      },
    }
  }

  /**
   * 检测表格单元格
   */
  private async detectTableCells(
    processedImage: any,
    structureResult: any
  ): Promise<any[]> {
    console.log("检测表格单元格...")

    // 使用结构信息生成单元格框
    const { rows, cols, lines } = structureResult
    const { width, height } = processedImage

    const cells = []

    // 根据行列和线条信息生成单元格
    for (let row = 0; row < rows - 1; row++) {
      for (let col = 0; col < cols - 1; col++) {
        const hLine1 = lines.horizontal[row]
        const hLine2 = lines.horizontal[row + 1]
        const vLine1 = lines.vertical[col]
        const vLine2 = lines.vertical[col + 1]

        // 单元格的四个角点
        const box: Point[] = [
          { x: vLine1.x * width, y: hLine1.y * height },
          { x: vLine2.x * width, y: hLine1.y * height },
          { x: vLine2.x * width, y: hLine2.y * height },
          { x: vLine1.x * width, y: hLine2.y * height },
        ]

        cells.push({
          box,
          row,
          col,
          rowspan: 1,
          colspan: 1,
        })
      }
    }

    return cells
  }

  /**
   * 识别单元格内容
   */
  private async recognizeCellContents(
    image: ImageData,
    cells: any[]
  ): Promise<any[]> {
    console.log("识别单元格内容...")

    if (!this.textDetector || !this.textRecognizer) {
      throw new Error("文本检测或识别模块未初始化")
    }

    const cellsWithContent = []

    for (const cell of cells) {
      // 从原图中裁剪出单元格区域
      const cellRegion = this.cropRegion(image, cell.box)

      // 检测单元格内的文本位置
      const textBoxes = await this.textDetector.detect(cellRegion)

      // 识别文本内容
      const textLines = await this.textRecognizer.recognize(
        cellRegion,
        textBoxes
      )

      // 单元格中可能有多行文本，合并为单个文本
      const text = textLines.map((line) => line.text).join(" ")

      cellsWithContent.push({
        ...cell,
        text,
      })
    }

    return cellsWithContent
  }

  /**
   * 从图像中裁剪区域
   */
  private cropRegion(image: ImageData, points: Point[]): ImageData {
    // 计算裁剪区域的边界
    let minX = Infinity,
      minY = Infinity,
      maxX = 0,
      maxY = 0

    for (const point of points) {
      minX = Math.min(minX, point.x)
      minY = Math.min(minY, point.y)
      maxX = Math.max(maxX, point.x)
      maxY = Math.max(maxY, point.y)
    }

    // 确保坐标在图像范围内
    minX = Math.max(0, Math.floor(minX))
    minY = Math.max(0, Math.floor(minY))
    maxX = Math.min(image.width - 1, Math.ceil(maxX))
    maxY = Math.min(image.height - 1, Math.ceil(maxY))

    const width = maxX - minX + 1
    const height = maxY - minY + 1

    // 创建一个新的图像数据来存储裁剪区域
    const regionData = new Uint8Array(width * height * 4)

    // 从原图复制像素
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const srcIdx = ((minY + y) * image.width + (minX + x)) * 4
        const dstIdx = (y * width + x) * 4

        regionData[dstIdx] = image.data[srcIdx] // R
        regionData[dstIdx + 1] = image.data[srcIdx + 1] // G
        regionData[dstIdx + 2] = image.data[srcIdx + 2] // B
        regionData[dstIdx + 3] = image.data[srcIdx + 3] // A
      }
    }

    return {
      width,
      height,
      data: regionData,
    }
  }

  /**
   * 生成最终表格结果
   */
  private generateTableResult(
    structureResult: any,
    cellContents: any[]
  ): TableResult {
    console.log("生成表格结果...")

    // 将单元格内容按行列组织
    const rowCount = structureResult.rows - 1
    const colCount = structureResult.cols - 1

    // 生成HTML表格
    let html = '<table border="1" cellspacing="0" cellpadding="5">'

    for (let r = 0; r < rowCount; r++) {
      html += "<tr>"

      for (let c = 0; c < colCount; c++) {
        const cell = cellContents.find(
          (cell) => cell.row === r && cell.col === c
        )

        if (cell) {
          const rowspanAttr =
            cell.rowspan > 1 ? ` rowspan="${cell.rowspan}"` : ""
          const colspanAttr =
            cell.colspan > 1 ? ` colspan="${cell.colspan}"` : ""

          html += `<td${rowspanAttr}${colspanAttr}>${cell.text || ""}</td>`
        }
      }

      html += "</tr>"
    }

    html += "</table>"

    return {
      structure: structureResult,
      cells: cellContents,
      html,
      markdown: this.convertToMarkdown(structureResult, cellContents),
    }
  }

  /**
   * 将表格转换为 Markdown 格式
   */
  private convertToMarkdown(structureResult: any, cellContents: any[]): string {
    const rowCount = structureResult.rows - 1
    const colCount = structureResult.cols - 1

    // 创建表头
    let markdown = "|"
    for (let c = 0; c < colCount; c++) {
      markdown += ` 列${c + 1} |`
    }
    markdown += "\n|"

    // 分隔行
    for (let c = 0; c < colCount; c++) {
      markdown += " --- |"
    }
    markdown += "\n"

    // 数据行
    for (let r = 0; r < rowCount; r++) {
      markdown += "|"
      for (let c = 0; c < colCount; c++) {
        const cell = cellContents.find((cell) => cell.row === r && cell.col === c)
        markdown += ` ${cell?.text || ""} |`
      }
      markdown += "\n"
    }

    return markdown
  }

  /**
   * 释放资源
   */
  public async dispose(): Promise<void> {
    try {
      if (
        this.structureModel &&
        typeof this.structureModel.dispose === "function"
      ) {
        this.structureModel.dispose()
      }

      if (
        this.cellDetector &&
        typeof this.cellDetector.dispose === "function"
      ) {
        this.cellDetector.dispose()
      }

      if (this.textDetector) {
        await this.textDetector.dispose()
      }

      if (this.textRecognizer) {
        await this.textRecognizer.dispose()
      }

      this.structureModel = null
      this.cellDetector = null
      this.textDetector = null
      this.textRecognizer = null
      this.isInitialized = false
    } catch (error) {
      console.error("释放表格识别资源失败:", error)
      throw error
    }
  }
}
