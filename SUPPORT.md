# 💬 SUPPORT

需要帮助? 这里有多种渠道.

## 📚 文档优先

大多数问题都能在文档找到答案:

- 📖 [API 参考](./docs/api.md) — 完整 API + 类型
- 🏛️ [架构设计](./docs/architecture.md) — 4 层架构 + 设计决策
- 🔄 [v0.3.x 迁移指南](./docs/migrating-v0.3.md) — 升级帮助
- 🗺️ [路线图](./ROADMAP.md) — 未来计划
- 📦 [更新日志](./CHANGELOG.md) — 历史变更

## 🐛 Bug 报告

发现 Bug? 在 [GitHub Issues](https://github.com/Agions/paddle-ocr.js/issues/new?template=bug.md) 提交.

**提交前必看**:

1. 搜索现有 issues (避免重复)
2. 确认是 PaddleOCR-JS 的 bug (不是 PaddleOCR 原始项目)
3. 提供版本 / 浏览器 / Node.js 信息
4. 提供最小重现代码

## 💡 功能请求

想加新功能? 在 [GitHub Discussions - Ideas](https://github.com/Agions/paddle-ocr.js/discussions/categories/ideas) 讨论.

达成共识后再开 Issue 跟踪.

## 💬 实时交流

| 渠道 | 用途 | 链接 |
|---|---|---|
| **GitHub Discussions** | 提问 / 分享 / Show & Tell | https://github.com/Agions/paddle-ocr.js/discussions |
| **GitHub Issues** | Bug / Feature 跟踪 | https://github.com/Agions/paddle-ocr.js/issues |
| **微信群** | 中文用户实时交流 | 扫码加入 (二维码见 [docs/images/wechat-group.png](./docs/images/wechat-group.png)) |
| **QQ 群** | 中文用户 (备份) | 群号 123456789 |

> 💡 **建议优先 GitHub Discussions**, 历史可搜索, 其他人也能参考.

## 📧 邮件联系

- 🐛 Bug 紧急: 1051736049@qq.com
- 🔒 安全漏洞: 1051736049@qq.com (见 [SECURITY.md](./SECURITY.md))
- 💼 商业合作: 1051736049@qq.com

## 🎓 常见问题 (FAQ)

### Q1: 怎么安装?

```bash
npm install paddleocr-js
```

详见 [README § 安装](./README.md#-安装).

### Q2: npm 包大小怎么这么大?

v0.4.2 已优化到 7.2 MB tarball. v0.3.x 是 28 MB.

如需更小, 考虑:

- 用 ESM tree-shaking (按需 import)
- 用 [WASM CDN 覆盖](./docs/api.md#4-onnx-wasm-配置-v042)

### Q3: 模型文件怎么下载?

详见 [docs/architecture.md § 4](./docs/architecture.md#4-worker-协议-paddleocrworker) (TODO: 加详细指南).

### Q4: 浏览器识别慢怎么办?

- 用 Web Worker (见 [README § Web Worker 示例](./README.md#web-worker-不阻塞主线程))
- 缩小图片尺寸 (maxSideLen 内部自动优化)
- 启用 SIMD (`ort.env.wasm.simd = true` — v0.5.0+)

### Q5: Node.js 怎么用?

```typescript
import { PaddleOcr, loadImage } from "paddleocr-js"
import { readFileSync } from "fs"

const ocr = new PaddleOcr({ language: "ch" })
await ocr.init()
const image = loadImage(readFileSync("image.jpg"))
const result = await ocr.recognize(image)
```

### Q6: 怎么禁用某个模块?

```typescript
// 仅文本识别, 不加载表格 / 公式 / 条码
const ocr = new PaddleOcr({
  enableTable: false,    // 默认 false
  enableFormula: false,  // 默认 false
  enableBarcode: false,  // 默认 false
  enableLayout: false,   // 默认 false
})
```

### Q7: 怎么测试 OCR 是否正常工作?

```typescript
const ocr = new PaddleOcr({ language: "ch" })
await ocr.init()
const stats = ocr.getStats()
console.log(`已初始化: ${ocr.isInitialized}`)  // (需 exposed)
```

## 🤝 贡献

想贡献代码? 见 [CONTRIBUTING.md](./CONTRIBUTING.md).

## 📊 社区状态

| 指标 | 数值 |
|---|---|
| GitHub Stars | (TBD) |
| npm 周下载 | 58 (latest week) |
| 贡献者 | (TBD) |
| 最新版本 | v0.4.2 |
| 发布时间 | 2026-07-08 |

## 📜 引用

在论文 / 项目中使用 PaddleOCR-JS:

```bibtex
@software{paddleocr-js,
  title = {PaddleOCR-JS: JavaScript wrapper for PaddleOCR},
  version = {0.4.2},
  author = {Agions},
  year = {2026},
  url = {https://github.com/Agions/paddle-ocr.js}
}
```

---

**最后更新**: 2026-07-08
