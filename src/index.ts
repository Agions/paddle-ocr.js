/**
 * PaddleOCR-JS 统一导出入口
 */

import PaddleOCR from "./paddleocr"
import { PaddleOCRWorker } from "./utils/workerHelper"
import { ResultVisualizer } from "./utils/resultVisualizer"
import { LightVisualizer } from "./utils/lightVisualizer"

// 版本号
const VERSION = "0.2.0"

// 扩展 PaddleOCR 静态属性
Object.defineProperties(PaddleOCR, {
  version: {
    value: VERSION,
    writable: false,
  },
  WorkerHelper: {
    value: PaddleOCRWorker,
    writable: false,
  },
  ResultVisualizer: {
    value: ResultVisualizer,
    writable: false,
  },
  LightVisualizer: {
    value: LightVisualizer,
    writable: false,
  },
})

// 导出所有类型
export * from "./typings"

// 导出组件
export { TextDetector } from "./modules/textDetector"
export { TextRecognizer } from "./modules/textRecognizer"
export { TableRecognizer } from "./modules/tableRecognizer"
export { LayoutAnalyzer } from "./modules/layoutAnalyzer"
export { FormulaRecognizer } from "./modules/formulaRecognizer"
export { BarcodeRecognizer } from "./modules/barcodeRecognizer"

// 导出工具
export { ModelCache, ImageCache, ResultCache } from "./utils/cache"
export { loadImage, OCRImageData as ImageData } from "./utils/image"
export { isNode, isBrowser } from "./utils/env"
export { ResultVisualizer, LightVisualizer } from "./utils/resultVisualizer"

// 导出主类
export { PaddleOCR }

// 导出默认
export default PaddleOCR
