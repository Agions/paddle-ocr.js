# PaddleOCR.js

基于[飞桨PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR)的JavaScript封装库，提供浏览器和Node.js环境下的OCR能力。

## 功能特性

- **多平台支持**：同时支持浏览器和Node.js环境
- **核心OCR功能**：文本检测、文本识别、表格识别和版面分析
- **多后端支持**：支持TensorFlow.js和ONNX Runtime推理引擎
- **多语言支持**：继承PaddleOCR的80+语言识别能力
- **轻量级**：针对Web环境优化的轻量级模型
- **高性能**：支持WebAssembly和WebGL加速
- **Web Worker支持**：在独立线程中执行OCR任务，避免阻塞主线程
- **可视化组件**：内置结果可视化组件，方便展示和交互
- **无障碍支持**：提供辅助功能支持，确保可访问性
- **移动设备优化**：专为移动设备优化的轻量级可视化组件

## 安装

```bash
# 使用npm安装
npm install paddleocr-js

# 使用yarn安装
yarn add paddleocr-js

# 使用pnpm安装
pnpm add paddleocr-js
```

## 快速开始

### 浏览器环境

#### 通过CDN使用

```html
<script src="https://cdn.jsdelivr.net/npm/paddleocr-js/dist/browser/index.min.js"></script>
<script>
  // 创建OCR实例
  const paddleOCR = new PaddleOCR({
    modelPath: '/models', // 模型路径
    language: 'ch',       // 识别语言
    useWasm: true         // 使用WebAssembly加速
  });

  // 识别图片
  async function recognize() {
    const image = document.getElementById('image');
  
    // 初始化模型
    await paddleOCR.init();
  
    // 执行识别
    const result = await paddleOCR.recognize(image);
  
    // 显示结果
    console.log(result);
  }
</script>
```

#### 通过模块化方式使用

```javascript
import PaddleOCR from 'paddleocr-js';

// 创建OCR实例
const paddleOCR = new PaddleOCR({
  modelPath: '/models',
  language: 'ch',
  useWasm: true
});

// 识别图片
async function recognize(imageElement) {  
  // 初始化模型
  await paddleOCR.init();
  
  // 执行识别
  return await paddleOCR.recognize(imageElement);
}
```

### 使用Web Worker（浏览器环境）

Web Worker 能够在后台线程中执行OCR任务，避免阻塞主线程UI渲染，提高应用响应性。

```html
<script src="https://cdn.jsdelivr.net/npm/paddleocr-js/dist/browser/index.min.js"></script>
<script>
  // 创建OCR Worker实例
  const workerOCR = new PaddleOCR.WorkerHelper({
    modelPath: '/models',
    language: 'ch',
    useWasm: true
  }, '/path/to/paddle-ocr-worker.js');  // Worker脚本路径

  // 识别图片（在Worker线程中执行）
  async function recognizeInWorker() {
    const image = document.getElementById('image');
  
    // 初始化Worker
    await workerOCR.init();
  
    // 在Worker中执行识别
    const result = await workerOCR.recognize(image);
  
    // 显示结果
    console.log(result);
  
    // 使用完毕后释放Worker资源
    workerOCR.dispose();
  }
</script>
```

#### 在框架中使用Worker

```javascript
import PaddleOCR from 'paddleocr-js';

// 创建Worker
function createOCRWorker() {
  const worker = new PaddleOCR.WorkerHelper({
    modelPath: '/models',
    language: 'ch',
    useWasm: true,
    enableTable: true // 如需表格识别
  }, '/paddle-ocr-worker.js');
  
  return worker;
}

// 在React/Vue等框架中使用
async function processImage(imageUrl) {
  const worker = createOCRWorker();
  await worker.init();
  
  try {
    // 创建图像对象
    const img = new Image();
    img.src = imageUrl;
    await new Promise(resolve => { img.onload = resolve; });
  
    // 执行识别
    const result = await worker.recognize(img);
    return result;
  } finally {
    // 释放资源
    worker.dispose();
  }
}
```

### Node.js环境

```javascript
const PaddleOCR = require('paddleocr-js');
const fs = require('fs');

async function main() {
  // 创建OCR实例
  const paddleOCR = new PaddleOCR({
    modelPath: './models',
    language: 'ch'
  });

  // 初始化模型
  await paddleOCR.init();

  // 从文件读取图像
  const image = fs.readFileSync('./test.jpg');
  
  // 执行识别
  const result = await paddleOCR.recognize(image);
  
  // 显示结果
  console.log(result);
}

main().catch(console.error);
```

## 主要API

### 创建OCR实例

```javascript
const paddleOCR = new PaddleOCR(options);
```

**选项：**

| 参数              | 类型     | 默认值    | 说明                                  |
| ----------------- | -------- | --------- | ------------------------------------- |
| modelPath         | string   | '/models' | 模型文件路径                          |
| useTensorflow     | boolean  | true      | 是否使用TensorFlow.js后端             |
| useONNX           | boolean  | false     | 是否使用ONNX Runtime后端              |
| useWasm           | boolean  | true      | 是否使用WebAssembly加速（浏览器环境） |
| enableDetection   | boolean  | true      | 是否启用文本检测                      |
| detectionModel    | string   | 'DB'      | 文本检测模型类型                      |
| enableRecognition | boolean  | true      | 是否启用文本识别                      |
| recognitionModel  | string   | 'CRNN'    | 文本识别模型类型                      |
| language          | string   | 'ch'      | 识别语言                              |
| enableTable       | boolean  | false     | 是否启用表格识别                      |
| enableLayout      | boolean  | false     | 是否启用版面分析                      |
| enableFormula     | boolean  | false     | 是否启用公式识别                      |
| maxSideLen        | number   | 960       | 图像最大边长                          |
| threshold         | number   | 0.3       | 检测阈值                              |
| enableGPU         | boolean  | false     | 是否使用GPU加速（Node.js环境）        |
| onProgress        | function | null      | 进度回调函数                          |

### 初始化

```javascript
await paddleOCR.init();
```

### 文本识别

```javascript
const result = await paddleOCR.recognize(image, options);
```

**参数：**

- `image`: 输入图像，可以是：

  - 浏览器：HTMLImageElement, HTMLCanvasElement, ImageData, URL字符串
  - Node.js：文件路径，Buffer，Uint8Array
- `options`: 处理选项

  ```javascript
  {
    mode: 'text',  // 'text', 'table', 'layout', 'all'
    useAngle: false, // 是否检测文字方向
    useDeskew: false // 是否校正图像
  }
  ```

**返回结果：**

```javascript
{
  textDetection: [  // 检测到的文本区域
    {
      id: 0,
      box: [{x: 100, y: 100}, {x: 200, y: 100}, {x: 200, y: 150}, {x: 100, y: 150}],
      score: 0.95
    },
    // ...
  ],
  textRecognition: [ // 识别到的文本内容
    {
      text: "识别到的文本内容",
      score: 0.98,
      box: { /* 对应的文本框位置 */ }
    },
    // ...
  ],
  duration: {  // 各阶段耗时（毫秒）
    preprocess: 10,
    detection: 80,
    recognition: 120,
    total: 210
  }
}
```

### 表格识别

```javascript
const tableResult = await paddleOCR.recognizeTable(image);
```

**返回结果：**

```javascript
{
  structure: { /* 表格结构信息 */ },
  cells: [
    {
      box: [{x: 100, y: 100}, {x: 200, y: 100}, {x: 200, y: 150}, {x: 100, y: 150}],
      text: "单元格内容",
      rowspan: 1,
      colspan: 1,
      row: 0,
      col: 0
    },
    // ...
  ],
  html: "<table>...</table>" // 表格HTML表示
}
```

### 版面分析

```javascript
const layoutResult = await paddleOCR.analyzeLayout(image);
```

**返回结果：**

```javascript
{
  regions: [
    {
      type: "title", // 区域类型：text, title, figure, table, 等
      box: [{x: 100, y: 100}, {x: 500, y: 100}, {x: 500, y: 150}, {x: 100, y: 150}],
      score: 0.95,
      content: "标题内容" // 或表格结果对象
    },
    // ...
  ]
}
```

### Web Worker API

```javascript
// 创建Worker助手实例
const workerOCR = new PaddleOCR.WorkerHelper(options, workerUrl);

// 初始化Worker
await workerOCR.init();

// 在Worker中执行文本识别
const result = await workerOCR.recognize(image, options);

// 在Worker中执行表格识别
const tableResult = await workerOCR.recognizeTable(image, options);

// 在Worker中执行版面分析
const layoutResult = await workerOCR.analyzeLayout(image, options);

// 更新配置选项
await workerOCR.updateOptions(newOptions);

// 释放Worker资源
workerOCR.dispose();
```

## 结果可视化组件

PaddleOCR.js 提供了多种可视化组件，以满足不同场景下的需求。

### 标准可视化组件 (ResultVisualizer)

功能完备的可视化组件，适用于桌面环境，提供丰富的交互和显示选项。

```javascript
const visualizer = new PaddleOCR.ResultVisualizer(container, options);
```

**参数：**

- `container`: 容器元素或其ID
- `options`: 可视化选项
  ```javascript
  {
    width: 800,            // 画布宽度
    height: 600,           // 画布高度
    boxColor: 'rgba(0, 0, 255, 0.5)', // 框的颜色
    textColor: '#FFFFFF',  // 文本颜色
    backgroundColor: 'rgba(0, 0, 0, 0.7)', // 文本背景颜色
    fontSize: 14,          // 字体大小
    padding: 8,            // 内边距
    showConfidence: true,  // 是否显示置信度
    showBoxId: true,       // 是否显示框ID
    interactive: true,     // 是否启用交互
    autoResize: true,      // 是否自动调整大小
    highlightColor: 'rgba(255, 255, 0, 0.5)', // 高亮颜色
    lineWidth: 2,          // 线宽
    enableAccessibility: true, // 是否启用无障碍支持
    theme: 'default'       // 主题: 'default', 'dark', 'light', 'highContrast'
  }
  ```

### 轻量级可视化组件 (LightVisualizer)

针对移动设备和性能受限环境优化的轻量级可视化组件，提供高性能渲染和触控支持。

```javascript
const lightVisualizer = new PaddleOCR.LightVisualizer(container, options);
```

**参数：**

- `container`: 容器元素或其ID
- `options`: 可视化选项
  ```javascript
  {
    width: 300,            // 画布宽度
    height: 200,           // 画布高度
    color: '#007bff',      // 框的颜色
    textColor: '#ffffff',  // 文本颜色
    bgColor: 'rgba(0, 0, 0, 0.6)', // 文本背景颜色
    fontSize: 12,          // 字体大小
    lineWidth: 2,          // 线宽
    responsive: true,      // 是否响应式
    optimizeForMobile: true, // 是否针对移动设备优化
    renderMode: 'simple',  // 渲染模式: 'simple', 'list', 'full'
    onSelect: (id, item) => {} // 选择回调函数
  }
  ```

### 主要方法

两种可视化组件提供类似的API，但轻量级组件的功能更为精简，专注于基本渲染和交互。

#### 加载图像

```javascript
await visualizer.loadImage(image);
await lightVisualizer.loadImage(image);
```

#### 设置OCR结果

```javascript
visualizer.setResult(result);
lightVisualizer.setResult(result);
```

#### 设置可视化模式

```javascript
visualizer.setMode(mode); // "text", "table" 或 "layout"
lightVisualizer.setMode(mode); // "text", "table" 或 "layout"
```

#### 更新可视化选项

```javascript
visualizer.updateOptions(options);
lightVisualizer.updateOptions(options);
```

#### 导出图像

```javascript
// 标准可视化组件
const dataUrl = visualizer.exportImage(type, quality);

// 轻量级可视化组件
const dataUrl = lightVisualizer.toDataURL(type, quality);
```

### 无障碍支持

标准可视化组件提供全面的无障碍访问支持：

1. **键盘导航**：使用方向键浏览OCR结果，回车键选择
2. **屏幕阅读器支持**：所有结果都通过ARIA属性提供给屏幕阅读器
3. **实时区域**：选择结果时提供实时语音反馈
4. **高对比度主题**：为视觉障碍用户提供高对比度显示选项

```javascript
// 启用无障碍支持和高对比度主题
const visualizer = new PaddleOCR.ResultVisualizer('container', {
  enableAccessibility: true,
  theme: 'highContrast'
});

// 导出无障碍文本
const accessibleText = visualizer.exportAccessibleText();
```

### 移动设备优化

轻量级可视化组件专为移动设备优化：

1. **触控支持**：优化的触控交互体验
2. **高性能渲染**：仅渲染可见区域的项目，减少内存占用
3. **列表视图**：提供替代的列表显示模式，更适合小屏幕设备
4. **响应式设计**：自动适应不同屏幕尺寸

```javascript
// 创建针对移动设备优化的可视化组件
const mobileVisualizer = new PaddleOCR.LightVisualizer('container', {
  optimizeForMobile: true,
  renderMode: 'list',
  responsive: true
});
```

### 示例与演示

可以在以下示例文件中查看完整的可视化组件使用方法：

- 标准可视化组件：`/examples/result-visualizer.html`
- 轻量级可视化组件：`/examples/light-visualizer.html`

## 高级用法

### 处理视频流

```javascript
// 获取视频流
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// 初始化OCR
const paddleOCR = new PaddleOCR({ /* 配置 */ });
await paddleOCR.init();

// 处理视频帧
function processFrame() {
  // 绘制视频帧到canvas
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  
  // 执行OCR
  paddleOCR.recognize(canvas)
    .then(result => {
      // 处理结果
      displayResult(result);
    
      // 请求下一帧
      requestAnimationFrame(processFrame);
    });
}

// 开始处理
video.onplay = () => {
  requestAnimationFrame(processFrame);
};
```

### 批量处理（Node.js）

```javascript
const PaddleOCR = require('paddleocr-js');
const fs = require('fs');
const path = require('path');

async function batchProcess(imageDir, outputDir) {
  // 创建OCR实例
  const paddleOCR = new PaddleOCR({ /* 配置 */ });
  await paddleOCR.init();
  
  // 读取目录下所有图像
  const files = fs.readdirSync(imageDir)
    .filter(file => /\.(jpg|jpeg|png|bmp)$/i.test(file));
  
  // 批量处理
  for (const file of files) {
    const imagePath = path.join(imageDir, file);
    const outputPath = path.join(outputDir, `${path.parse(file).name}.json`);
  
    try {
      const image = fs.readFileSync(imagePath);
      const result = await paddleOCR.recognize(image);
    
      // 保存结果
      fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
      console.log(`处理完成: ${file}`);
    } catch (err) {
      console.error(`处理失败: ${file}`, err);
    }
  }
  
  // 释放资源
  await paddleOCR.dispose();
}
```

## 架构图

```
+-----------------------------------------------------------------------+
|                             应用层                                      |
+---------------+------------------------+-------------------------------+
| 浏览器应用     | React组件              | Node.js应用                    |
+---------------+------------------------+-------------------------------+
                                |
+-----------------------------------------------------------------------+
|                             API层                                      |
+---------------+------------------------+-------------------------------+
| PaddleOCR类主API | 配置和资源管理        | WorkerHelper类                 |
+---------------+------------------------+-------------------------------+
                                |
+-----------------------------------------------------------------------+
|                           功能模块层                                    |
+---------------+------------------------+-------------------------------+
| 文本检测模块   | 文本识别模块            | 表格识别模块 | 版面分析模块     |
+---------------+------------------------+-------------+----------------+
                                |
+-----------------------------------------------------------------------+
|                           并行处理层                                    |
+---------------+------------------------+-------------------------------+
| Worker入口    | 消息传递机制            | 任务分发与处理                  |
+---------------+------------------------+-------------------------------+
                                |
+-----------------------------------------------------------------------+
|                             工具层                                      |
+---------------+------------------------+-------------------------------+
| 图像处理工具   | 环境检测工具            | 数据转换工具                    |
+---------------+------------------------+-------------------------------+
                                |
+-----------------------------------------------------------------------+
|                           推理引擎层                                    |
+---------------+------------------------+-------------------------------+
| TensorFlow.js | ONNX Runtime          | 其他推理后端                    |
+---------------+------------------------+-------------------------------+
                                |
+-----------------------------------------------------------------------+
|                           运行环境层                                    |
+---------------+------------------------+-------------------------------+
| 浏览器主线程   | Web Worker线程         | Node.js环境                    |
+---------------+------------------------+-------------------------------+
```

## 性能优化建议

1. **使用Web Worker**：在浏览器环境中，使用Web Worker可以避免OCR任务阻塞主线程，保持UI响应性
2. **开启WebAssembly**：在浏览器环境中设置 `useWasm: true`可显著提升性能
3. **调整图像大小**：通过 `maxSideLen`参数控制输入图像的最大尺寸，较小的图像处理速度更快
4. **选择合适的模型**：根据需求选择适合的检测和识别模型
5. **资源管理**：使用完毕后调用 `dispose()`释放资源

## 常见问题

### 模型加载失败

- 确保模型路径正确
- 检查网络请求是否正常
- 检查浏览器控制台或Node.js错误日志

### 内存占用过高

- 使用完毕后调用 `dispose()`释放资源
- 减小输入图像尺寸
- 在浏览器环境中使用Web Worker隔离OCR处理

### 识别精度不足

- 使用更高质量的图像
- 尝试不同的模型组合
- 调整 `threshold`参数

## 贡献指南

我们欢迎各种形式的贡献，包括但不限于：

- 提交问题和建议
- 完善文档
- 修复bug
- 添加新功能
- 优化性能

## 许可证

本项目采用 [Apache 2.0 许可证](LICENSE)。
