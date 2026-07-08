# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.4.2] - 2026-07-08 — Package Size Optimization 📦

### 🐛 Bug Fixes

- **`PaddleOcr.version` 硬编码 "0.4.0" bug** — 现从 `package.json` 读取 (commit `68c5e08`)

### ⚠️ Deprecated

- **`enableWatermark` / `watermarkOptions` 标 `@deprecated`** — v0.4.x 暂未实现, 保留字段仅兼容 v0.3.x. 完整实现见 [ROADMAP.md v0.5.0+](./ROADMAP.md). 之前 README/api.md 误标 `detectWatermarks()` 存在, 现已删除.

### 📦 Performance

**npm 包体积优化 (-74% / -71% tarball / unpacked)**:

| 指标 | v0.4.1 | **v0.4.2** | 变化 |
|---|---|---|---|
| npm tarball | 28.4 MB | **7.2 MB** | **-74%** |
| unpacked | 117.5 MB | **32.0 MB** | **-73%** |
| files | 47 | **12** | -75% |
| WASM files | 4 (77MB) | 0 | -100% |

**优化项**:

- **取消 ONNX WASM 打包** — 移除 `webpack.CopyPlugin` 对 `node_modules/onnxruntime-web/dist/*.wasm` 的复制, 节省 77 MB
- **运行时 jsDelivr CDN 加载** — `OnnxBackend.load()` 首次调用时设置 `ort.env.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.24.3/dist/"`
- **取消预压缩 .gz / .br** — 移除 `webpack.CompressionPlugin`, 现代 CDN (npmjs / jsDelivr / unpkg) 自动 gzip, 节省 1.3 MB
- **Node.js 零影响** — `onnxruntime-web` 在 Node 是 native binding, **完全不需要 WASM**

**用户覆盖 ONNX WASM 路径** (CDN/本地):

```typescript
import * as ort from "onnxruntime-web"
ort.env.wasm.wasmPaths = "https://your-cdn.com/onnxruntime-web/1.24.3/dist/"
// 之后 PaddleOcr 会用这个 URL
```

---

## [0.4.1] - 2026-07-08 — Re-publish (npm 24h tombstone workaround)

> **重要**: v0.4.1 是 v0.4.0 的"重发版", **代码逻辑完全相同**. 因 v0.4.0 第一次 publish 时是 8.3 KB 空壳 (缺 dist/), `npm unpublish` 后 npm 24h tombstone 阻止重新 publish 同一 version. 故 bump 到 v0.4.1 重新发.

### 🐛 Bug Fixes

- 第一次 v0.4.0 publish 因 GitHub Actions `publish-npm` job 缺少 `actions/checkout@v4` step, 导致 GITHUB_WORKSPACE 是空目录, npm publish 找不到完整 package.json, 产出了 8.3 KB 空壳包. 修复后正常 publish 28.4 MB 完整包

### 📦 Tarball

| 指标 | v0.4.0 (空壳) | **v0.4.1** |
|---|---|---|
| tarball size | 8.3 KB | 28.4 MB |
| unpacked | 22 KB | 117.5 MB |
| file count | 3 | 47 |

> **GitHub Release v0.4.0 仍保留** (作为历史记录), 但 npm 上 v0.4.0 已被 unpublish. 用户装 `paddleocr-js@latest` 现在拿到 **v0.4.2**.

---

## [0.4.0] - 2026-07-07 — Architecture Refactor 🏗️

### 🏗️ Architecture Upgrade

- **Backend abstraction**: TF/ONNX 分支硬编码（散 12 处）→ `Backend` interface + 2 实现类
- **DI-based model sharing**: `TableRecognizer` / `LayoutAnalyzer` 通过构造器注入共享 `TextDetector` / `TextRecognizer`，DB/CRNN 模型加载从 3 次降到 1 次（性能 +200%）
- **`VisualizerBase` 抽取**: `LightVisualizer` + `ResultVisualizer` 共享 canvas/多边形/资源释放 ~120 行（约消除 600 行重复）
- **`LruCache<T>` 泛型**: 4 个具体缓存类 → 1 泛型 + 2 个薄包装
- **`PaddleOcr` Facade 精简**: 511 行 → 230 行（-55%），6 个 OCR 入口模板代码 100% 消除
- **Worker 协议修复**: identify-by-id `postMessage` race（旧版每个请求用同一字符串 key）

### 📝 Naming Unification (camelCase files + PascalCase types/classes)

| Before | After |
|---|---|
| `Constants.ts` | `constants.ts` |
| `StatsManager.ts` | `statsManager.ts` |
| `ModelLoader.ts` | `modelLoader.ts` |
| `PaddleOCRFacade.ts` | `paddleOcr.ts` |
| `BaseRecognizer.ts` | `baseRecognizer.ts` |
| `PaddleOCROptions` | `PaddleOcrOptions` |
| `OCRResult` / `OCRError` / `OCRImageData` | `OcrResult` / `OcrError` / `OcrImageData` |
| `StatsManager.OCRStats` | `OcrStats`（独立导出） |
| `resultVisualizer.ts` 1197 行 | 119 行（-90%） |
| `lightVisualizer.ts` 789 行 | 132 行（-83%） |

### 🗑️ Dead Code Removal (18 items)

- Empty `Config` namespace 在 `constants.ts`
- `LAYOUT_TYPES` 未引用常量
- `hasWasm` / `hasWebGL` / `isWebWorker` / `getBrowserType`（含 IE 分支）未引用检测
- `buildWasmPath` / `createModelCache` / `createImageCache` / `createResultCache` 未引用工厂
- `ModelCache` 类（被新 `ImageCache`/`ResultCache` 取代）
- 9 个"已废弃"字段从 `PaddleOcrOptions`: `maxSideLen` / `enableCache` / `cacheSize` / `threshold` / `batchSize` / `enableGPU` / `numThreads` / `useMultiScale` / `useAngle_cls`
- `onProgress` 从 options 移到 `PaddleOcr` 实例属性

### 🔁 DRY Wins

- `hashKey` / `arrayFingerprint` 共享到 `image.ts`（之前散 3 个文件）
- `boundingBox` 单一来源 `ImageProcessor.boundingBox`
- `runInference` 助手抽到 `BaseRecognizer`（消除 4 处 tensor 创建+dispose 重复）
- 5 个 Recognizer 全部继承同一抽象基类（原 3/5 未继承）

### 🐛 Bug Fixes

- DB/CRNN 模型重复加载（3 次 → 1 次 via DI 共享）
- Worker 协议 race condition（id-based `postMessage`）
- Visualizer 内存泄漏（canvas + ctx 显式 release）

### 📊 Metrics

| Metric | v0.3.1 | v0.4.0 | Change |
|---|---|---|---|
| LOC | 6,672 | **2,057** | **-69%** |
| Files | 14 | 25 | 模块边界更清晰 |
| TS errors | 30+ | **0** | ✅ 100% |
| lint warnings | 158 | **0** | ✅ 100% |
| jest tests | 20 | **36** | +80% |

### 🔄 Migration from v0.3.x

完整迁移指南见 [docs/migrating-v0.3.md](./docs/migrating-v0.3.md). 摘要:

| v0.3.x 字段/类型 | v0.4.x 替代 |
|---|---|
| `new PaddleOCRFacade()` | `new PaddleOcr()` |
| `new PaddleOCR()` | `new PaddleOcr()` |
| `PaddleOCROptions` | `PaddleOcrOptions` |
| `OCRResult` / `OCRError` / `OCRImageData` | `OcrResult` / `OcrError` / `OcrImageData` |
| `StatsManager.OCRStats` | `OcrStats` (独立导出) |
| `maxSideLen` | 删除 (内部自动优化) |
| `enableCache` | 删除 (默认开启) |
| `cacheSize` | 用 `cacheOptions.maxSize` |
| `threshold` | 用 `detectionThreshold` |
| `batchSize` | 用 `performanceOptions.batchSize` |
| `enableGPU` | 删除 (依赖 ONNX Runtime 自身 GPU 检测) |
| `numThreads` | 用 `performanceOptions.numThreads` |
| `useMultiScale` | 删除 (DB++ 自动启用) |
| `useAngle_cls` | 删除 (CRNN 内置) |
| `WatermarkInfo` (未实现) | 标 `@deprecated`, 完整功能见 [ROADMAP v0.5.0+](./ROADMAP.md) |

---

## [0.3.1] - 2026-05-06 — CI Fix & Architecture Simplification

### 🏗️ Architecture Simplification

- 删除 `ServiceCoordinator.ts` (562 行重复代码)
- `PaddleOCRFacade` 直接管理模块 (3 层→2 层架构)
- 删除 `paddleocr.ts` 旧主类 (604 行)
- 删除 `src/visualizing/` 目录 (1,697 行未使用代码)
- 删除 `src/core/` 未使用的管理器 (`ModelManager`, `CacheManager`, `ProcessingStrategies`)

### 🐛 CI Fixes

- 修复 `Constants.ts` namespace 语法 - ESLint `@typescript-eslint/no-namespace` 错误
- 将 `export namespace Config` 改为 `export const Config` + 独立类型别名
- CI lint 步骤现在通过 (0 errors)

### 📊 Metrics

| Metric | Before | After | Change |
|---|---|---|---|
| 代码行数 | ~9,949 | ~6,672 | -3,277 行 |
| TypeScript 错误 | 30+ | **0** | ✅ 100% |
| 测试通过率 | 20/20 | **20/20** | ✅ 保持 |
| CI Lint 错误 | 1 error | **0 errors** | ✅ 修复 |

---

## [0.3.1-pre] - 2026-05-06

Pre-release tag (历史保留, 与 v0.3.1 同步发布).

---

## [0.2.0] - Previous Releases

- 2026-03-24: Feature Enhancement and Code Quality
- 主要功能: 版面分析 / 公式识别 / 条码识别

---

## [0.1.0] - Initial Release

- 2025-04-17: 初次发布
- 基础 OCR + 表格识别

---

## 版本兼容矩阵

| v0.4.x | Node.js | 浏览器 | TypeScript |
|---|---|---|---|
| v0.4.0 | ≥ 14 | Chrome ≥ 80 / Firefox ≥ 80 / Safari ≥ 15 / Edge ≥ 80 | ≥ 5.0 |
| v0.4.1 | ≥ 14 | 同上 | ≥ 5.0 |
| v0.4.2 | ≥ 14 | 同上 | ≥ 5.0 |

| v0.3.x | Node.js | 浏览器 | TypeScript |
|---|---|---|---|
| v0.3.0 | ≥ 14 | 同上 | ≥ 4.5 |
| v0.3.1 | ≥ 14 | 同上 | ≥ 4.5 |
| v0.3.1-pre | ≥ 14 | 同上 | ≥ 4.5 |

---

**Legend**:
- 🏗️ Architecture change
- 📝 Naming / convention
- 🐛 Bug fix
- 🗑️ Dead code removal
- 📊 Metrics
- ⚠️ Deprecated (warning, not breaking)
- 💥 Breaking change
- 📦 Package / distribution

[Unreleased]: https://github.com/Agions/paddle-ocr.js/compare/v0.4.2...HEAD
[0.4.2]: https://github.com/Agions/paddle-ocr.js/compare/v0.4.1...v0.4.2
[0.4.1]: https://github.com/Agions/paddle-ocr.js/compare/v0.4.0...v0.4.1
[0.4.0]: https://github.com/Agions/paddle-ocr.js/compare/v0.3.1...v0.4.0
[0.3.1]: https://github.com/Agions/paddle-ocr.js/compare/v0.3.0...v0.3.1
[0.3.1-pre]: https://github.com/Agions/paddle-ocr.js/compare/v0.3.0...v0.3.1-pre
[0.2.0]: https://github.com/Agions/paddle-ocr.js/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/Agions/paddle-ocr.js/releases/tag/v0.1.0
