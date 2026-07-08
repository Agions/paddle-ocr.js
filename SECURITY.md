# 🔒 SECURITY POLICY

## 支持的版本

| 版本 | 支持状态 |
|---|---|
| v0.4.x (latest) | ✅ 活跃支持 |
| v0.3.x | ⚠️ 仅安全更新 (EOL: 2026-12-31) |
| < v0.3.0 | ❌ 不再支持 |

## 🚨 报告安全漏洞

**请勿在公开 GitHub Issues 报告安全漏洞.**

### 推荐方式: 私密联系

📧 **Email**: 1051736049@qq.com

请在邮件主题写 `[SECURITY] paddle-ocr.js <vulnerability>`, 内容包含:

1. **漏洞描述** (1-2 句话)
2. **重现步骤** (PoC 代码或步骤)
3. **影响范围** (哪些版本受影响)
4. **可能的修复** (如有)
5. **你的联系方式** (邮箱 / GitHub)

### 响应时间

| 阶段 | 时间 |
|---|---|
| 初次响应 | 48 小时内 |
| 评估 + 修复计划 | 7 天内 |
| 修复发布 | 14 天内 (高严重度优先) |
| CVE 申请 (如适用) | 修复后 30 天内 |

## 🎯 漏洞严重度分级

| 级别 | 描述 | 例子 |
|---|---|---|
| 🔴 **Critical** | 远程代码执行 / 任意文件读 | Worker 协议 RCE, 任意本地文件读 |
| 🟠 **High** | 数据泄露 / 权限提升 | 模型文件越权访问, 信息泄露 |
| 🟡 **Medium** | DoS / 资源耗尽 | 内存耗尽, 模型加载不释放 |
| 🟢 **Low** | 信息泄露 / 弱校验 | 错误信息含内部路径, console.log 残留 |

## 🛡️ 已知安全考虑

### 1. ONNX Runtime WASM CDN 来源

v0.4.2+ 默认从 `cdn.jsdelivr.net` 加载 ONNX WASM. **生产环境**应:

- 验证 CDN URL (TLS 1.3)
- 或用自托管 CDN (见 [api.md § 4](./docs/api.md#4-onnx-wasm-配置-v042))
- 或本地化部署

```typescript
import * as ort from "onnxruntime-web"
ort.env.wasm.wasmPaths = "https://your-secure-cdn.com/onnxruntime-web/1.24.3/dist/"
```

### 2. 模型文件完整性

`modelPath` 指向用户提供的模型文件. **生产环境**应:

- 验证模型 SHA-256 (自行实现)
- 限制模型来源 (签名 + 白名单)
- 监控异常加载时间

### 3. Worker postMessage 数据

`PaddleOcrWorker` 通过 `postMessage` 传 image data. 风险:

- ⚠️ Image 包含 EXIF GPS / 拍摄时间 (隐私敏感)
- ✅ 建议: 客户端 OCR 前剥离 EXIF

### 4. 依赖漏洞

```bash
# 跑 npm audit 看依赖漏洞
npm audit
```

定期跑 (CI 已集成).

## 🔐 安全最佳实践

### 用户代码

```typescript
// ✅ 推荐: 设置 cacheOptions.ttlMs 避免长期缓存敏感数据
const ocr = new PaddleOcr({
  cacheOptions: { maxSize: 50 * 1024 * 1024, ttlMs: 60 * 60 * 1000 },
})

// ✅ 推荐: 用完立即 dispose 释放模型
try {
  await ocr.recognize(image)
} finally {
  await ocr.dispose()
}

// ✅ 推荐: 处理敏感图像用专用 Image 实例
const image = await loadImage(sensitiveFile)
const result = await ocr.recognize(image)
image.data.fill(0)  // 主动清零内存
```

### Node.js 服务

```typescript
// ✅ 推荐: 用 worker_threads 隔离 OCR (CPU 密集)
import { Worker } from "worker_threads"

// ✅ 推荐: 限制并发 (内存保护)
import pLimit from "p-limit"
const limit = pLimit(2)
const tasks = images.map((img) => limit(() => ocr.recognize(img)))
```

## 📜 漏洞披露 (Hall of Fame)

感谢以下安全研究者的贡献 (按时间顺序):

*(待补充)*

## 📞 联系方式

- 🔒 安全漏洞: 1051736049@qq.com (PGP: 见 [keys/](https://github.com/Agions/paddle-ocr.js/tree/main/keys))
- 💬 一般问题: [GitHub Discussions](https://github.com/Agions/paddle-ocr.js/discussions)
- 🐛 Bug 报告: [GitHub Issues](https://github.com/Agions/paddle-ocr.js/issues)

---

**最后更新**: 2026-07-08
