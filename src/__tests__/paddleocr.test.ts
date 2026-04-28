import {
  Point,
  TextBox,
  TextLine,
  OCRResult,
  TableResult,
  LayoutResult,
  FormulaResult,
  BarcodeResult,
  PaddleOCROptions,
  OCRError,
  ErrorCode,
} from "../typings"

import { ImageProcessor } from "../utils/imageProcessor"
import { OCRImageData } from "../utils/image"
import { isNode, isBrowser } from "../utils/env"

// ==================== ImageProcessor 测试 ====================

describe("ImageProcessor", () => {
  const createMockImage = (w = 100, h = 100): OCRImageData => ({
    width: w,
    height: h,
    data: new Uint8Array(w * h * 4).fill(128),
  })

  describe("preprocess", () => {
    it("应返回带有正确尺寸的处理后图像", () => {
      const img = createMockImage(200, 100)
      const result = ImageProcessor.preprocess(img)

      expect(result.width).toBe(200)
      expect(result.height).toBe(100)
      expect(result.data).toBeInstanceOf(Float32Array)
      expect(result.scaleX).toBe(1)
      expect(result.scaleY).toBe(1)
    })

    it("应支持归一化处理", () => {
      const img = createMockImage(10, 10)
      img.data[0] = 255
      const result = ImageProcessor.preprocess(img, { normalize: true })

      expect(result.data[0]).toBeCloseTo(1.0, 5)
    })

    it("应支持自定义缩放比例", () => {
      const img = createMockImage(100, 100)
      const result = ImageProcessor.preprocess(img, { scaleX: 0.5, scaleY: 0.5 })

      expect(result.scaleX).toBe(0.5)
      expect(result.scaleY).toBe(0.5)
    })
  })

  describe("cropRegion", () => {
    it("应正确裁剪图像区域", () => {
      const img = createMockImage(100, 100)
      const points: Point[] = [
        { x: 10, y: 10 },
        { x: 50, y: 10 },
        { x: 50, y: 40 },
        { x: 10, y: 40 },
      ]

      const result = ImageProcessor.cropRegion(img, points)

      expect(result.width).toBe(41) // 50 - 10 + 1
      expect(result.height).toBe(31) // 40 - 10 + 1
      expect(result.data).toBeInstanceOf(Uint8Array)
      expect(result.data.length).toBe(41 * 31 * 4)
    })

    it("应将越界坐标限制在图像范围内", () => {
      const img = createMockImage(20, 20)
      const points: Point[] = [
        { x: -5, y: -5 },
        { x: 25, y: -5 },
        { x: 25, y: 25 },
        { x: -5, y: 25 },
      ]

      const result = ImageProcessor.cropRegion(img, points)

      expect(result.width).toBe(20)
      expect(result.height).toBe(20)
    })

    it("少于3个点时应抛出错误", () => {
      const img = createMockImage(10, 10)
      expect(() => ImageProcessor.cropRegion(img, [{ x: 0, y: 0 }])).toThrow()
    })

    it("无效区域时应抛出错误", () => {
      const img = createMockImage(10, 10)
      const points: Point[] = [
        { x: 5, y: 5 },
        { x: 5, y: 5 },
        { x: 5, y: 5 },
      ]
      expect(() => ImageProcessor.cropRegion(img, points)).toThrow()
    })
  })

  describe("getBoundingBox", () => {
    it("应计算正确的边界框", () => {
      const points: Point[] = [
        { x: 10, y: 20 },
        { x: 50, y: 5 },
        { x: 30, y: 60 },
      ]
      const box = ImageProcessor.getBoundingBox(points)

      expect(box.minX).toBe(10)
      expect(box.minY).toBe(5)
      expect(box.maxX).toBe(50)
      expect(box.maxY).toBe(60)
    })
  })

  describe("generateCacheKey", () => {
    it("应为相同输入生成一致的键", () => {
      const key1 = ImageProcessor.generateCacheKey("test.jpg", { width: 100, height: 200 })
      const key2 = ImageProcessor.generateCacheKey("test.jpg", { width: 100, height: 200 })
      expect(key1).toBe(key2)
    })

    it("应为不同输入生成不同的键", () => {
      const key1 = ImageProcessor.generateCacheKey("a.jpg")
      const key2 = ImageProcessor.generateCacheKey("b.jpg")
      expect(key1).not.toBe(key2)
    })
  })
})

// ==================== 环境检测测试 ====================

describe("Environment Detection", () => {
  it("isNode 应返回正确结果", () => {
    expect(typeof isNode()).toBe("boolean")
  })

  it("isBrowser 应返回正确结果", () => {
    expect(typeof isBrowser()).toBe("boolean")
  })

  it("不可能同时是浏览器和Node", () => {
    // 在当前测试环境中，应该是Node
    if (isNode()) {
      expect(isBrowser()).toBe(false)
    }
  })
})

// ==================== 类型定义测试 ====================

describe("Type Definitions", () => {
  it("TextBox 接口应可正确构造", () => {
    const box: TextBox = {
      id: 1,
      score: 0.95,
      box: [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 5 },
        { x: 0, y: 5 },
      ],
    }
    expect(box.id).toBe(1)
    expect(box.score).toBe(0.95)
    expect(box.box).toHaveLength(4)
  })

  it("TextLine 接口应可正确构造", () => {
    const line: TextLine = {
      text: "Hello",
      score: 0.9,
    }
    expect(line.text).toBe("Hello")
    expect(line.score).toBe(0.9)
  })

  it("OCRResult 接口应可正确构造", () => {
    const result: OCRResult = {
      textDetection: [],
      textRecognition: [],
      duration: {
        preprocess: 10,
        detection: 50,
        recognition: 100,
        total: 160,
      },
    }
    expect(result.duration.total).toBe(160)
  })
})

// ==================== OCRError 测试 ====================

describe("OCRError", () => {
  it("应正确设置错误属性", () => {
    const error = new OCRError("Test error", ErrorCode.INIT_FAILED, "test", { detail: true })

    expect(error.message).toBe("Test error")
    expect(error.code).toBe(ErrorCode.INIT_FAILED)
    expect(error.stage).toBe("test")
    expect(error.details).toEqual({ detail: true })
    expect(error.name).toBe("OCRError")
  })

  it("应是 Error 的实例", () => {
    const error = new OCRError("Test", ErrorCode.RECOGNITION_FAILED)
    expect(error).toBeInstanceOf(Error)
    expect(error).toBeInstanceOf(OCRError)
  })
})

// ==================== 配置选项测试 ====================

describe("PaddleOCROptions", () => {
  it("默认配置应包含必需字段", () => {
    const options: PaddleOCROptions = {
      modelPath: "./models",
      language: "ch",
      enableDetection: true,
      enableRecognition: true,
    }

    expect(options.modelPath).toBe("./models")
    expect(options.language).toBe("ch")
    expect(options.enableDetection).toBe(true)
    expect(options.enableRecognition).toBe(true)
  })

  it("支持所有语言选项", () => {
    const languages: Array<"ch" | "en" | "fr" | "de" | "ja" | "ko"> = ["ch", "en", "fr", "de", "ja", "ko"]
    for (const lang of languages) {
      const options: PaddleOCROptions = { language: lang }
      expect(options.language).toBe(lang)
    }
  })
})
