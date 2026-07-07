# PaddleOCR-JS 架构设计（v0.4.0 重构版）

> 本文档基于 `commit 69629ea` 重构后的代码，反映真实的模块边界、解耦方案、性能与可扩展性设计。

## 1. 顶层架构

PaddleOCR-JS 采用**三层 + Facade + DI** 的精简架构，每一层职责单一、依赖单向，避免 God Class 与循环依赖：

```
┌─────────────────────────────────────────────────────────────┐
│ Layer 0  Public API                                          │
│   src/index.ts  ─  re-exports + VERSION 静态属性注入          │
└─────────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────┐
│ Layer 1  Facade (PaddleOcr)                                  │
│   src/paddleOcr.ts  ─  init / dispose / 6 个 OCR 入口 / 缓存   │
└─────────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────┐
│ Layer 2  Core services (可单测、可替换)                       │
│                                                              │
│   modules/        │  utils/             │  core/             │
│   baseRecognizer  │  modelLoader        │  constants         │
│   textDetector    │  image              │  statsManager      │
│   textRecognizer  │  imageProcessor     │                    │
│   tableRecognizer │  cache (LruCache<T>)│                    │
│   layoutAnalyzer  │  env                │                    │
│   formulaRecog    │  modelPath          │                    │
│   barcodeRecogn   │  workerHelper       │                    │
│                   │  visualTypes        │                    │
└─────────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────┐
│ Layer 3  Pluggable backends (TensorFlow.js / ONNX Runtime)   │
│   Backend interface ◀─ TensorFlowBackend / OnnxBackend       │
└─────────────────────────────────────────────────────────────┘
            │
            ▼
       原生运行时 (browser / Node.js / Web Worker)
```

**核心约束**：

- **向下依赖**：Layer N 只调用 Layer N+1 的 API，绝不反向引用（无循环 import）
- **向上隐藏**：Layer 2 不允许 `new PaddleOcr()`，耦合方向严格单向
- **抽象边界**：Recognizer 之间通过 **DI 注入**共享子模块（不直接 `import`），避免模块间硬编码依赖

## 2. 模块解耦方案

### 2.1 Facade 层（src/paddleOcr.ts）

- **职责**：进程级编排（init 顺序、缓存、统计、进度回调）
- **不持有**：模型加载细节、预处理细节、可视化细节
- **6 个 OCR 入口**统一签名：`(image: ImageSource) => Promise<ResultType>`，模板代码消除 100%

### 2.2 Recognizer 层（src/modules/）

每个 Recognizer 满足同一契约（`BaseRecognizer`）：

```ts
abstract class BaseRecognizer {
  abstract init(): Promise<void>
  abstract <recognize/detect>(...args): Promise<Result>
  ensureReady()  // 前置检查
  // ↓ DI 通道
  constructor(options: PaddleOcrOptions)
}
```

**关键解耦点 — Recognizer 之间通过 DI 共享子模块**：

```ts
// ✅ 重构后：TableRecognizer 由 Facade 注入全局 TextDetector/TextRecognizer
new TableRecognizer(options, this.detector, this.recognizer)

// ❌ 重构前：TableRecognizer 自 new TextDetector → DB 模型被加载 3 次
```

| 重构前问题 | 重构后方案 | 性能影响 |
|---|---|---|
| DB 模型在 Facade / Table / Layout 三处独立加载 | 单实例 + DI 注入 | **DB 模型加载次数 3 → 1** |
| 5 个 Recognizer 中只有 2 个继承 BaseRecognizer | 全部 5 个继承同一基类 | 释放/错误处理逻辑统一 |
| `throw new Error("未指定模型后端")` 散 6 处 | `selectBackend()` 单点决策 | 错误信息一致 |

### 2.3 Backend 抽象（src/utils/modelLoader.ts）

```ts
interface Backend {
  kind: "tensorflow" | "onnx"
  load(path: string): Promise<LoadedModel>
}
class TensorFlowBackend implements Backend { ... }
class OnnxBackend implements Backend { ... }
```

- 添加新后端（如 WebGPU、ONNX-WebGPU）：**只需新增一个 `XxxBackend implements Backend`**，零侵入
- Backend 选择在 `ModelLoader` 构造时一次性决策，避免每个 Recognizer 各自分支判断

### 2.4 共享视觉基类（src/visualizerBase.ts）

`LightVisualizer` (mobile-optimized) + `ResultVisualizer` (desktop full-featured) 共享：

- canvas 创建 / 上下文管理
- 多边形 `pointInPolygon` / 缩放 / 描边
- 资源释放 `dispose()`

**共享代码 ~120 行**，原本各自重复 ≈ 600 行。

## 3. 依赖反转（DI）详图

```
PaddleOcr (Facade)
   │
   │  owns & owns & owns (composition root)
   ▼  ▼  ▼
detector  recognizer  tableRecognizer  layoutAnalyzer  ...
                          │                │
                          └─────shared─────┘
                          (DI injected)
```

**何时新建 Recognizer、复用 Recognizer？**

| 场景 | 决策 | 理由 |
|---|---|---|
| 主 facade 调用 | `new TextDetector(options)` | 一次性持有 |
| TableRecognizer 内部需要 detect | 注入 facade 已有的 `this.detector` | **模型复用** |
| LayoutAnalyzer 内部需要 detect | 注入 facade 已有的 `this.detector` | **模型复用** |
| 用户独立调用 `new TableRecognizer()` | 子模块为 `undefined`，降级为空 bbox | 不强加外部依赖 |

## 4. 性能与可扩展性

| 维度 | 重构前 | 重构后 |
|---|---|---|
| 模型加载次数 | DB 模型 3 次 + CRNN 3 次 | DB 模型 1 次 + CRNN 1 次 |
| 内存占用峰值 | 6 个 Recognizer × 独立模型实例 | 6 个 Recognizer × 共享模型实例 |
| 初识化时间（典型） | ~3× model fetch | ~1× model fetch |
| 可扩展后端数 | 散落在每个 Recognizer | `Backend` 接口 + 注册 |
| 可视化定制点 | 继承具体类 | 继承 `VisualizerBase` |

## 5. 命名规范

| 类别 | 规范 | 示例 |
|---|---|---|
| 文件名 | camelCase | `modelLoader.ts` / `baseRecognizer.ts` |
| 类名 / 类型 / 接口 | PascalCase | `BaseRecognizer` / `OcrResult` / `PaddleOcrOptions` |
| 函数 / 变量 | camelCase | `loadImage()` / `imageCache` |
| 常量 | UPPER_SNAKE 或 PascalCase 命名常量 | `DEFAULT_VISUAL` / `MODEL_PATH.DEFAULT` |
| 私有字段 | `private` + camelCase | `private worker: Worker \| null` |

**已删除 / 已废弃字段**：`maxSideLen` / `enableCache` / `cacheSize` / `threshold` / `batchSize` / `enableGPU` / `numThreads` / `useMultiScale` / `useAngle_cls` — 全部从 `PaddleOcrOptions` 移除。

## 6. 测试策略

- 单元测试覆盖：**utils/** (image / cache / env) + **core/** (constants / statsManager)
- Recognizer / Visualizer 留 TODO 占位（`postprocess()` / `decode()`），需要模型推理集成测试

## 7. 文件清单（25 个 TS 文件，2057 LOC）

```
src/
├── core/                    # 框架级核心（无业务依赖）
│   ├── constants.ts         # 所有魔法值/默认配置
│   └── statsManager.ts      # 请求统计
├── modules/                 # 6 个识别器 + 1 个基类
│   ├── baseRecognizer.ts    # 抽象基类 + runInference 助手
│   ├── textDetector.ts
│   ├── textRecognizer.ts
│   ├── tableRecognizer.ts   # DI 接收 detector+recognizer
│   ├── layoutAnalyzer.ts    # DI 接收 detector+recognizer+(可选)tableRecognizer
│   ├── formulaRecognizer.ts
│   └── barcodeRecognizer.ts
├── utils/                   # 可复用工具
│   ├── image.ts             # loadImage + hashKey + arrayFingerprint
│   ├── imageProcessor.ts    # ImageProcessor 静态方法集
│   ├── cache.ts             # LruCache<T> 泛型 + ImageCache/ResultCache
│   ├── env.ts               # isNode / isBrowser
│   ├── modelLoader.ts       # ModelLoader + Backend 接口 + TF/ONNX 后端
│   ├── modelPath.ts         # buildModelPath 路径模板
│   ├── visualTypes.ts       # ResultVisualizer 默认选项
│   ├── resultVisualizer.ts  # 继承 VisualizerBase
│   ├── lightVisualizer.ts   # 继承 VisualizerBase
│   └── workerHelper.ts      # PaddleOcrWorker
├── visualizerBase.ts        # ResultVisualizer + LightVisualizer 共享基类
├── typings.ts               # 所有公开类型（PascalCase）
├── index.ts                 # 统一出口 + 版本注入
├── paddleOcr.ts             # Facade（230 行，原 511 行）
├── worker.ts                # Worker 入口（与 PaddleOcrWorker 协议对齐）
└── __tests__/
    └── paddleocr.test.ts    # 10 个单元测试
```

## 8. 演进建议（next steps）

1. **完善 Recognizer `postprocess()` 实现**：DB 后处理 + CTC 解码（占当前 TODO）
2. **为 Recognizer / Visualizer 补 mock 单测**：覆盖 5 个抽象方法的行为
3. **Backend 注册表**：动态注册 `Backend`，允许运行时切换
4. **Worker fallback**：Worker 不可用时回退到主线程（非阻塞）
5. **流式 OCR**：长图像分块并行识别（已在 `BatchOcrResult` 框架下沉）

---

**架构升级原则**：每次新增功能都必须先回答两个问题 ——
1. 这一层应该负责这件事吗？
2. 如果不是这一层，那它是哪一层？它怎样调用我？
