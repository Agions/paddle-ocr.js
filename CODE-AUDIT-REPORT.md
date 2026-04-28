# PaddleOCR-JS 代码审核报告

**审核日期**: 2026-04-28  
**审核范围**: src/ 目录下全部 TypeScript 源码  
**代码规模**: ~6,500 行（18 个 TS 文件）

---

## 一、关键问题（Critical）

### 1. 导入错误 — index.ts 第48行
`LightVisualizer` 定义在 `lightVisualizer.ts`，但 `index.ts` 试图从 `resultVisualizer.ts` 导出：
```ts
export { ResultVisualizer, LightVisualizer } from "./utils/resultVisualizer"  // ❌ 错误
```

### 2. 模拟数据混入生产代码
`textDetector.ts` 的 `postprocess()` 和 `textRecognizer.ts` 的 `decodeText()` 使用 `Math.random()` 生成假结果。这会导致：
- 每次调用结果不一致
- 无法用于真实 OCR 场景
- 单元测试无法稳定断言

### 3. Worker 严重性能缺陷
`worker.ts` 每次消息都 `new PaddleOCR()` 并 `init()`，识别完立即 `dispose()`。这导致：
- 模型重复加载（毫秒级 → 秒级延迟）
- 内存分配/释放开销巨大
- Worker 复用意义丧失

### 4. HTML XSS 注入风险
`tableRecognizer.ts` 的 `generateTableResult()` 直接将单元格文本拼接到 HTML，未做转义：
```ts
html += `<td>${cell.text || ""}</td>`  // ❌ 如果 cell.text 包含 <script>...
```

---

## 二、高优先级问题（High）

### 5. 缓存系统「建而不用」
`paddleocr.ts` 第46-78行创建 `imageCache` 和 `resultCache`，但 `recognize()` 方法完全没有使用它们进行缓存查询/存储。

### 6. 严重代码重复（DRY 违反）
| 重复代码 | 出现位置 | 行数 |
|---------|---------|------|
| `cropRegion()` | textRecognizer, tableRecognizer, layoutAnalyzer | ~40行 × 3 |
| `preprocess()` | textDetector, textRecognizer, tableRecognizer, layoutAnalyzer, formulaRecognizer, barcodeRecognizer | ~10行 × 6 |
| 模型路径构建 | modelLoader.ts (loadTensorflowModel / loadONNXModel) | ~30行 × 2 |
| TF/ONNX 推理骨架 | 所有模块的 detect/recognize 方法 | ~20行 × 6 |

### 7. require() 与 import() 混用
在 TypeScript ESM 代码中混用 CommonJS `require()`（如 `textDetector.ts` 第51行），这：
- 破坏 Tree Shaking
- 可能导致打包问题
- 类型推断失效

### 8. 测试完全缺失
`src/__tests__/paddleocr.test.ts` 仅有：
```ts
expect(true).toBe(true)  // ❌ 零实际测试
```

---

## 三、中优先级问题（Medium）

### 9. 日志系统缺失
全项目直接使用 `console.log/warn/error`，无法：
- 在生产环境静默
- 按级别过滤
- 接入外部日志服务

### 10. dispose 模式不一致
- `textDetector` / `textRecognizer`：检查 `typeof this.model.dispose === "function"`
- `formulaRecognizer` / `barcodeRecognizer`：直接 `this.model = null`
- `tableRecognizer`：最完整（try-catch + 检查 + await）

### 11. OCRError 类型设计问题
```ts
export class OCRError extends Error {
  code: string  // 运行时可以是任意 string
}
// 但 ErrorCode 是 const 对象
export const ErrorCode = { INIT_FAILED: "INIT_FAILED", ... }
// 缺少联合类型约束
```

### 12. modelLoader.safeImport 返回空对象
```ts
return {}  // 可能导致后续调用链式崩溃，且错误被静默
```

### 13. 环境检测过于简单
```ts
export function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined"
}
// 在 JSDOM/测试环境会误判为浏览器
```

### 14. 魔法数字散落各处
- `960` (maxSideLen) — 出现在 6 个文件
- `0.3` (threshold) — 默认值硬编码
- `4` (channels) — 图像通道数
- `50` / `20` — 缓存大小

---

## 四、优化建议汇总

| 优先级 | 优化项 | 预计收益 |
|-------|--------|---------|
| P0 | 修复 index.ts 导入错误 | 消除编译错误 |
| P0 | 提取通用 cropRegion / preprocess | -120行重复代码 |
| P0 | 修复 Worker 实例复用 | 10x+ 性能提升 |
| P0 | 移除生产代码中的 Math.random | 结果一致性 |
| P1 | 启用 imageCache / resultCache | 减少重复计算 |
| P1 | 统一 require → import() | 打包优化 |
| P1 | 统一模型路径构建 | -40行重复代码 |
| P1 | 添加 XSS 防护 | 安全修复 |
| P2 | 抽象日志系统 | 可维护性 |
| P2 | 添加单元测试 | 质量保障 |
| P2 | 提取配置常量 | 可配置性 |

---

## 五、架构优化建议

1. **提取 `ImageProcessor` 工具类**：统一预处理、裁剪、归一化
2. **引入 `ModelBackend` 抽象接口**：统一 TF.js / ONNX 后端切换
3. **将 `console` 替换为 `ILogger` 接口**：支持静默/结构化日志
4. **结果缓存集成到 recognize() 管道**：基于图像哈希的 LRU 缓存
