/**
 * PaddleOCR-JS 统一导出入口
 */

import { PaddleOcr } from "./paddleOcr"
import { PaddleOcrWorker } from "./utils/workerHelper"
import { ResultVisualizer } from "./utils/resultVisualizer"
import { LightVisualizer } from "./utils/lightVisualizer"
import { MODEL_PATH } from "./core/constants"

const VERSION = "0.4.0"

Object.defineProperties(PaddleOcr, {
  version: { value: VERSION, writable: false },
  workerHelper: { value: PaddleOcrWorker, writable: false },
  ResultVisualizer: { value: ResultVisualizer, writable: false },
  LightVisualizer: { value: LightVisualizer, writable: false },
  MODEL_PATH: { value: MODEL_PATH, writable: false },
})

export * from "./typings"
export { TextDetector } from "./modules/textDetector"
export { TextRecognizer } from "./modules/textRecognizer"
export { TableRecognizer } from "./modules/tableRecognizer"
export { LayoutAnalyzer } from "./modules/layoutAnalyzer"
export { FormulaRecognizer } from "./modules/formulaRecognizer"
export { BarcodeRecognizer } from "./modules/barcodeRecognizer"
export { ImageCache, ResultCache } from "./utils/cache"
export { ImageProcessor } from "./utils/imageProcessor"
export { loadImage } from "./utils/image"
export { ModelLoader } from "./utils/modelLoader"
export { isNode, isBrowser } from "./utils/env"
export { ResultVisualizer } from "./utils/resultVisualizer"
export { LightVisualizer } from "./utils/lightVisualizer"
export { PaddleOcrWorker } from "./utils/workerHelper"
export { StatsManager } from "./core/statsManager"
export { PaddleOcr }
export default PaddleOcr
