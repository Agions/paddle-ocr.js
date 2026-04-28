import { PaddleOCROptions, TableResult, Point } from "../typings"
import { OCRImageData as ImageData } from "../utils/image"
import { ImageProcessor } from "../utils/imageProcessor"
import { TextDetector } from "./textDetector"
import { TextRecognizer } from "./textRecognizer"
import { ModelLoader } from "../utils/ModelLoader"

/**
 * 表格识别类
 * 负责识别图像中的表格结构和内容
 */
export class TableRecognizer {
  private options: PaddleOCROptions
  private modelLoader: ModelLoader
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
    this.modelLoader = new ModelLoader(this.options)
  }

  /**
   * 初始化表格识别模型
   */
  public async init(): Promise<void> {
    if (this.isInitialized) {
      return
    }

    try {
      // 使用 ModelLoader 加载表格模型
      this.structureModel = await this.modelLoader.loadCustomModel(
        "table-structure",
        "table/structure/model",
        "TableStructure"
      )
      this.cellDetector = await this.modelLoader.loadCustomModel(
        "table-cell",
        "table/cell/model",
        "TableCellDetector"
      )

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
    return ImageProcessor.preprocess(image)
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

    const cells: any[] = []

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

    const cellsWithContent: any[] = []

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
    return ImageProcessor.cropRegion(image, points)
  }

  /**
   * 生成最终表格结果
   */
  /**
   * HTML 特殊字符转义
   */
  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#x27;",
      "/": "&#x2F;",
    }
    return text.replace(/[&<>"'/]/g, (char) => map[char] || char)
  }

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

          const safeText = this.escapeHtml(cell.text || "")
          html += `<td${rowspanAttr}${colspanAttr}>${safeText}</td>`
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

      // 释放 ModelLoader
      this.modelLoader.dispose()
    } catch (error) {
      console.error("释放表格识别资源失败:", error)
      throw error
    }
  }
}
