# PaddleOCR-JS API 参考 (v0.4.2)

> **v0.4.2 API 设计原则**:
> - 所有公开类型 **PascalCase** (`OcrResult` / `OcrError` / `PaddleOcrOptions`)
> - 所有文件名 **camelCase** (`paddleOcr.ts` / `modelLoader.ts`)
> - v0.3.x → v0.4.x 字段迁移见 [migrating-v0.3.md](./migrating-v0.3.md)

## 1. 快速开始

```typescript
import { PaddleOcr } from "paddleocr-js"

const ocr = new PaddleOcr({ modelPath: "/models", language: "ch" })
await ocr.init()
const result = await ocr.recognize(image)
```

## 2. 主类: `PaddleOcr`

主入口类，位于 `src/paddleOcr.ts`。所有 OCR 入口统一签名 `(image: ImageSource) => Promise<ResultType>`。

### 2.1 构造函数

```typescript
new PaddleOcr(options?: PaddleOcrOptions)
```

### 2.2 `PaddleOcrOptions`

#### 模型路径 & 后端

| 字段 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `modelPath` | `string` | `"/models"` (browser) / `"./models"` (Node) | 模型路径 |
| `useTensorflow` | `boolean` | `true` | 使用 TF.js 后端 |
| `useOnnx` | `boolean` | `false` | 使用 ONNX Runtime 后端 |
| `useWasm` | `boolean` | `false` | 启用 WASM (Node.js 无效) |

#### 文本检测

| 字段 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `enableDetection` | `boolean` | `true` | 启用文本检测 |
| `detectionModel` | `"DB" \| "DB++" \| "EAST" \| "PAN" \| string` | `"DB"` | 检测模型 |
| `detectionThreshold` | `number` | `0.3` | 检测置信度阈值 |
| `detectionBoxThresh` | `number` | `0.3` | 检测框合并阈值 |
| `detectionUnclipRatio` | `number` | `2.0` | 检测框扩展比率 |

#### 文本识别

| 字段 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `enableRecognition` | `boolean` | `true` | 启用文本识别 |
| `recognitionModel` | `"CRNN" \| "SVTR" \| "NRTR" \| string` | `"CRNN"` | 识别模型 |
| `language` | `LanguageOption` | `"ch"` | 识别语言 (ch/en/fr/de/ja/ko) |
| `recognitionBeamSize` | `number` | `5` | Beam search 大小 |
| `recognitionCandOverlapRatio` | `number` | `0.4` | 候选重叠比率 |

#### 扩展模块

| 字段 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `enableTable` | `boolean` | `false` | 启用表格识别 (DI 共享 TextDetector) |
| `enableLayout` | `boolean` | `false` | 启用版面分析 (DI 共享) |
| `enableFormula` | `boolean` | `false` | 启用公式识别 |
| `enableBarcode` | `boolean` | `false` | 启用条码识别 |
| `enableWatermark` | `boolean` | `false` | ⚠️ **deprecated** v0.4.x 未实现 |

#### 模块选项

| 字段 | 类型 | 说明 |
|---|---|---|
| `tableOptions` | `TableRecognitionOptions` | 表格输出选项 |
| `formulaOptions` | `FormulaRecognitionOptions` | 公式输出选项 |
| `layoutOptions` | `LayoutAnalysisOptions` | 版面分析选项 |
| `barcodeOptions` | `BarcodeRecognitionOptions` | 条码识别选项 |
| `watermarkOptions` | `WatermarkDetectionOptions` | ⚠️ deprecated, 未实现 |

#### 性能 & 缓存

| 字段 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `cacheOptions` | `CacheConfig` | `{...}` | LRU 缓存配置 |
| `performanceOptions` | `PerformanceConfig` | — | 性能调优 (batch / numThreads) |
| `debugOptions` | `DebugConfig` | — | 调试选项 |
| `onProgress` | `ProgressCallback` | — | 初始化进度回调 (0-100) |

> ⚠️ **v0.3.x → v0.4.x 移除的字段**: `maxSideLen` / `enableCache` / `cacheSize` / `threshold` / `batchSize` / `enableGPU` / `numThreads` / `useMultiScale` / `useAngle_cls`. 迁移指南见 [migrating-v0.3.md](./migrating-v0.3.md).

### 2.3 实例方法

#### `init(): Promise<void>`

加载并初始化所有启用的模型。已启用 `enableTable` / `enableLayout` 的会 DI 复用全局 `TextDetector` / `TextRecognizer`（不再单独加载）。

**进度回调**:

```typescript
const ocr = new PaddleOcr({
  enableTable: true,
  onProgress: (progress, stage) => {
    console.log(`[${stage}] ${progress.toFixed(0)}%`)
  },
})
await ocr.init()
// [detection] 50%
// [recognition] 100%
// [table] 100%
```

#### `recognize(image, options?): Promise<OcrResult>`

```typescript
const result: OcrResult = await ocr.recognize(imageSource, processOptions?)
```

| 返回字段 | 类型 | 说明 |
|---|---|---|
| `textDetection` | `TextBox[]` | 检测到的文本区域 |
| `textRecognition` | `TextLine[]` | 识别到的文本行 |
| `duration` | `OcrDuration` | 各阶段耗时 (ms) |
| `imageWidth` | `number?` | 图像宽度 |
| `imageHeight` | `number?` | 图像高度 |
| `angle` | `number?` | 检测到的旋转角度 |
| `rotatedImage` | `unknown?` | 旋转后图像 (如有) |
| `originalImage` | `unknown?` | 原始图像缓存 |

#### `recognizeBatch(images, options?): Promise<BatchOcrResult>`

批量识别，每张图独立 try/catch，失败不阻塞其他图。

```typescript
const batch = await ocr.recognizeBatch([img1, img2, img3])
console.log(batch.successCount, batch.totalDuration)
// BatchOcrResult { results: OcrResult[], successCount: 2, failedCount: 1, totalDuration: 1234 }
```

#### `recognizeTable(image): Promise<TableResult>`

表格识别。需 `enableTable: true` 初始化，未启用时抛 `OcrError { code: NOT_INITIALIZED }`。

#### `analyzeLayout(image): Promise<LayoutResult>`

版面分析。需 `enableLayout: true` 初始化。

#### `recognizeFormula(image): Promise<FormulaResult[]>`

公式识别。需 `enableFormula: true` 初始化。

#### `detectBarcodes(image): Promise<BarcodeResult[]>`

条码识别。需 `enableBarcode: true` 初始化。

#### `detectWatermarks(image): Promise<WatermarkInfo[]>`

⚠️ **v0.4.x 暂未实现**. 设置 `enableWatermark: true` 不会报错但也不会生效. 完整实现见 [ROADMAP v0.5.0+](../ROADMAP.md).

#### `getStats(): OcrStats`

```typescript
const stats = ocr.getStats()
// OcrStats {
//   totalRequests: 100,
//   successfulRequests: 95,
//   failedRequests: 5,
//   averageDuration: 1234,
//   cacheHits: 30,
//   cacheMisses: 70,
// }
```

#### `resetStats(): void`

重置所有计数器。

#### `dispose(): Promise<void>`

释放所有 Recognizer + 缓存中的模型。`dispose` 后需重新 `init()` 才能继续使用。

### 2.4 静态属性

```typescript
PaddleOcr.version         // '0.4.2' (从 package.json 读取, v0.4.2+)
PaddleOcr.workerHelper    // = PaddleOcrWorker
PaddleOcr.ResultVisualizer// = ResultVisualizer
PaddleOcr.LightVisualizer // = LightVisualizer
PaddleOcr.MODEL_PATH      // 默认模型路径常量
```

## 3. 类: `PaddleOcrWorker`

把 OCR 调用搬到 Web Worker 中，主线程不阻塞。协议: `{type, id, data}` 出 / `{id, type: "xxx:success|:error", data}` 入。**`id` 是 UUID**, 解决 v0.3.x race condition。

```typescript
import { PaddleOcrWorker } from "paddleocr-js"

const worker = new PaddleOcrWorker({ language: "ch" })
await worker.init()
const result = await worker.recognize(image)
```

## 4. ONNX WASM 配置 (v0.4.2+)

`OnnxBackend` 默认从 jsDelivr CDN 加载 ONNX Runtime WASM 文件（不打包进 npm）。

**默认 CDN URL**:
```
https://cdn.jsdelivr.net/npm/onnxruntime-web@1.24.3/dist/
```

**用户自定义** (在 `PaddleOcr.init()` 前):

```typescript
// 1. 自托管 CDN
import * as ort from "onnxruntime-web"
ort.env.wasm.wasmPaths = "https://your-cdn.com/onnxruntime-web/1.24.3/dist/"

const ocr = new PaddleOcr({ useOnnx: true })
await ocr.init()  // 使用你的 CDN

// 2. 本地路径 (相对 HTML)
ort.env.wasm.wasmPaths = "/static/onnxruntime-web/"

// 3. Node.js 跳过 - onnxruntime-web 是 native binding, 不需要 WASM
```

**版本一致性**: CDN URL 中的版本号 `1.24.3` 需与 `package.json` 的 `onnxruntime-web` 版本一致。升级 ort 时同步修改 `src/utils/modelLoader.ts` 的硬编码 URL。

## 5. 工具类

### 5.1 图像处理

```typescript
import { loadImage, ImageProcessor } from "paddleocr-js"

const imageData: OcrImageData = await loadImage(source)

// 边界盒
const box = ImageProcessor.boundingBox(points)

// 多边形裁剪 → RGBA
const crop = ImageProcessor.cropRegion(image, points)

// 缓存键
const key = ImageProcessor.cacheKey(imageData, { mode: "text" })
```

### 5.2 缓存

```typescript
import { LruCache, ImageCache, ResultCache } from "paddleocr-js"

const cache = new LruCache<string>({ maxSize: 50 * 1024 * 1024, maxCount: 100 })
cache.set("k", value, 1024)  // value + size
const v = cache.get("k")
```

### 5.3 环境检测

```typescript
import { isNode, isBrowser } from "paddleocr-js"
```

### 5.4 模型加载器

```typescript
import { ModelLoader } from "paddleocr-js"
const loader = new ModelLoader({ useTensorflow: true })
const model = await loader.load({ type: "detection", name: "DB" })
loader.dispose()
```

### 5.5 可视化

```typescript
import { ResultVisualizer, LightVisualizer } from "paddleocr-js"

const vis = new ResultVisualizer("containerId", { theme: "dark" })
await vis.loadImage(imageElement)
vis.setResult(ocrResult)
vis.render()
```

## 6. 类型定义

### 6.1 基础

```typescript
interface Point { x: number; y: number }

interface OcrImageData {
  width: number
  height: number
  data: Uint8Array | Uint8ClampedArray
  channels?: number
  colorSpace?: string
}

interface TextBox { id: number; box: Point[]; score: number }
interface TextLine { text: string; score: number; box?: TextBox; language?: string }

type ImageSource =
  | string          // URL
  | HTMLImageElement
  | HTMLCanvasElement
  | Buffer          // Node.js
  | Uint8Array
  | OcrImageData
```

### 6.2 OCR 结果

```typescript
interface OcrDuration {
  preprocess: number
  detection: number
  recognition: number
  total: number
}

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

interface BatchOcrResult {
  results: (OcrResult | Error)[]
  successCount: number
  failedCount: number
  totalDuration: number
  averageDuration: number
}
```

### 6.3 扩展模块结果

```typescript
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

type LayoutRegionType =
  | "text" | "table" | "figure" | "title" | "header"
  | "footer" | "reference" | "equation" | "comment"

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

type FormulaType = "inline" | "block" | "inline_tex" | "block_tex" | "html"

interface FormulaResult {
  formula: string
  type: FormulaType
  bbox: Point[]
  latex?: string
  tex?: string
  html?: string
  text?: string
  duration: { preprocess: number; recognition: number; total: number }
}

interface BarcodeResult {
  barcode: string
  type: string
  bbox: Point[]
  data?: string
  format?: string
  duration: OcrDuration
}

/** @deprecated v0.4.x 未实现 */
interface WatermarkInfo {
  bbox: Point[]
  confidence: number
  text?: string
}
```

### 6.4 错误

```typescript
enum ErrorCode {
  INVALID_IMAGE_FORMAT    = 1001,
  MODEL_LOAD_FAILED       = 1002,
  PROCESSING_TIMEOUT      = 1003,
  CACHE_ERROR             = 1004,
  NETWORK_ERROR           = 1005,
  CONFIG_ERROR            = 1006,
  INIT_FAILED             = 1007,
  RECOGNITION_FAILED      = 1008,
  MEMORY_LIMIT_EXCEEDED   = 1009,
  NOT_INITIALIZED         = 1010,
  UNKNOWN_ERROR           = 9999,
}

class OcrError extends Error {
  code: ErrorCode
  stage?: string
  details?: unknown
}
```

## 7. 完整示例

```typescript
import { PaddleOcr, loadImage, OcrError, ErrorCode } from "paddleocr-js"
import { readFileSync } from "fs"

async function ocrImage(imagePath: string) {
  const ocr = new PaddleOcr({
    language: "ch",
    enableTable: true,
    enableFormula: true,
    onProgress: (p, stage) => console.log(`[${stage}] ${p.toFixed(0)}%`),
  })

  try {
    await ocr.init()

    const image = await loadImage(readFileSync(imagePath))
    const result = await ocr.recognize(image)

    console.log("--- 文本 ---")
    result.textRecognition.forEach((line) => console.log(line.text))

    if (ocr.options.enableTable) {
      const table = await ocr.recognizeTable(image)
      console.log("--- 表格 HTML ---")
      console.log(table.html)
    }

    const stats = ocr.getStats()
    console.log(`--- Stats ---`)
    console.log(`Total: ${stats.totalRequests}, OK: ${stats.successfulRequests}, Cache: ${stats.cacheHits}/${stats.totalRequests}`)
  } catch (e) {
    if (e instanceof OcrError) {
      console.error(`OcrError [${e.code}]: ${e.message} (stage: ${e.stage})`)
    } else {
      throw e
    }
  } finally {
    await ocr.dispose()
  }
}
```

详见 [README.md](../README.md) · [architecture.md](./architecture.md) · [migrating-v0.3.md](./migrating-v0.3.md)。

---

**最后更新**: 2026-07-08 (v0.4.2 docs 重构)
