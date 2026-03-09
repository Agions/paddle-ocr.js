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
    <img src="https://github.com/Agions/paddle-ocr.js/workflows/CI/badge.svg" alt="CI">
  </a>
</p>

> 🚀 PaddleOCR JavaScript 封装，支持浏览器和 Node.js 的 OCR 识别

## 特性

- 📝 **文本识别** - 支持 80+ 语言的中英文识别
- 📊 **表格识别** - 精准识别表格结构，输出 HTML/Markdown/Excel
- 🔢 **公式识别** - 识别数学公式，输出 LaTeX/MathML
- 📱 **条码识别** - 支持 QR 码、条形码等 10+ 格式
- 🗂️ **布局分析** - 自动识别文档布局结构
- ⚡ **高性能** - 模型缓存、Web Worker 支持
- 🌐 **跨平台** - 浏览器、小程序、Node.js

## 安装

```bash
# npm
npm install paddleocr-js

# yarn
yarn add paddleocr-js

# pnpm
pnpm add paddleocr-js
```

## 快速开始

### 浏览器环境

```html
<script src="dist/browser/index.min.js"></script>
<script>
  const paddleOCR = new PaddleOCR({
    modelPath: '/models',
    useWasm: true,
    language: 'ch'
  });
  
  paddleOCR.init().then(() => {
    paddleOCR.recognize(imageElement).then(result => {
      console.log(result.textRecognition);
    });
  });
</script>
```

### Node.js 环境

```javascript
import { PaddleOCR } from 'paddleocr-js';
import fs from 'fs';

async function main() {
  const paddleOCR = new PaddleOCR({
    language: 'ch',
    useWasm: true
  });
  
  await paddleOCR.init();
  
  const imageBuffer = fs.readFileSync('image.jpg');
  const result = await paddleOCR.recognize(imageBuffer);
  
  console.log('识别结果:', result.textRecognition);
}

main();
```

### ES Modules

```javascript
import { PaddleOCR } from 'paddleocr-js';

async function detectText() {
  const paddleOCR = new PaddleOCR({
    modelPath: '/models',
    useWasm: true,
    language: 'ch'
  });
  
  await paddleOCR.init();
  
  const result = await paddleOCR.recognize('https://example.com/image.jpg');
  console.log(result);
}

detectText();
```

## 功能示例

### 文本识别

```javascript
const paddleOCR = new PaddleOCR({
  language: 'ch',       // 语言: ch, en, fr, de, ja, ko...
  useWasm: true,        // 使用 WebAssembly 加速
  enableGPU: false,     // 启用 GPU 加速
  detectionModel: 'DB', // 检测模型: DB, DB++, EAST
  recognitionModel: 'CRNN' // 识别模型: CRNN, SVTR
});

await paddleOCR.init();
const result = await paddleOCR.recognize(imageSource);

// 结果结构
// {
//   textDetection: [{ box: [...], score: 0.95 }],
//   textRecognition: [{ text: '识别文本', score: 0.92 }],
//   duration: { total: 1200, detection: 800, recognition: 400 }
// }
```

### 表格识别

```javascript
const paddleOCR = new PaddleOCR({
  enableTable: true,
  tableOptions: {
    format: 'html' // 输出格式: html, markdown, excel
  }
});

await paddleOCR.init();
const tableResult = await paddleOCR.recognizeTable(imageSource);

// tableResult.html     // HTML 表格
// tableResult.markdown // Markdown 表格
// tableResult.excel    // Base64 编码的 Excel
```

### 公式识别

```javascript
const paddleOCR = new PaddleOCR({
  enableFormula: true,
  formulaOptions: {
    enableLatex: true,
    enableMathML: false
  }
});

const formulas = await paddleOCR.recognizeFormula(imageSource);

// formulas[0].latex  // LaTeX 格式: \frac{a}{b}
// formulas[0].tex    // 原始 TeX
```

### 条码识别

```javascript
const paddleOCR = new PaddleOCR({
  enableBarcode: true
});

const barcodes = await paddleOCR.detectBarcodes(imageSource);

// barcodes[0].type   // 'qr_code', 'code_128'...
// barcodes[0].data   // 编码内容
```

### 批量处理

```javascript
const images = ['img1.jpg', 'img2.jpg', 'img3.jpg'];
const batchResult = await paddleOCR.recognizeBatch(images);

// batchResult.results         // OCRResult 数组
// batchResult.totalDuration    // 总耗时
// batchResult.averageDuration // 平均耗时
```

### 布局分析

```javascript
const paddleOCR = new PaddleOCR({
  enableLayout: true
});

const layout = await paddleOCR.analyzeLayout(imageSource);

// layout.regions[0].type  // 'text', 'title', 'figure', 'table'...
// layout.regions[0].box   // 区域坐标
// layout.regions[0].content // 区域内容
```

## 配置选项

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `modelPath` | string | `/models` | 模型路径 |
| `useWasm` | boolean | `true` | 使用 WebAssembly |
| `useTensorflow` | boolean | `true` | 使用 TensorFlow.js |
| `useONNX` | boolean | `false` | 使用 ONNX Runtime |
| `language` | string | `ch` | 识别语言 |
| `enableTable` | boolean | `false` | 启用表格识别 |
| `enableFormula` | boolean | `false` | 启用公式识别 |
| `enableBarcode` | boolean | `false` | 启用条码识别 |
| `enableLayout` | boolean | `false` | 启用布局分析 |
| `enableCache` | boolean | `true` | 启用缓存 |
| `maxSideLen` | number | `960` | 最大边长 |
| `threshold` | number | `0.3` | 检测阈值 |
| `batchSize` | number | `1` | 批处理大小 |
| `numThreads` | number | `4` | WASM 线程数 |

## API

### PaddleOCR

主类，提供 OCR 识别功能。

```typescript
class PaddleOCR {
  constructor(options?: PaddleOCROptions)
  init(): Promise<void>
  recognize(image: ImageSource, options?: ProcessOptions): Promise<OCRResult>
  recognizeBatch(images: ImageSource[], options?: ProcessOptions): Promise<BatchOCRResult>
  recognizeTable(image: ImageSource, options?: ProcessOptions): Promise<TableResult>
  analyzeLayout(image: ImageSource, options?: ProcessOptions): Promise<LayoutResult>
  recognizeFormula(image: ImageSource, options?: ProcessOptions): Promise<FormulaResult[]>
  detectBarcodes(image: ImageSource): Promise<BarcodeResult[]>
  getStats(): OCRStats
  dispose(): Promise<void>
}
```

### 静态方法

```typescript
PaddleOCR.getSupportedLanguages(): string[]
PaddleOCR.getModelInfo(): ModelInfo
PaddleOCR.isSupported(): Promise<boolean>
```

## 支持的语言

- 中文 (ch)
- 英语 (en)
- 法语 (fr)
- 德语 (de)
- 西班牙语 (es)
- 葡萄牙语 (pt)
- 意大利语 (it)
- 俄语 (ru)
- 日语 (ja)
- 韩语 (ko)
- 阿拉伯语 (ar)
- 印地语 (hi)

## 浏览器支持

- Chrome >= 80
- Firefox >= 80
- Safari >= 15
- Edge >= 80

## 性能

| 场景 | 耗时 (1080p) |
|------|-------------|
| 文本检测 | ~300ms |
| 文本识别 | ~500ms |
| 表格识别 | ~1500ms |
| 公式识别 | ~1000ms |

## 项目结构

```
paddle-ocr.js/
├── src/
│   ├── paddleocr.ts      # 主类
│   ├── index.ts           # 入口
│   ├── typings.ts         # 类型定义
│   ├── modules/           # 核心模块
│   │   ├── textDetector.ts
│   │   ├── textRecognizer.ts
│   │   ├── tableRecognizer.ts
│   │   ├── layoutAnalyzer.ts
│   │   ├── formulaRecognizer.ts
│   │   └── barcodeRecognizer.ts
│   └── utils/             # 工具函数
│       ├── image.ts
│       ├── cache.ts
│       └── env.ts
├── dist/                  # 编译输出
├── examples/             # 示例
└── docs/                 # 文档
```

## License

Apache-2.0 License

## 贡献

欢迎提交 Issue 和 Pull Request！

## 相关链接

- [PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR)
- [TensorFlow.js](https://www.tensorflow.org/js)
- [ONNX Runtime Web](https://onnxruntime.ai/)
