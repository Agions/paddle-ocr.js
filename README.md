# PaddleOCR-JS

JavaScript wrapper for PaddleOCR, providing OCR capabilities in browser and Node.js

## 安装

```bash
# npm
npm install paddleocr-js

# yarn
yarn add paddleocr-js

# pnpm
pnpm add paddleocr-js
```

## 基本用法

### 浏览器环境

```html
<script src="dist/browser/index.min.js"></script>
<script>
  const paddleOCR = new PaddleOCR({
    modelPath: 'path/to/models',
    useTensorflow: true,
    useWasm: true
  });
  
  // 启动OCR
  paddleOCR.init().then(() => {
    // 对图像进行处理
    paddleOCR.recognize(imageElement).then(result => {
      console.log(result);
    });
  });
</script>
```

### Node.js环境

```javascript
const { PaddleOCR } = require('paddleocr-js');
const fs = require('fs');

async function runOCR() {
  // 创建PaddleOCR实例
  const paddleOCR = new PaddleOCR({
    modelPath: 'path/to/models',
    useTensorflow: true
  });
  
  // 初始化
  await paddleOCR.init();
  
  // 读取图像并识别
  const imageBuffer = fs.readFileSync('path/to/image.jpg');
  const result = await paddleOCR.recognize(imageBuffer);
  
  console.log(result);
}

runOCR();
```

### 使用ES模块

```javascript
import { PaddleOCR } from 'paddleocr-js';

async function detectText() {
  const paddleOCR = new PaddleOCR({
    modelPath: 'path/to/models',
    useTensorflow: true,
    useWasm: true
  });
  
  await paddleOCR.init();
  
  const result = await paddleOCR.recognize(imageElement);
  return result;
}
```

## 配置选项

```javascript
const options = {
  // 模型路径
  modelPath: 'path/to/models',
  
  // 后端选择
  useTensorflow: true, // 使用TensorFlow.js作为后端
  useONNX: false,      // 使用ONNX Runtime作为后端
  
  // 特定环境优化
  useWasm: true,       // 在浏览器中使用WASM加速
  enableGPU: false,    // 在Node.js中启用GPU加速
  
  // 模型选择
  detectionModel: 'DB', // 文字检测模型
  recognitionModel: 'CRNN', // 文字识别模型
  
  // 语言设置
  language: 'ch',      // 支持语言: 'ch', 'en', 'japan', 'korean' 等
  
  // 功能开关
  enableDetection: true,     // 启用文本检测
  enableRecognition: true,   // 启用文本识别
  enableLayout: false,       // 启用版面分析
  enableTable: false,        // 启用表格识别
  
  // 性能设置
  maxWorkers: 4,             // WebWorker最大数量
  maxConcurrency: 4,         // 最大并发任务数
  
  // 回调函数
  onProgress: (progress, stage) => {
    console.log(`进度: ${progress}%, 阶段: ${stage}`);
  }
};

const paddleOCR = new PaddleOCR(options);
```

## API文档

详细API文档请参见[API文档](docs/api.md)。

## 浏览器兼容性

- Chrome 83+
- Firefox 79+
- Safari 15.4+
- Edge 83+

## Node.js兼容性

- Node.js 14.x 及以上版本

## 许可证

Apache 2.0

## 贡献指南

如果您想为项目做出贡献，请参阅[贡献指南](CONTRIBUTING.md)。

## 相关项目

- [PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR) - 高效的OCR工具库
- [TensorFlow.js](https://github.com/tensorflow/tfjs) - 用于在浏览器和Node.js中训练和部署ML模型的JavaScript库
