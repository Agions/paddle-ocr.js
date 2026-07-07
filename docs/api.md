# PaddleOCR-JS API 参考 (v0.4.0)

> v0.4.0 重构后所有公开类型都是 **PascalCase**（OcrResult / OcrError / PaddleOcrOptions），所有文件名都是 **camelCase**（paddleOcr.ts / modelLoader.ts）。从 v0.3.x 升级请参考 CHANGELOG.md 的迁移指南。

## 安装

```bash
npm install paddleocr-js
```

## 基本用法

```typescript
import { PaddleOcr } from "paddleocr-js"

const ocr = new PaddleOcr({ modelPath: "/models", language: "ch" })
await ocr.init()
const result = await ocr.recognize(image)
```

---

## 类：`PaddleOcr`

主入口类，位于 `src/paddleOcr.ts`。所有 OCR 入口统一签名 `(image: ImageSource) => Promise<ResultType>`。

### 构造函数

```typescript
new PaddleOcr(options?: PaddleOcrOptions)
```

#### `PaddleOcrOptions`

| 字段 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `modelPath` | `string` | `"./models"` (Node) / `"/models"` (browser) | 模型路径 |
| `useTensorflow` | `boolean` | `true` | 使用 TF.js 后端 |
| `useOnnx` | `boolean` | `false` | 使用 ONNX Runtime 后端 |
| `useWasm` | `boolean` | `false` | 启用 WASM |
| `enableDetection` | `boolean` | `true` | 启用文本检测 |
| `detectionModel` | `"DB" \| "DB++" \| "EAST" \| "PAN" \| string` | `"DB"` | 检测模型 |
| `detectionThreshold` | `number` | `0.3` | 检测置信度阈值 |
| `detectionBoxThresh` | `number` | `0.3` | 检测框合并阈值 |
| `detectionUnclipRatio` | `number` | `2.0` | 检测框扩展比率 |
| `enableRecognition` | `boolean` | `true` | 启用文本识别 |
| `recognitionModel` | `"CRNN" \| "SVTR" \| "NRTR" \| string` | `"CRNN"` | 识别模型 |
| `language` | `LanguageOption` | `"ch"` | 识别语言 |
| `recognitionBeamSize` | `number` | `5` | Beam search 大小 |
| `recognitionCandOverlapRatio` | `number` | `0.4` | 候选重叠比率 |
| `enableTable` | `boolean` | `false` | 启用表格识别（DI 共享 TextDetector） |
| `enableLayout` | `boolean` | `false` | 启用版面分析（DI 共享） |
| `enableFormula` | `boolean` | `false` | 启用公式识别 |
| `enableBarcode` | `boolean` | `false` | 启用条码识别 |
| `enableWatermark` | `boolean` | `false` | 启用水印检测 |
| `tableOptions` | `TableRecognitionOptions` | — | 表格输出选项 |
| `formulaOptions` | `FormulaRecognitionOptions` | — | 公式输出选项 |
| `layoutOptions` | `LayoutAnalysisOptions` | — | 版面分析选项 |
| `barcodeOptions` | `BarcodeRecognitionOptions` | — | 条码识别选项 |
| `watermarkOptions` | `WatermarkDetectionOptions` | — | 水印检测选项 |
| `cacheOptions` | `CacheConfig` | `{...}` | 缓存配置 |
| `performanceOptions` | `PerformanceConfig` | — | 性能配置 |
| `debugOptions` | `DebugConfig` | — | 调试配置 |
| `onProgress` | `ProgressCallback` | — | 初始化进度回调 |

> ⚠️ v0.4.0 **移除** 的字段：`maxSideLen` / `enableCache` / `cacheSize` / `threshold` / `batchSize` / `enableGPU` / `numThreads` / `useMultiScale` / `useAngle_cls` —— 这些从 v0.3.x 迁移时请直接删除。

---

### `init()`

```typescript
await ocr.init()
```

加载并初始化所有启用的模型。已启用 `enableTable` 的会 DI 复用全局 `TextDetector` / `TextRecognizer`（不再单独加载）。

### `recognize(image, options?)`

```typescript
const result: OcrResult = await ocr.recognize(imageSource, processOptions?)
```

| 字段 | 说明 |
|---|---|
| `textDetection` | `TextBox[]` — 检测到的文本区域 |
| `textRecognition` | `TextLine[]` — 识别到的文本行 |
| `duration` | `{ preprocess, detection, recognition, total }` 各阶段耗时 (ms) |
| `imageWidth` | 图像宽度 |
| `imageHeight` | 图像高度 |

### `recognizeBatch(images, options?)`

返回 `BatchOcrResult`：成功 / 失败列表 + 平均耗时。

### `recognizeTable(image)` / `analyzeLayout(image)` / `recognizeFormula(image)` / `detectBarcodes(image)` / `detectWatermarks(image)`

每个返回对应 Result 类型；未启用对应模块时抛 `OcrError { code: NOT_INITIALIZED }`。

### `getStats(): OcrStats` / `resetStats()`

获取 / 重置统计 (`totalRequests` / `successfulRequests` / `failedRequests` / `averageDuration` / `cacheHits` / `cacheMisses`)。

### `dispose()`

释放所有 Recognizer + 缓存中的模型。

### 静态属性

```typescript
PaddleOcr.version         // '0.4.0'
PaddleOcr.workerHelper    // = PaddleOcrWorker
PaddleOcr.ResultVisualizer// = ResultVisualizer
PaddleOcr.LightVisualizer // = LightVisualizer
PaddleOcr.MODEL_PATH      // 模型路径常量
```

---

## 类：`PaddleOcrWorker`

把 OCR 调用搬到 Web Worker 中，主线程不阻塞。

```typescript
const worker = new PaddleOcrWorker({ language: "ch" })
await worker.init()
const result = await worker.recognize(image)
```

协议：`{type, id, data}` 出 / `{id, type: "<msg>:success|:error", data}` 入。

---

## 工具类

### 图像处理

```typescript
import { loadImage, ImageProcessor } from "paddleocr-js"

const imageData: OcrImageData = await loadImage(source)

// 边界盒
const box = ImageProcessor.boundingBox(points)

// 多边形裁剪 → RGBA
const crop = ImageProcessor.cropRegion(image, points)

// 缓存键
const key = ImageProcessor.cacheKey(imageData, { width: 800 })
```

### 缓存

```typescript
import { LruCache, ImageCache, ResultCache } from "paddleocr-js"

const cache = new LruCache<string>({ maxSize: 50 * 1024 * 1024, maxCount: 100 })
cache.set("k", value)
const v = cache.get("k")
```

### 环境检测

```typescript
import { isNode, isBrowser } from "paddleocr-js"
```

### 模型加载器

```typescript
import { ModelLoader } from "paddleocr-js"
const loader = new ModelLoader({ useTensorflow: true })
const model = await loader.load({ type: "detection", name: "DB" })
loader.dispose()
```

### 可视化

```typescript
import { ResultVisualizer, LightVisualizer } from "paddleocr-js"

const vis = new ResultVisualizer("containerId", { theme: "dark" })
await vis.loadImage(imageElement)
vis.setResult(ocrResult)
vis.render()
```

---

## 类型

### 基础

```typescript
interface Point { x: number; y: number }
interface OcrImageData { width: number; height: number; data: Uint8Array | Uint8ClampedArray; channels?: number; colorSpace?: string }

interface TextBox { id: number; box: Point[]; score: number }
interface TextLine { text: string; score: number; box?: TextBox; language?: string }
```

### OCR 结果

```typescript
interface OcrDuration { preprocess: number; detection: number; recognition: number; total: number }

interface OcrResult {
  textDetection: TextBox[]
  textRecognition: TextLine[]
  duration: OcrDuration
  imageWidth?: number
  imageHeight?: number
  angle?: number
  rotatedImage?: unknown
  originalImage?: unknown
}

interface TableCell { row: number; col: number; content: string; bbox: Point[] }

interface TableResult {
  table: { cells: TableCell[]; bbox: Point[] }
  structure?: unknown
  format?: "html" | "markdown" | "excel"
  html?: string
  markdown?: string
  duration: OcrDuration
  imageWidth?: number
  imageHeight?: number
}

type LayoutRegionType = "text" | "table" | "figure" | "title" | "header" | "footer" | "reference" | "equation" | "comment"

interface LayoutRegion {
  type: LayoutRegionType
  bbox: Point[]
  confidence: number
  box?: Point[]
  score?: number
  content?: string
}

interface LayoutResult {
  regions: LayoutRegion[]
  duration: { preprocess: number; detection: number; total: number }
  imageWidth?: number
  imageHeight?: number
  pageWidth?: number
  pageHeight?: number
}

interface FormulaResult {
  formula: string
  type: "inline" | "block" | "inline_tex" | "block_tex" | "html"
  bbox: Point[]
  latex?: string; tex?: string; html?: string; text?: string
  duration: { preprocess: number; recognition: number; total: number }
}

interface BarcodeResult {
  barcode: string
  type: string
  bbox: Point[]
  data?: string; format?: string
  duration: OcrDuration
}
```

### 错误

```typescript
enum ErrorCode {
  INVALID_IMAGE_FORMAT = 1001, MODEL_LOAD_FAILED = 1002, PROCESSING_TIMEOUT = 1003,
  CACHE_ERROR = 1004, NETWORK_ERROR = 1005, CONFIG_ERROR = 1006, INIT_FAILED = 1007,
  RECOGNITION_FAILED = 1008, MEMORY_LIMIT_EXCEEDED = 1009, NOT_INITIALIZED = 1010,
  UNKNOWN_ERROR = 9999,
}

class OcrError extends Error {
  code: ErrorCode
  stage?: string
  details?: unknown
}
```

---

## 完整示例

```typescript
import { PaddleOcr, loadImage } from "paddleocr-js"
import { readFileSync } from "fs"

async function ocrImage(imagePath: string) {
  const ocr = new PaddleOcr({ language: "ch" })

  ocr.onProgress?.((p, stage) => console.log(`[${stage}] ${p.toFixed(0)}%`))

  await ocr.init()

  try {
    const image = await loadImage(readFileSync(imagePath))
    const result = await ocr.recognize(image)
    console.log(result.textRecognition.map((l) => l.text).join("\n"))
    return result
  } finally {
    await ocr.dispose()
  }
}
```

详见 [README.md](../README.md) 与 [architecture.md](./architecture.md)。
