import PaddleOCR from "./paddleocr"
import { PaddleOCRWorker } from "./utils/workerHelper"
import { ResultVisualizer } from "./utils/resultVisualizer"
import { LightVisualizer } from "./utils/lightVisualizer"
import { PaddleOCRStatic } from "./typings"

// 获取版本号
const VERSION = "0.1.0" // 硬编码版本号避免打包问题

// 扩展PaddleOCR类的静态属性
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

export default PaddleOCR
