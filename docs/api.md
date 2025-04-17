# PaddleOCR.js API文档

## 安装

```bash
npm install paddleocr-js
```

## 基本用法

```javascript
import PaddleOCR from 'paddleocr-js';

// 创建OCR实例
const paddleOCR = new PaddleOCR({
  modelPath: '/models',
  language: 'ch'
});

// 初始化
await paddleOCR.init();

// 执行文字识别
const result = await paddleOCR.recognize(image);
```

## API参考

### 构造函数

创建PaddleOCR实例。

```javascript
const paddleOCR = new PaddleOCR(options);
```

#### 参数

`options` 是一个可选的配置对象，包含以下属性：

| 属性名            | 类型     | 默认值    | 描述                                       |
| ----------------- | -------- | --------- | ------------------------------------------ |
| modelPath         | string   | '/models' | 模型文件路径                               |
| useTensorflow     | boolean  | true      | 是否使用TensorFlow.js后端                  |
| useONNX           | boolean  | false     | 是否使用ONNX Runtime后端                   |
| useWasm           | boolean  | true      | 是否使用WebAssembly加速（浏览器环境）      |
| enableDetection   | boolean  | true      | 是否启用文本检测                           |
| detectionModel    | string   | 'DB'      | 文本检测模型类型（'DB'、'DB++'、'East'等） |
| enableRecognition | boolean  | true      | 是否启用文本识别                           |
| recognitionModel  | string   | 'CRNN'    | 文本识别模型类型（'CRNN'、'SVTR'等）       |
| language          | string   | 'ch'      | 识别语言（'ch'、'en'等，支持80+种语言）    |
| enableTable       | boolean  | false     | 是否启用表格识别                           |
| enableLayout      | boolean  | false     | 是否启用版面分析                           |
| enableFormula     | boolean  | false     | 是否启用公式识别                           |
| maxSideLen        | number   | 960       | 图像最大边长                               |
| threshold         | number   | 0.3       | 检测阈值                                   |
| batchSize         | number   | 1         | 批处理大小                                 |
| enableGPU         | boolean  | false     | 是否使用GPU加速（Node.js环境）             |
| onProgress        | function | null      | 进度回调函数                               |

### init()

初始化OCR模型。

```javascript
await paddleOCR.init();
```

在使用其他方法前必须先调用此方法进行初始化。初始化过程会加载所有启用的模型。

### recognize(image, options)

执行OCR识别。

```javascript
const result = await paddleOCR.recognize(image, options);
```

#### 参数

- `image`: 输入图像，可以是以下类型：

  - 浏览器环境：HTMLImageElement、HTMLCanvasElement、ImageData、URL字符串
  - Node.js环境：文件路径、Buffer、Uint8Array
- `options`: 可选的处理选项：

  ```javascript
  {
    mode: 'text',         // 处理模式：'text'、'table'、'layout'、'all'
    returnOriginalImage: false,  // 是否在结果中包含原始图像
    useAngle: false,      // 是否进行文字方向检测
    useDeskew: false      // 是否进行图像校正
  }
  ```

#### 返回值

返回一个包含OCR结果的对象：

```javascript
{
  textDetection: [  // 检测到的文本区域
    {
      id: 0,  // 文本框ID
      box: [  // 文本框四个角点坐标
        { x: 100, y: 100 },
        { x: 200, y: 100 },
        { x: 200, y: 150 },
        { x: 100, y: 150 }
      ],
      score: 0.95  // 检测置信度
    },
    // ...更多文本框
  ],
  textRecognition: [  // 识别到的文本内容
    {
      text: "识别到的文本内容",  // 文本内容
      score: 0.98,             // 识别置信度
      box: { /* 对应的文本框 */ }  // 关联的文本框
    },
    // ...更多文本行
  ],
  duration: {  // 各阶段耗时（毫秒）
    preprocess: 10,   // 预处理耗时
    detection: 80,    // 检测耗时
    recognition: 120, // 识别耗时
    total: 210        // 总耗时
  }
}
```

### recognizeTable(image, options)

识别图像中的表格。

```javascript
const tableResult = await paddleOCR.recognizeTable(image, options);
```

#### 参数

- `image`: 输入图像，格式同 `recognize()`方法
- `options`: 可选的处理选项，格式同 `recognize()`方法

#### 返回值

返回一个包含表格识别结果的对象：

```javascript
{
  structure: {  // 表格结构信息
    rows: 5,    // 行数
    cols: 4,    // 列数
    lines: {    // 表格线条信息
      horizontal: [ /* 水平线信息 */ ],
      vertical: [ /* 垂直线信息 */ ]
    }
  },
  cells: [  // 单元格信息
    {
      box: [ /* 单元格边界框 */ ],  // 单元格边界坐标
      text: "单元格内容",         // 单元格文本内容
      rowspan: 1,                // 行合并数
      colspan: 1,                // 列合并数
      row: 0,                    // 行索引
      col: 0                     // 列索引
    },
    // ...更多单元格
  ],
  html: "<table>...</table>"  // HTML格式的表格
}
```

### analyzeLayout(image, options)

分析文档版面结构。

```javascript
const layoutResult = await paddleOCR.analyzeLayout(image, options);
```

#### 参数

- `image`: 输入图像，格式同 `recognize()`方法
- `options`: 可选的处理选项，格式同 `recognize()`方法

#### 返回值

返回一个包含版面分析结果的对象：

```javascript
{
  regions: [  // 版面区域数组
    {
      type: "title",  // 区域类型：text、title、figure、table等
      box: [ /* 区域边界框 */ ],  // 区域边界坐标
      score: 0.95,              // 区域检测置信度
      content: "区域内容"        // 区域内容（文本或表格结果）
    },
    // ...更多区域
  ]
}
```

### getOptions()

获取当前配置选项。

```javascript
const options = paddleOCR.getOptions();
```

#### 返回值

返回当前的配置选项对象，格式同构造函数的 `options`参数。

### updateOptions(options)

更新配置选项。

```javascript
paddleOCR.updateOptions({
  threshold: 0.5,
  language: 'en'
});
```

#### 参数

- `options`: 需要更新的配置项，格式同构造函数的 `options`参数，但只需包含要更新的属性。

### dispose()

释放所有资源。

```javascript
await paddleOCR.dispose();
```

当不再需要OCR功能时，应调用此方法释放模型和内存资源。

## 静态属性

### PaddleOCR.version

当前库的版本号。

```javascript
console.log(PaddleOCR.version);  // 例如：'0.1.0'
```

## 类型定义

以下是主要类型的定义，使用TypeScript时有用：

```typescript
// 坐标点
interface Point {
  x: number;
  y: number;
}

// 文本框
interface TextBox {
  id: number;
  box: Point[];
  score: number;
}

// 文本行
interface TextLine {
  text: string;
  score: number;
  box?: TextBox;
}

// OCR结果
interface OCRResult {
  textDetection: TextBox[];
  textRecognition: TextLine[];
  duration: {
    preprocess: number;
    detection: number;
    recognition: number;
    total: number;
  };
}

// 表格结果
interface TableResult {
  structure: any;
  cells: {
    box: Point[];
    text: string;
    rowspan: number;
    colspan: number;
    row: number;
    col: number;
  }[];
  html: string;
}

// 版面分析结果
interface LayoutResult {
  regions: {
    type: string;
    box: Point[];
    score: number;
    content?: string | TableResult;
  }[];
}

// 配置选项
interface PaddleOCROptions {
  modelPath?: string;
  useTensorflow?: boolean;
  useONNX?: boolean;
  useWasm?: boolean;
  enableDetection?: boolean;
  detectionModel?: string;
  enableRecognition?: boolean;
  recognitionModel?: string;
  language?: string;
  enableTable?: boolean;
  enableLayout?: boolean;
  enableFormula?: boolean;
  maxSideLen?: number;
  threshold?: number;
  batchSize?: number;
  enableGPU?: boolean;
  onProgress?: (progress: number, stage: string) => void;
}

// 处理选项
interface ProcessOptions {
  mode?: 'text' | 'table' | 'layout' | 'all';
  returnOriginalImage?: boolean;
  useAngle?: boolean;
  useDeskew?: boolean;
}
```

## 示例

### 基础文本识别示例

```javascript
import PaddleOCR from 'paddleocr-js';

async function runOCR() {
  // 创建OCR实例
  const paddleOCR = new PaddleOCR({
    modelPath: '/models',
    language: 'ch'
  });
  
  try {
    // 初始化（加载模型）
    await paddleOCR.init();
  
    // 获取图像（从Canvas、文件或URL）
    const image = document.getElementById('image');
  
    // 执行识别
    const result = await paddleOCR.recognize(image);
  
    // 处理结果
    console.log('识别结果:', result);
  
    // 显示识别文本
    const textContent = result.textRecognition
      .map(line => line.text)
      .join('\n');
  
    document.getElementById('result').textContent = textContent;
  } catch (error) {
    console.error('OCR处理失败:', error);
  } finally {
    // 释放资源
    await paddleOCR.dispose();
  }
}

runOCR();
```

### 表格识别示例

```javascript
import PaddleOCR from 'paddleocr-js';

async function recognizeTable() {
  // 创建OCR实例
  const paddleOCR = new PaddleOCR({
    modelPath: '/models',
    language: 'ch',
    enableTable: true  // 启用表格识别
  });
  
  try {
    // 初始化
    await paddleOCR.init();
  
    // 获取图像
    const image = document.getElementById('tableImage');
  
    // 识别表格
    const result = await paddleOCR.recognizeTable(image);
  
    // 显示识别结果（HTML表格）
    document.getElementById('tableResult').innerHTML = result.html;
  
    // 也可以访问结构化数据
    console.log('表格结构:', result.structure);
    console.log('单元格数据:', result.cells);
  } catch (error) {
    console.error('表格识别失败:', error);
  } finally {
    // 释放资源
    await paddleOCR.dispose();
  }
}

recognizeTable();
```

### 版面分析示例

```javascript
import PaddleOCR from 'paddleocr-js';

async function analyzeDocument() {
  // 创建OCR实例
  const paddleOCR = new PaddleOCR({
    modelPath: '/models',
    language: 'ch',
    enableLayout: true,  // 启用版面分析
    enableTable: true    // 也启用表格识别（用于表格区域）
  });
  
  try {
    // 初始化
    await paddleOCR.init();
  
    // 获取图像
    const image = document.getElementById('documentImage');
  
    // 分析版面
    const result = await paddleOCR.analyzeLayout(image);
  
    // 处理各类区域
    const outputDiv = document.getElementById('layoutResult');
    outputDiv.innerHTML = '';
  
    for (const region of result.regions) {
      const regionDiv = document.createElement('div');
      regionDiv.className = `region ${region.type}`;
    
      const titleElem = document.createElement('h3');
      titleElem.textContent = `${region.type} (置信度: ${region.score.toFixed(2)})`;
      regionDiv.appendChild(titleElem);
    
      const contentElem = document.createElement('div');
    
      if (region.type === 'table' && typeof region.content === 'object') {
        // 表格区域
        contentElem.innerHTML = region.content.html;
      } else {
        // 文本区域
        contentElem.textContent = region.content || '';
      }
    
      regionDiv.appendChild(contentElem);
      outputDiv.appendChild(regionDiv);
    }
  } catch (error) {
    console.error('版面分析失败:', error);
  } finally {
    // 释放资源
    await paddleOCR.dispose();
  }
}

analyzeDocument();
```

## 高级用法

### 自定义进度回调

```javascript
const paddleOCR = new PaddleOCR({
  // ...其他选项
  onProgress: (progress, stage) => {
    console.log(`加载进度: ${progress}%, 阶段: ${stage}`);
  
    // 更新UI进度条
    document.getElementById('progressBar').value = progress;
    document.getElementById('progressStage').textContent = stage;
  }
});
```

### 批量处理文件

```javascript
async function processBatch(fileList) {
  // 初始化一次，处理多个文件
  const paddleOCR = new PaddleOCR({
    modelPath: '/models',
    language: 'ch'
  });
  
  await paddleOCR.init();
  
  const results = [];
  
  try {
    for (const file of fileList) {
      // 在Node.js中，file可以是文件路径
      // 在浏览器中，可以使用FileReader读取文件
      const result = await paddleOCR.recognize(file);
      results.push({
        filename: file.name || file,
        result
      });
    }
  
    return results;
  } finally {
    // 所有文件处理完后释放资源
    await paddleOCR.dispose();
  }
}
```

### 动态切换语言

```javascript
async function switchLanguage(newLanguage) {
  // 更新选项
  paddleOCR.updateOptions({
    language: newLanguage
  });
  
  // 重新初始化
  await paddleOCR.dispose(); // 先释放旧模型
  await paddleOCR.init();    // 加载新的语言模型
}
```
