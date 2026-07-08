# 🗺️ ROADMAP — PaddleOCR-JS

> **当前状态**: v0.4.2 (npm latest, 2026-07-08)
>
> **策略**: 短期专注稳定 + 文档, 中期实现缺失功能, 长期扩展生态

## 🎯 短期 (v0.4.3 - v0.4.x, 2026 Q3)

### 文档与生态

- [x] **v0.4.2 docs 重构** (commit `0c6253a` + `3689d92` + `a511cbd` + `1c61d8a`)
  - README: Mermaid 架构图 + 迁移表
  - architecture.md: 4 层架构 + 6 大改进详解
  - api.md: 准确 API + ONNX WASM 配置
  - migrating-v0.3.md: 12 字段迁移 + 7 FAQ
- [ ] **VitePress 文档站** — `docs/index.md` + `docs/.vitepress/config.mjs` (本期)
- [ ] **examples/* 加 README** — browser / node / react 引导
- [ ] **CONTRIBUTING.md / SECURITY.md / SUPPORT.md** — 治理文档

### Bug 修复

- [x] **`PaddleOcr.version` 硬编码 0.4.0** (commit `68c5e08`)
- [x] **v0.4.0 publish workflow 缺 checkout** (commit publish.yml fix)

### 包体积优化

- [x] **ONNX WASM 不打包** (commit `c073260`, 28MB → 7.2MB)

## 🎯 中期 (v0.5.0, 2026 Q4)

### 🔴 缺失功能补齐

- [ ] **`detectWatermarks()` 完整实现** (v0.4.x 标 @deprecated)
  - 模型: PaddleOCR-Watermark (官方模型)
  - 接口: `enableWatermark: true` + `await ocr.detectWatermarks(image)`
  - 复用 DI 共享 TextDetector
- [ ] **WebGPU Backend** (v0.4.x 准备 enum, 未实现)
  - 利用 Chrome 113+ WebGPU 加速
  - 新增 `class WebGpuBackend implements Backend`
  - 自动检测 + 降级到 WASM
- [ ] **GPU ONNX Runtime** (Node.js)
  - 利用 `onnxruntime-node` native binding
  - 性能对比: CPU vs GPU (V100/A100)

### 🟡 性能优化

- [ ] **WebAssembly SIMD 加速** (浏览器)
  - `ort.env.wasm.simd = true`
  - 性能目标: 检测 300ms → 200ms
- [ ] **模型量化** (INT8)
  - CRNN 量化: 100MB → 25MB
  - DB 量化: 50MB → 12MB
- [ ] **流式识别** (Video OCR)
  - `ocr.recognizeStream(videoElement)` 实时识别视频帧

### 🟢 平台扩展

- [ ] **Cloudflare Workers / Deno Deploy 支持**
  - 利用 Service Worker API
- [ ] **React Native 适配**
  - 见 [examples/rn/](../examples/rn/) (TBD)
- [ ] **Taro / 小程序适配** (与 taro-bluetooth-print 同架构)

## 🎯 长期 (v1.0.0, 2027+)

### 商业化 / 企业版

- [ ] **官方模型托管** (`paddleocr-js-models` 包)
  - 自动下载 + 版本管理
  - CDN 加速 (jsDelivr + 自托管)
- [ ] **云端 OCR 服务** (BaaS)
  - 大文档 (> 100 MB) 上传到云端
  - GPU 服务器批量处理
- [ ] **多语言扩展** (现 6 种 → 80+ 种)
  - PaddleOCR korean/japanese/french/...
  - 自定义模型支持

### 社区

- [ ] **GitHub Discussions 启用**
  - 提问 / 分享 / Show & Tell
- [ ] **Discord 频道**
  - 实时交流
- [ ] **月度社区会议** (在线)

## 📊 版本策略

| 版本类型 | 何时发 | 内容 |
|---|---|---|
| **Patch** (v0.4.x → v0.4.x+1) | Bug fix / 文档 / 安全 | 不破坏 API |
| **Minor** (v0.4.x → v0.5.0) | 新功能 (detectWatermarks / WebGPU) | 可破坏 API (with migration) |
| **Major** (v0.x → v1.0) | API 稳定 + 生产就绪 | 长期支持 |

## 🤝 贡献

路线图不是死规定, 社区需求 > 路线图. 在 [GitHub Discussions](https://github.com/Agions/paddle-ocr.js/discussions) 提 issue 讨论.

---

**最后更新**: 2026-07-08
