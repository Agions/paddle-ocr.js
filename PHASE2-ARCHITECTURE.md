# Visualizer 模块化架构设计

## 🎯 设计目标

1. **解耦**：将原本紧密耦合的可视化逻辑拆分为独立模块
2. **复用**：提取共享功能到基类，避免代码重复
3. **扩展性**：支持轻松添加新的可视化类型
4. **可维护性**：每个模块职责单一，易于理解和维护
5. **兼容性**：保持原有 API，确保现有代码无需修改

## 🏗️ 整体架构

```
Visualizer Module System
├── Core Infrastructure Layer
│   └── BaseVisualizer (Abstract)
├── Specialized Renderers
│   ├── TextVisualizer
│   ├── TableVisualizer
│   └── LayoutVisualizer
├── Cross-cutting Concerns
│   └── AccessibilityManager
└── Facade Layer
    └── ResultVisualizer (Public API)
```

## 📚 详细设计

### 1. BaseVisualizer (抽象基类)

**职责**：提供所有可视化器共享的基础能力

```typescript
abstract class BaseVisualizer {
  // 状态管理
  protected canvas: HTMLCanvasElement
  protected ctx: CanvasRenderingContext2D
  protected image: HTMLImageElement | HTMLCanvasElement | null
  protected options: BaseVisualizerOptions
  protected highlightedIndex: number

  // 核心方法（必须由子类实现）
  abstract render(): void

  // 共享工具方法
  protected drawPolygon(points, strokeStyle, lineWidth)
  protected scalePoints(points)
  protected pointInPolygon(x, y, polygon)
  protected triggerEvent(event, data?)
}
```

**关键特性**：
- **Canvas 管理**：统一创建、尺寸调整、销毁
- **几何计算**：坐标缩放、多边形绘制、点命中检测
- **事件系统**：跨浏览器兼容的事件处理
- **主题支持**：动态样式切换

### 2. TextVisualizer

**职责**：专门处理文本检测与识别结果的可视化

```typescript
class TextVisualizer extends BaseVisualizer {
  private result: OCRResult | null

  // 文本专用方法
  public setResult(result: OCRResult): void
  public findIndexAt(x: number, y: number): number
  public getElementByIndex(index: number): { detection, recognition }
  public getAccessibilityText(index: number): string

  // 重写 render() 实现文本渲染
  public render(): void { /* ... */ }
}
```

**渲染特点**：
- 文本框绘制（带置信度标签）
- 文本内容显示（带背景色）
- 框ID 标注
- ARIA 描述生成

### 3. TableVisualizer

**职责**：表格单元格的可视化和交互

```typescript
class TableVisualizer extends BaseVisualizer {
  private result: TableResult | null

  // 表格专用方法
  public setResult(result: TableResult): void
  public findIndexAt(x: number, y: number): number
  public getElementByIndex(index: number): TableCell

  // 重写 render() 实现表格渲染
  public render(): void { /* ... */ }
}
```

**渲染特点**：
- 单元格边框绘制
- 单元格内容显示
- 行列坐标标注（R1C1 格式）
- 无障碍描述生成

### 4. LayoutVisualizer

**职责**：版面分析区域的可视化和交互

```typescript
class LayoutVisualizer extends BaseVisualizer {
  private result: LayoutResult | null

  // 版面专用方法
  public setResult(result: LayoutResult): void
  public findIndexAt(x: number, y: number): number
  public getElementByIndex(index: number): Region
  private getRegionColor(type: string): string

  // 重写 render() 实现版面渲染
  public render(): void { /* ... */ }
}
```

**渲染特点**：
- 区域类型着色（text/title/figure/table）
- 填充效果 + 描边
- 区域类型标签
- 置信度显示

### 5. AccessibilityManager

**职责**：独立的无障碍支持模块

```typescript
class AccessibilityManager {
  private container: HTMLDivElement
  private ariaLive: HTMLDivElement
  private canvas: HTMLCanvasElement

  // 无障碍功能
  public updateSummary(result, mode): void
  public updateHighlightInfo(description): void
  public updateModeLabel(mode): void
  public exportAccessibleText(result, mode): string
  public dispose(): void
}
```

**功能特性**：
- ARIA region 和 live announcement
- 键盘导航支持（方向键、回车）
- 实时摘要更新
- 无障碍文本导出

### 6. ResultVisualizer (门面类)

**职责**：保持原有 API 并提供统一的入口点

```typescript
class ResultVisualizer {
  // 内部组件
  private textViz: TextVisualizer
  private tableViz: TableVisualizer
  private layoutViz: LayoutVisualizer
  private accessibility: AccessibilityManager | null

  // 原有 API（完全兼容）
  constructor(container, options?)
  public setMode(mode: "text"|"table"|"layout"): void
  public async loadImage(image): Promise<void>
  public setResult(result): void
  public render(): void
  public addEventListener(event, listener): void
  public exportImage(type?, quality?): string
  public exportAccessibleText(): string
  public clear(): void
  public dispose(): void
}
```

**实现策略**：
- **组合模式**：持有各子可视化器的引用
- **委托模式**：将调用转发给对应的子可视化器
- **状态同步**：维护当前模式的内部状态
- **API 兼容**：所有方法签名与之前一致

## 🔄 数据流设计

```
User Code
    ↓
ResultVisualizer (Facade)
    ↓
┌─────────────────┐
│  Mode Selection │
└────────┬────────┘
         ↓
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ TextVisualizer │    │ TableVisualizer │    │ LayoutVisualizer │
└──────────────┘    └──────────────┘    └──────────────┘
       ↑                   ↑                   ↑
       │                   │                   │
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ BaseVisualizer │    │ BaseVisualizer │    │ BaseVisualizer │
└──────────────┘    └──────────────┘    └──────────────┘
       ↑
       │
┌──────────────┐
│ Canvas Context │
└──────────────┘

AccessibilityManager (独立运行)
```

## 🔧 关键技术实现

### 1. 共享基础设施

**BaseVisualizer 提供的公共方法**：

```typescript
// 几何计算
protected scalePoints(points: Point[]): Point[]
protected pointInPolygon(x: number, y: number, polygon: Point[]): boolean
protected findPolygonIndexAt(x: number, y: number, boxes: Point[][]): number

// Canvas 操作
protected drawPolygon(points, strokeStyle, lineWidth)
protected drawFilledPolygon(points, strokeStyle, fillStyle, lineWidth)
protected drawTextLabel(text, x, y, bgColor?, textColor?)

// 事件系统
public addEventListener(event: string, listener: EventListener)
public removeEventListener(event: string, listener: EventListener)
protected triggerEvent(event: string, data?: any)

// 画布管理
protected resizeCanvas()
protected setupResizeObserver(container: HTMLElement)
```

### 2. 类型安全处理

**ID 类型差异解决**：

```typescript
// textDetection.id 是 number 类型
interface TextBox {
  id: number
  box: Point[]
  score: number
}

// textRecognition.box?.id 是 string 类型
interface TextLine {
  text: string
  score: number
  box?: {
    id: string  // 注意：这里是 string！
  }
}

// 正确匹配方式
const match = textRecognition.find(t =>
  t.box && t.box.id !== undefined
    ? String(t.box.id) === String(detection.id)
    : false
)
```

### 3. 事件系统集成

**跨组件事件传递**：

```typescript
// BaseVisualizer 中的事件触发
protected triggerEvent(event: string, data?: any): void {
  if (!this.listeners.has(event)) return
  const listeners = this.listeners.get(event)!
  const customEvent = new CustomEvent(event, { detail: data })
  listeners.forEach(listener => listener(customEvent))
}

// ResultVisualizer 中的事件绑定
constructor() {
  // 绑定到共享的 listeners Map
  this.addEventListener('click', userHandler)
  this.addEventListener('hover', userHandler)
}
```

## 🧪 测试策略

### 1. 单元测试
每个可视化器可独立测试：

```typescript
describe("TextVisualizer", () => {
  it("should render text boxes correctly", () => {
    const viz = new TextVisualizer(container, options)
    viz.setResult(mockOCRResult)
    viz.render()
    // 验证 canvas 内容
  })
})
```

### 2. 集成测试
验证 facade 层的正确性：

```typescript
describe("ResultVisualizer", () => {
  it("should delegate to correct visualizer based on mode", () => {
    const viz = new ResultVisualizer(container, options)
    const mockTextViz = spyOn(TextVisualizer.prototype, 'render')
    const mockTableViz = spyOn(TableVisualizer.prototype, 'render')

    viz.setMode("text")
    viz.setResult(mockOCRResult)
    viz.render()

    expect(mockTextViz).toHaveBeenCalled()
    expect(mockTableViz).not.toHaveBeenCalled()
  })
})
```

### 3. 兼容性测试
确保原有 API 正常工作：

```typescript
it("should maintain backward compatibility", () => {
  // 原有的 API 调用方式应该仍然有效
  const viz = new ResultVisualizer("#container")
  await viz.loadImage("test.jpg")
  viz.setResult(mockResult)
  viz.setMode("text")
  viz.render()
  const imageData = viz.exportImage()
  const accessibleText = viz.exportAccessibleText()
  viz.dispose()
})
```

## 🚀 扩展指南

### 添加新的可视化器类型

1. **创建新类**：
```typescript
class FormulaVisualizer extends BaseVisualizer {
  private result: FormulaResult | null

  public setResult(result: FormulaResult): void { /* ... */ }
  public render(): void { /* ... */ }
}
```

2. **注册到 facade**：
```typescript
class ResultVisualizer {
  private formulaViz: FormulaVisualizer

  public setMode(mode: "text"|"table"|"layout"|"formula"): void {
    switch (mode) {
      case "formula": this.formulaViz.render(); break
      // ...
    }
  }
}
```

3. **导出新类型**：
```typescript
export { FormulaVisualizer } from "./visualizing/FormulaVisualizer"
```

## 📝 编码规范

### 命名约定
- `camelCase` 用于方法和变量
- `PascalCase` 用于类和接口
- 后缀 `_viz` 表示可视化器（如 `textViz`）

### 方法职责划分
- **BaseVisualizer**：纯工具方法（protected）
- **子可视化器**：业务逻辑方法（public）
- **AccessibilityManager**：无障碍特定方法
- **ResultVisualizer**：协调和兼容层（public API）

### 错误处理
- 所有方法应有适当的参数校验
- 使用 TypeScript 类型系统防止运行时错误
- 提供清晰的错误信息

## 🔍 性能考虑

### 1. 内存优化
- 共享 Canvas context，避免多个 canvas 实例
- 及时清理不再需要的引用
- 使用弱引用存储监听器

### 2. 渲染优化
- 按需渲染（只渲染可见元素）
- 使用 requestAnimationFrame 批量更新
- 缓存常用计算结果

### 3. 事件优化
- 使用事件委托减少监听器数量
- 适时移除不需要的监听器
- 防抖和节流处理高频事件

## 🔒 安全考虑

### 1. XSS 防护
- 对用户输入进行转义
- 使用 DOMPurify 清理动态生成的 HTML
- 避免直接插入未转义的字符串

### 2. 资源限制
- 限制最大渲染元素数量
- 监控内存使用情况
- 提供超时机制防止长时间运行的渲染

### 3. 类型安全
- 严格启用 TypeScript strict 模式
- 使用类型守卫处理可能为 null 的值
- 避免使用 any 类型

---

**设计版本**：v1.0  
**最后更新**：2026年4月28日