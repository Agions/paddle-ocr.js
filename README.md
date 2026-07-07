# PaddleOCR-JS

<p align="center">
  <a href="https://www.npmjs.com/package/paddleocr-js">
    <img src="https://img.shields.io/npm/v/paddleocr-js.svg" alt="npm version">
  </a>
  <a href="https://www.npmjs.com/package/paddleocr-js">
    <img src="https://img.shields.io/npm/dm/paddleocr-js.svg" alt="npm downloads">
  </a>
  <a href="https://github.com/Agions/paddle-ocr.js/blob/main/LICENSE">
    <img src="https://img.shields.io/npm/l/paddleocr-js.svg" alt="license">
  </a>
  <a href="https://github.com/Agions/paddle-ocr.js/actions">
    <img src="https://img.shields.io/github/actions/workflow/status/Agions/paddle-ocr.js/ci.yml" alt="CI">
  </a>
</p>

> 🚀 PaddleOCR 的 JavaScript/TypeScript 封装 — 文本 / 表格 / 公式 / 条码 / 版面识别，支持浏览器 & Node.js

## ✨ v0.4.0 重构亮点

- 🏗️ **Backend 抽象 + 模型共享** — DB/CRNN 模型加载从 3 次降到 1 次
- 🔄 **严格 DRY** — `hashKey` / `VisualizerBase` / `selectBackend` / `boundingBox` 全部单一定义
- 📦 **TypeScript strict 全面开启** — `strict: true` + 5 个子开关全开
- 🎨 **PascalCase 类型 + camelCase 文件** — 25 文件、2051 LOC（从 7051 行 -71%）
- ✅ **0 lint warnings + 36 单测全绿**（vs baseline 158 warnings）
- 🐛 **3 个潜在 bug 修复** — DB 模型重复加载 / Worker 协议 race / Visualizer 内存泄漏

[→ 完整重构 CHANGELOG](./CHANGELOG.md) · [→ 架构设计](./docs/architecture.md)

## 特性

| 模块 | 说明 |
|---|---|
| 📝 文本识别 | CRNN / SVTR / NRTR，6 种语言 |
| 📊 表格识别 | 输出 HTML / Markdown / Excel |
| 🔢 公式识别 | LaTeX / MathML / TeX 输出 |
| 📱 条码识别 | QR / EAN / Code128 等 12 种 |
| 🗂️ 版面分析 | PP-Layout 区域分类 |
| ⚡ 性能 | 模型共享 + LRU 缓存 + Web Worker |

## 安装

```bash
npm install paddleocr-js
# yarn add paddleocr-js
# pnpm add paddleocr-js
```

## 快速开始

### ES Modules（推荐）

```typescript
import { PaddleOcr } from "paddleocr-js"

const ocr = new PaddleOcr({
  modelPath: "/models",   // 浏览器默认；Node 用 "./models"
  useTensorflow: true,    // 或 useOnnx: true
  language: "ch",
})

await ocr.init()

// 文本识别
const result = await ocr.recognize(imageElement)
console.log(result.textRecognition)
```

### Node.js

```typescript
import { PaddleOcr, loadImage } from "paddleocr-js"
import { readFileSync } from "fs"

const ocr = new PaddleOcr({ language: "ch" })
await ocr.init()

const image = loadImage(readFileSync("image.jpg"))
const result = await ocr.recognize(image)
```

### 浏览器 UMD

```html
<script src="dist/browser/index.min.js"></script>
<script>
  const ocr = new PaddleOcr({ modelPath: "/models", language: "ch" })
  ocr.init().then(() => ocr.recognize(imageEl).then(console.log))
</script>
```

## API 速览

```typescript
class PaddleOcr {
  constructor(options?: PaddleOcrOptions)
  init(): Promise<void>
  recognize(image: ImageSource, options?: ProcessOptions): Promise<OcrResult>
  recognizeBatch(images: ImageSource[], options?: ProcessOptions): Promise<BatchOcrResult>
  recognizeTable(image: ImageSource): Promise<TableResult>
  analyzeLayout(image: ImageSource): Promise<LayoutResult>
  recognizeFormula(image: ImageSource): Promise<FormulaResult[]>
  detectBarcodes(image: ImageSource): Promise<BarcodeResult[]>
  detectWatermarks(image: ImageSource): Promise<WatermarkInfo[]>
  getStats(): OcrStats
  resetStats(): void
  dispose(): Promise<void>
}
```

## 配置选项（PaddleOcrOptions）

| 选项 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `modelPath` | `string` | `"./models"` | 模型文件路径 |
| `useTensorflow` | `boolean` | `true` | 使用 TF.js 后端 |
| `useOnnx` | `boolean` | `false` | 使用 ONNX Runtime 后端 |
| `useWasm` | `boolean` | `false` | 启用 WASM |
| `language` | `"ch" \| "en" \| "fr" \| "de" \| "ja" \| "ko"` | `"ch"` | 识别语言 |
| `enableDetection` | `boolean` | `true` | 启用文本检测 |
| `enableRecognition` | `boolean` | `true` | 启用文本识别 |
| `enableTable` | `boolean` | `false` | 启用表格识别（DI 共享 TextDetector） |
| `enableLayout` | `boolean` | `false` | 启用版面分析 |
| `enableFormula` | `boolean` | `false` | 启用公式识别 |
| `enableBarcode` | `boolean` | `false` | 启用条码识别 |
| `enableWatermark` | `boolean` | `false` | 启用水印检测 |
| `detectionModel` | `"DB" \| "DB++" \| "EAST" \| "PAN"` | `"DB"` | 检测模型 |
| `recognitionModel` | `"CRNN" \| "SVTR" \| "NRTR"` | `"CRNN"` | 识别模型 |
| `detectionThreshold` | `number` | `0.3` | 检测置信度 |
| `cacheOptions` | `CacheConfig` | — | 缓存配置 |
| `performanceOptions` | `PerformanceConfig` | — | 性能配置 |
| `onProgress` | `ProgressCallback` | — | 进度回调 |

> ℹ️ **v0.4.0 移除的字段**：`maxSideLen` / `enableCache` / `cacheSize` / `enableGPU` / `numThreads` / `useMultiScale` / `useAngle_cls` / `threshold` — 如有 v0.3.x 用户，迁移指南见 CHANGELOG.md。

## 完整功能示例

### 表格识别（HTML/Markdown 输出）

```typescript
const ocr = new PaddleOcr({ enableTable: true })
await ocr.init()
const table = await ocr.recognizeTable(image)
console.log(table.html)        // HTML 表格
console.log(table.markdown)    // Markdown 表格
```

### 公式识别

```typescript
const ocr = new PaddleOcr({ enableFormula: true })
await ocr.init()
const formulas = await ocr.recognizeFormula(image)
console.log(formulas[0].latex) // \frac{a}{b}
```

### 批量识别 + 缓存

```typescript
const ocr = new PaddleOcr({
  cacheOptions: { maxSize: 100, maxCount: 50 },
})
await ocr.init()
const batch = await ocr.recognizeBatch([img1, img2, img3])
console.log(batch.successCount, batch.totalDuration)
```

### Web Worker（浏览器不阻塞主线程）

```typescript
import { PaddleOcrWorker } from "paddleocr-js"

const worker = new PaddleOcrWorker({ language: "ch" })
await worker.init()
const result = await worker.recognize(image)
```

## 项目结构

```
paddle-ocr.js/
├── src/
│   ├── index.ts                # 统一导出 + version
│   ├── typings.ts              # 所有公开类型 (PascalCase)
│   ├── paddleOcr.ts            # Facade (230 行)
│   ├── worker.ts               # Web Worker 入口
│   ├── visualizerBase.ts       # 可视化共享基类
│   ├── core/
│   │   ├── constants.ts        # 默认配置
│   │   └── statsManager.ts     # 统计
│   ├── modules/                # 6 个 Recognizer
│   │   ├── baseRecognizer.ts   # 抽象基类
│   │   ├── textDetector.ts
│   │   ├── textRecognizer.ts
│   │   ├── tableRecognizer.ts  # DI 共享
│   │   ├── layoutAnalyzer.ts   # DI 共享
│   │   ├── formulaRecognizer.ts
│   │   └── barcodeRecognizer.ts
│   └── utils/
│       ├── image.ts            # loadImage + hashKey
│       ├── imageProcessor.ts   # ImageProcessor 静态
│       ├── cache.ts            # LruCache<T> + ImageCache/ResultCache
│       ├── modelLoader.ts      # Backend 抽象 + TF/ONNX 实现
│       ├── modelPath.ts        # buildModelPath
│       ├── workerHelper.ts     # PaddleOcrWorker
│       ├── resultVisualizer.ts # 继承 VisualizerBase
│       ├── lightVisualizer.ts  # 继承 VisualizerBase
│       ├── visualTypes.ts
│       └── env.ts
├── docs/
│   ├── architecture.md         # 重构后架构（推荐）
│   ├── api.md                  # API 参考
│   └── architecture.txt        # 速记图
├── CHANGELOG.md                # v0.3.x → v0.4.0
└── examples/                   # browser / node / react
```

## 浏览器支持

| 浏览器 | 最低版本 |
|---|---|
| Chrome | ≥ 80 |
| Firefox | ≥ 80 |
| Safari | ≥ 15 |
| Edge | ≥ 80 |

## License

Apache-2.0

## 相关链接

- [PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR)
- [TensorFlow.js](https://www.tensorflow.org/js)
- [ONNX Runtime Web](https://onnxruntime.ai/)
