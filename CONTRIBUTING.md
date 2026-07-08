# 🤝 CONTRIBUTING

欢迎参与 **PaddleOCR-JS** 开发! 这里有完整的贡献流程, 让你的 PR 顺利合并.

## 📋 行为准则

- 友善、尊重、包容
- 讨论基于技术, 不针对个人
- 接受建设性批评, 不接受无端指责
- 关注社区最大利益

## 🐛 报告 Bug

发现 Bug? 请在 [GitHub Issues](https://github.com/Agions/paddle-ocr.js/issues/new?template=bug.md) 提交, **必填**:

- **PaddleOCR-JS 版本** (`PaddleOcr.version`)
- **Node.js / 浏览器版本** + OS
- **重现步骤** (代码片段)
- **预期 vs 实际行为**
- **错误堆栈** (如有)

## 💡 提 Feature Request

想加新功能? 先在 [GitHub Discussions](https://github.com/Agions/paddle-ocr.js/discussions/categories/ideas) 讨论, 达成共识后再开 Issue + PR.

## 🔧 提交 PR

### 1. Fork & Clone

```bash
git clone https://github.com/YOUR_USERNAME/paddle-ocr.js.git
cd paddle-ocr.js
npm install
```

### 2. 建分支

```bash
git checkout -b feat/your-feature
# 或 fix/issue-number-description
```

### 3. 写代码 + 测试

**必跑**:

```bash
npm test                # 36 单测 + 新增测试
npm run type-check      # 0 errors
npm run lint            # 0 warnings
npm run build           # dist/ 产物正确
```

**新增模块必须**:

- ✅ 写单元测试 (jest, 放在 `src/__tests__/`)
- ✅ 公共 API 走 `src/index.ts` 导出
- ✅ 公共类型用 PascalCase, 私有类型用 camelCase
- ✅ 文件名用 camelCase (例: `modelLoader.ts`)

**编码规范**:

- TypeScript `strict: true` (无 `as any` / `@ts-ignore`)
- 不用 emoji 在 commit message (除非说明)
- commit message 用 [Conventional Commits](https://www.conventionalcommits.org/):
  - `feat: ...` 新功能
  - `fix: ...` Bug 修复
  - `docs: ...` 仅文档
  - `refactor: ...` 重构 (无功能变化)
  - `perf: ...` 性能优化
  - `test: ...` 仅测试
  - `chore: ...` 杂项

### 4. 推 PR

```bash
git push origin feat/your-feature
# 在 GitHub 页面点 "New Pull Request"
```

**PR 标题格式**: `<type>(<scope>): <subject>`

**PR 描述必填**:

```markdown
## 📌 关联 Issue
#123 (或 None)

## 🎯 变更内容
- 变更 1
- 变更 2

## 🧪 测试
- [x] npm test (36 + 新增 pass)
- [x] npm run type-check (0 errors)
- [x] npm run lint (0 warnings)
- [x] npm run build (success)

## 📸 截图 (UI 变更必填)
(如适用)

## 🚨 破坏性变更
- [ ] 无
- [ ] 有 (在下面说明 + 写迁移指南)
```

## 🏗️ 架构原则

v0.4.x 架构核心原则 (新增 PR 务必遵守):

1. **Backend 抽象** — TF/ONNX/WebGPU 统一接口
2. **DI 模型共享** — Table / Layout Recognizer 构造器注入共享 TextDetector / TextRecognizer
3. **Visualizer 继承 VisualizerBase** — 不重复 canvas/polygon/text 代码
4. **缓存用 LruCache<T> 泛型** — 不写新具体缓存类
5. **PascalCase 类型 + camelCase 文件** — 命名规范

详见 [docs/architecture.md](./docs/architecture.md).

## 📦 包体积

新增依赖请注意:

- ✅ **优先用 tree-shakeable ESM 包**
- ❌ 避免大依赖 (lodash / moment / chart.js 全量)
- ❌ 避免 native 绑定 (如 canvas) 进入主入口
- ⚠️ WASM 文件应运行时从 CDN 加载, 不打包进 npm

## 🧪 测试

测试覆盖率目标:

- **Utils 工具类**: ≥ 90% (无 IO 操作)
- **Recognizer**: ≥ 50% (含 init + detect mock)
- **Worker 协议**: ≥ 80% (id-based dispatch)

```bash
npm run test:coverage  # 查看覆盖率报告
```

## 📚 文档

新增公共 API 务必更新:

- `README.md` (主表)
- `docs/api.md` (类型 + 方法)
- `CHANGELOG.md` (`[Unreleased]` 区块)
- JSDoc 注释 (`src/` 内部)

## 🤖 AI 辅助提交

可以! 但请:

- ✅ 写明 "Assisted-by: <tool name>" 在 commit body
- ✅ 仔细 review AI 生成的代码 (幻觉 / 安全问题)
- ✅ 公共 API 变更必须有独立 unit test

## 📜 License

贡献的代码遵循 [Apache-2.0](./LICENSE) 协议. 提交 PR 即同意协议.

## 🆘 需要帮助?

- 💬 [GitHub Discussions](https://github.com/Agions/paddle-ocr.js/discussions) — 提问 / 讨论
- 🐛 [GitHub Issues](https://github.com/Agions/paddle-ocr.js/issues) — Bug / Feature
- 📧 Email: 1051736049@qq.com (仅限安全漏洞)
- 微信群: 见 [SUPPORT.md](./SUPPORT.md)

---

**感谢贡献! 一起让 PaddleOCR-JS 变得更好** 🚀
