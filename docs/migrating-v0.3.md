# v0.3.x → v0.4.x 迁移指南

> **目标读者**: 正在从 v0.3.x 升级到 v0.4.x 的用户
>
> **升级难度**: ⭐⭐ 中等 (字段重命名 + 9 个字段删除 + 类型统一)

## 1. 重大变更 (Breaking Changes)

### 1.1 类名 / 类型重命名 (PascalCase 化)

| v0.3.x | v0.4.x | 备注 |
|---|---|---|
| `PaddleOCRFacade` | `PaddleOcr` | 统一命名 |
| `PaddleOCR` (旧 facade 别名) | `PaddleOcr` | 删 facade 别名 |
| `PaddleOCROptions` | `PaddleOcrOptions` | 类型重命名 |
| `OCRResult` | `OcrResult` | 去掉全大写 |
| `OCRError` | `OcrError` | 去掉全大写 |
| `OCRImageData` | `OcrImageData` | 去掉全大写 |
| `StatsManager.OCRStats` | `OcrStats` (独立导出) | 扁平化嵌套 |

**import 路径调整**:

```diff
- import { PaddleOCR, OCRResult, OCRError } from "paddleocr-js"
+ import { PaddleOcr, OcrResult, OcrError } from "paddleocr-js"
```

### 1.2 字段删除 (9 个)

| v0.3.x 字段 | 处理 | 替代方案 |
|---|---|---|
| `maxSideLen` | 删除 | 内部自动优化 |
| `enableCache` | 删除 | 默认开启 |
| `cacheSize` | 删除 | 用 `cacheOptions.maxSize` |
| `cacheTtl` | 删除 | 用 `cacheOptions.ttlMs` |
| `threshold` | 删除 | 用 `detectionThreshold` |
| `batchSize` | 删除 | 用 `performanceOptions.batchSize` |
| `enableGPU` | 删除 | 依赖 ONNX Runtime 自身 GPU 检测 |
| `numThreads` | 删除 | 用 `performanceOptions.numThreads` |
| `useMultiScale` | 删除 | DB++ 自动启用 |
| `useAngle_cls` | 删除 | CRNN 内置 |

**ESLint codemod 脚本** (升级时跑):

```bash
# 删除所有已删除字段
npx jscodeshift --extensions=ts,tsx \
  --transform=./scripts/v0.4-migrate-codemod.js \
  src/
```

或手动:

```typescript
// 删除这些字段 (v0.4.x 不会报错, 但不会有效果)
const old = {
  maxSideLen: 960,
  enableCache: true,
  cacheSize: 100,
  threshold: 0.3,
  batchSize: 1,
  enableGPU: false,
  numThreads: 4,
  useMultiScale: true,
  useAngle_cls: true,
  // ... 其他 options
}

// v0.4.x 等价:
const v040 = {
  // maxSideLen: 删
  // enableCache: 删 (默认开)
  cacheOptions: { maxSize: 100 * 1024 * 1024 },  // 替代 cacheSize
  detectionThreshold: 0.3,                       // 替代 threshold
  performanceOptions: {                          // 替代 batchSize/numThreads
    batchSize: 1,
    numThreads: 4,
  },
  // enableGPU: 删
  // useMultiScale: 删 (DB++)
  // useAngle_cls: 删 (CRNN 内置)
}
```

### 1.3 文件名变更 (camelCase 化)

> ⚠️ **此变更不影响用户**, 仅影响源码贡献者. v0.4.x 仓库内部文件名变化:

| v0.3.x | v0.4.x |
|---|---|
| `Constants.ts` | `constants.ts` |
| `StatsManager.ts` | `statsManager.ts` |
| `ModelLoader.ts` | `modelLoader.ts` |
| `PaddleOCRFacade.ts` | `paddleOcr.ts` |
| `BaseRecognizer.ts` | `baseRecognizer.ts` |

## 2. 新增功能

### 2.1 DI 模型共享 (性能 +200%)

v0.4.x 起, `enableTable: true` 或 `enableLayout: true` 时, **DB / CRNN 模型只加载一次**, Table / Layout Recognizer 通过构造器注入共享.

```typescript
// v0.3.x - 加载 3 次
const ocr = new PaddleOcr({ enableTable: true })
// TextDetector (DB) 加载 1 次
// TextRecognizer (CRNN) 加载 1 次
// TableRecognizer 内部又加载 DB + CRNN 1 次
// 总计: 3 次模型加载

// v0.4.x - 加载 1 次
const ocr = new PaddleOcr({ enableTable: true })
// TextDetector (DB) 加载 1 次
// TextRecognizer (CRNN) 加载 1 次
// TableRecognizer 复用全局 TextDetector + TextRecognizer
// 总计: 1 次模型加载
```

### 2.2 严格 TypeScript

v0.4.x `strict: true` 全面开启. 编译期会捕获之前 v0.3.x 漏掉的潜在 null/undefined 错误.

```typescript
// v0.3.x 不会报错 (隐式 any)
const stats = ocr.getStats()
console.log(stats.totalReuqests)  // 拼写错误, v0.3.x 不报

// v0.4.x tsc 报错
const stats = ocr.getStats()  // OcrStats (精确类型)
console.log(stats.totalReuqests)
//                 ^^^^^^^^^^^ Property 'totalReuqests' does not exist on type 'OcrStats'
```

### 2.3 Worker 协议修复 (race condition fix)

v0.4.x 起, Worker 协议用 UUID 而非固定字符串, 解决 v0.3.x 并发请求结果错配的 race condition.

```typescript
// v0.3.x 行为
const [a, b] = await Promise.all([
  worker.recognize(imgA),
  worker.recognize(imgB),
])
// 可能 a 拿到 b 的结果 (race condition)

// v0.4.x 行为
const [a, b] = await Promise.all([
  worker.recognize(imgA),
  worker.recognize(imgB),
])
// 一定有 a→A, b→B 正确对应
```

## 3. 行为变化

### 3.1 错误码统一 (1001-9999)

v0.4.x 用 enum 统一错误码:

```typescript
import { OcrError, ErrorCode } from "paddleocr-js"

try {
  await ocr.recognize(image)
} catch (e) {
  if (e instanceof OcrError) {
    switch (e.code) {
      case ErrorCode.NOT_INITIALIZED:
        await ocr.init()
        break
      case ErrorCode.MODEL_LOAD_FAILED:
        console.error("模型加载失败", e.details)
        break
      // ... 其他 8 个错误码
    }
  }
}
```

错误码 1001-1010 见 [docs/api.md § 6.4](./api.md#64-错误).

### 3.2 `onProgress` 从 options 移到实例属性

```diff
// v0.3.x
- const ocr = new PaddleOCR({
-   onProgress: (p) => console.log(p),
- })

// v0.4.x
+ const ocr = new PaddleOcr({ /* ... */ })
+ ocr.onProgress = (p, stage) => console.log(`[${stage}] ${p.toFixed(0)}%`)
+ await ocr.init()
```

或用 `PaddleOcrOptions.onProgress` 字段 (v0.4.2+ 重新支持, 内部转发到实例属性).

### 3.3 npm 包大小

| 版本 | tarball | unpacked |
|---|---|---|
| v0.3.1 | 28 MB | 117.8 MB |
| v0.4.0 (空壳) | 8.3 KB | 22 KB |
| v0.4.1 | 28.4 MB | 117.5 MB |
| **v0.4.2** | **7.2 MB** | **32.0 MB** |

> 升级到 v0.4.2 还享受 74% 包体积优化! 详见 [CHANGELOG v0.4.2](../CHANGELOG.md).

## 4. ⚠️ v0.4.x 暂未实现的功能

| 功能 | 状态 | 完整实现 |
|---|---|---|
| 水印检测 (`detectWatermarks()`) | ⏳ v0.4.x 标 `@deprecated` (保留字段) | [ROADMAP v0.5.0+](../ROADMAP.md) |

设置 `enableWatermark: true` **不会报错也不会生效**.

## 5. 升级检查清单

升级前跑下面脚本检查代码兼容性:

```bash
# 1. 检查 import 旧类名
npx tsc --noEmit --strict
# 错误: Module '"paddleocr-js"' has no exported member 'PaddleOCR'

# 2. 检查旧类型引用
grep -rn "OCRResult\|OCRError\|OCRImageData\|PaddleOCROptions\|PaddleOCRFacade" src/

# 3. 检查已删除字段
grep -rn "maxSideLen\|enableCache\|cacheSize\|cacheTtl\|useMultiScale\|useAngle_cls" src/

# 4. 升级 package.json
npm install paddleocr-js@^0.4.2
```

升级后:

```bash
npm run type-check   # 应 0 errors (升级后)
npm test             # 36/36 pass
npm run build        # dist/ 产物
```

## 6. FAQ

### Q1: 我用了 `PaddleOCRFacade` (v0.3.x 别名), 升级后报错

```typescript
// 报错: Module 'paddleocr-js' has no exported member 'PaddleOCRFacade'
import { PaddleOCRFacade } from "paddleocr-js"

// 解决: 改为 PaddleOcr
import { PaddleOcr } from "paddleocr-js"
```

### Q2: 我设置了 `enableGPU: true`, 升级后好像没生效?

v0.4.x 删除了 `enableGPU` 字段. ONNX Runtime Web 现在自动检测 WebGPU 支持, 浏览器支持就用 WebGPU, 不支持降级 WASM.

### Q3: `WatermarkInfo` 类型还存在吗?

**存在**, 但 v0.4.x **未实现**水印检测功能. 类型仍可 import, 标 `@deprecated`. 设置 `enableWatermark: true` 不会报错但不会生效.

### Q4: Worker API 有什么变化?

`PaddleOcrWorker` 公开 API 完全一致. **协议内部**改进 (id-based), 修复 race condition. 现有用户代码无需改动.

### Q5: 升级后我看到 `new PaddleOcr()` 失败, 报 "No model backend specified"

v0.3.x 默认 `useTensorflow: true`, v0.4.x **仍然**默认 `useTensorflow: true`. 如果你之前明确设置 `useTensorflow: false` 又忘了设 `useOnnx: true`, 升级后会报这个错. 解决: 显式设一个 backend.

```typescript
new PaddleOcr({ useTensorflow: true })  // 或 useOnnx: true
```

### Q6: 我的模型文件路径需要改吗?

不需要. `modelPath` 字段语义未变.

### Q7: 我能用 v0.4.x 的 npm 包跑 v0.3.x 的代码吗?

可以, 但需要替换 import:

```typescript
// v0.3.x 代码
import { PaddleOCR, OCRResult } from "paddleocr-js"
const ocr = new PaddleOCR()
const r: OCRResult = await ocr.recognize(image)

// 最小改动: 替换 import + 类名
import { PaddleOcr, OcrResult } from "paddleocr-js"
const ocr = new PaddleOcr()
const r: OcrResult = await ocr.recognize(image)
```

## 7. 升级支持

遇到问题:

1. 看 [docs/api.md](./api.md) 完整新 API
2. 看 [docs/architecture.md](./architecture.md) 理解新架构
3. 在 [GitHub Issues](https://github.com/Agions/paddle-ocr.js/issues) 搜索/提问
4. 微信群见 [SUPPORT.md](../SUPPORT.md)

---

**最后更新**: 2026-07-08 (v0.4.2 docs 重构)
