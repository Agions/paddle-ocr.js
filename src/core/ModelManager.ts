import { PaddleOCROptions } from "../typings"
import { TextDetector } from "../modules/textDetector"
import { TextRecognizer } from "../modules/textRecognizer"
import { TableRecognizer } from "../modules/tableRecognizer"
import { LayoutAnalyzer } from "../modules/layoutAnalyzer"
import { FormulaRecognizer } from "../modules/formulaRecognizer"
import { BarcodeRecognizer } from "../modules/barcodeRecognizer"

/**
 * 模型管理器接口
 */
export interface ModelManagerInterface {
  getDetector(): TextDetector | null
  getRecognizer(): TextRecognizer | null
  getTableRecognizer(): TableRecognizer | null
  getLayoutAnalyzer(): LayoutAnalyzer | null
  getFormulaRecognizer(): FormulaRecognizer | null
  getBarcodeRecognizer(): BarcodeRecognizer | null
  hasDetectionModel(): boolean
  hasRecognitionModel(): boolean
  hasTableModel(): boolean
  hasLayoutModel(): boolean
  hasFormulaModel(): boolean
  hasBarcodeModel(): boolean
}

/**
 * 模型管理器
 * 负责 OCR 相关模型的实例管理和生命周期控制
 */
export class ModelManager implements ModelManagerInterface {
  private options: PaddleOCROptions

  // 模型实例
  private detector: TextDetector | null = null
  private recognizer: TextRecognizer | null = null
  private tableRecognizer: TableRecognizer | null = null
  private layoutAnalyzer: LayoutAnalyzer | null = null
  private formulaRecognizer: FormulaRecognizer | null = null
  private barcodeRecognizer: BarcodeRecognizer | null = null

  constructor(options: PaddleOCROptions) {
    this.options = options
  }

  /**
   * 获取文本检测器
   */
  public getDetector(): TextDetector | null {
    return this.detector
  }

  /**
   * 设置文本检测器
   */
  public setDetector(detector: TextDetector): void {
    this.detector = detector
  }

  /**
   * 获取文本识别器
   */
  public getRecognizer(): TextRecognizer | null {
    return this.recognizer
  }

  /**
   * 设置文本识别器
   */
  public setRecognizer(recognizer: TextRecognizer): void {
    this.recognizer = recognizer
  }

  /**
   * 获取表格识别器
   */
  public getTableRecognizer(): TableRecognizer | null {
    return this.tableRecognizer
  }

  /**
   * 设置表格识别器
   */
  public setTableRecognizer(tableRecognizer: TableRecognizer): void {
    this.tableRecognizer = tableRecognizer
  }

  /**
   * 获取布局分析器
   */
  public getLayoutAnalyzer(): LayoutAnalyzer | null {
    return this.layoutAnalyzer
  }

  /**
   * 设置布局分析器
   */
  public setLayoutAnalyzer(layoutAnalyzer: LayoutAnalyzer): void {
    this.layoutAnalyzer = layoutAnalyzer
  }

  /**
   * 获取公式识别器
   */
  public getFormulaRecognizer(): FormulaRecognizer | null {
    return this.formulaRecognizer
  }

  /**
   * 设置公式识别器
   */
  public setFormulaRecognizer(formulaRecognizer: FormulaRecognizer): void {
    this.formulaRecognizer = formulaRecognizer
  }

  /**
   * 获取条码识别器
   */
  public getBarcodeRecognizer(): BarcodeRecognizer | null {
    return this.barcodeRecognizer
  }

  /**
   * 设置条码识别器
   */
  public setBarcodeRecognizer(
    barcodeRecognizer: BarcodeRecognizer
  ): void {
    this.barcodeRecognizer = barcodeRecognizer
  }

  /**
   * 检查是否启用了文本检测模型
   */
  public hasDetectionModel(): boolean {
    return !!this.options.enableDetection
  }

  /**
   * 检查是否启用了文本识别模型
   */
  public hasRecognitionModel(): boolean {
    return !!this.options.enableRecognition
  }

  /**
   * 检查是否启用了表格识别模型
   */
  public hasTableModel(): boolean {
    return !!this.options.enableTable
  }

  /**
   * 检查是否启用了布局分析模型
   */
  public hasLayoutModel(): boolean {
    return !!this.options.enableLayout
  }

  /**
   * 检查是否启用了公式识别模型
   */
  public hasFormulaModel(): boolean {
    return !!this.options.enableFormula
  }

  /**
   * 检查是否启用了条码识别模型
   */
  public hasBarcodeModel(): boolean {
    return !!this.options.enableBarcode
  }

  /**
   * 初始化所有启用的模型
   */
  public async initialize(): Promise<void> {
    if (this.hasDetectionModel()) {
      this.detector = new TextDetector(this.options)
      await this.detector.init()
    }

    if (this.hasRecognitionModel()) {
      this.recognizer = new TextRecognizer(this.options)
      await this.recognizer.init()
    }

    if (this.hasTableModel()) {
      this.tableRecognizer = new TableRecognizer(this.options)
      await this.tableRecognizer.init()
    }

    if (this.hasLayoutModel()) {
      this.layoutAnalyzer = new LayoutAnalyzer(this.options)
      await this.layoutAnalyzer.init()
    }

    if (this.hasFormulaModel()) {
      this.formulaRecognizer = new FormulaRecognizer(this.options)
      await this.formulaRecognizer.init()
    }

    if (this.hasBarcodeModel()) {
      this.barcodeRecognizer = new BarcodeRecognizer(this.options)
      await this.barcodeRecognizer.init()
    }
  }

  /**
   * 释放所有模型资源
   */
  public async dispose(): Promise<void> {
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
    if (this.formulaRecognizer) {
      await this.formulaRecognizer.dispose()
      this.formulaRecognizer = null
    }
    if (this.barcodeRecognizer) {
      await this.barcodeRecognizer.dispose()
      this.barcodeRecognizer = null
    }
  }

  /**
   * 检查是否已初始化
   */
  public isInitialized(): boolean {
    return (
      (!!this.detector && !!this.recognizer) ||
      (!!this.tableRecognizer && !!this.layoutAnalyzer) ||
      (!!this.formulaRecognizer && !!this.barcodeRecognizer)
    )
  }
}