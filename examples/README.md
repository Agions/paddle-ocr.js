# 📚 Examples 目录

按运行平台分类的示例代码。

## 🌐 [browser/](./browser/) — 浏览器端

| 文件 | 说明 |
|---|---|
| [`index.html`](./browser/index.html) | 纯 HTML UMD 演示 (无构建) |
| [`webWorker.html`](./browser/webWorker.html) | Web Worker 不阻塞主线程 |
| [`light-visualizer.html`](./light-visualizer.html) | Light 可视化演示 |
| [`result-visualizer.html`](./result-visualizer.html) | 完整 Result 可视化演示 |

**快速开始**:

```bash
# 任意 HTTP 服务器 (例: Python 3)
cd browser
python3 -m http.server 8080

# 浏览器打开
# http://localhost:8080/index.html
```

**前提**:

1. 安装 PaddleOCR-JS: `npm install paddleocr-js`
2. `npm run build` 生成 `dist/browser/`
3. 或用 CDN: `<script src="https://cdn.jsdelivr.net/npm/paddleocr-js@0.4.2/dist/browser/index.min.js"></script>`

## 🖥️ [node/](./node/) — Node.js 端

| 文件 | 说明 |
|---|---|
| [`example.js`](./node/example.js) | CLI 工具, 接受图片路径, 输出识别结果 |

**快速开始**:

```bash
# 1. 构建 Node 包
npm run build

# 2. 运行示例
node examples/node/example.js --file path/to/image.jpg --mode text
```

**参数**:

```
--file, -f    图片路径 (必填)
--mode, -m    识别模式: text | table | formula | barcode | layout (默认: text)
--language, -l  识别语言: ch | en | fr | de | ja | ko (默认: ch)
```

**输出**: 文本行 / 表格 HTML / 公式 LaTeX / 条码数据

## ⚛️ [react/](./react/) — React 组件

| 文件 | 说明 |
|---|---|
| [`OCRComponent.tsx`](./react/OCRComponent.tsx) | 拖拽上传 + 实时识别 React 组件 |
| [`OCRComponent.css`](./react/OCRComponent.css) | 配套样式 |

**使用**:

```tsx
import { OCRComponent } from "./examples/react/OCRComponent"

<OCRComponent
  language="ch"
  enableTable={true}
  onResult={(result) => console.log(result)}
/>
```

详见 [OCRComponent.tsx](./react/OCRComponent.tsx) JSDoc.

## 🖼️ [images/](./images/) — 测试图片

| 文件 | 用途 |
|---|---|
| `text_example.jpg` | 纯文本识别测试 |
| `table_example.jpg` | 表格识别测试 |
| `layout_example.jpg` | 版面分析测试 |

## 🧪 运行所有示例

```bash
# 1. 安装 + 构建
npm install
npm run build

# 2. 启动浏览器演示
cd examples/browser
python3 -m http.server 8080

# 3. Node CLI 演示
node examples/node/example.js --file examples/images/text_example.jpg

# 4. React 演示 (需 React 项目)
npx create-react-app my-app
cp examples/react/OCRComponent.* my-app/src/
# 编辑 App.tsx import OCRComponent
```

## 💡 编写自己的示例

参考以下目录结构:

```
my-ocr-app/
├── src/
│   ├── ocr/
│   │   ├── PaddleOcrClient.ts    # 封装 PaddleOcr 调用
│   │   ├── ResultParser.ts        # 结果解析
│   │   └── Visualizer.ts          # 自定义可视化
│   └── App.tsx
├── models/                        # 你的 PaddleOCR 模型
│   ├── detection/
│   ├── recognition/
│   └── ...
└── package.json
```

参考代码:

- 基础: [node/example.js](./node/example.js)
- 异步: [browser/webWorker.html](./browser/webWorker.html)
- React: [react/OCRComponent.tsx](./react/OCRComponent.tsx)

## ❓ 遇到问题?

- 📖 [API 参考](../docs/api.md)
- 💬 [GitHub Discussions](https://github.com/Agions/paddle-ocr.js/discussions)
- 📧 [SUPPORT.md](../SUPPORT.md)

---

**最后更新**: 2026-07-08
