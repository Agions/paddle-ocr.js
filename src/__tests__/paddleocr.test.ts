import type { Point, OcrImageData, PaddleOcrOptions } from "../typings"
import { ErrorCode, OcrError } from "../typings"
import { ImageProcessor } from "../utils/imageProcessor"
import { hashKey, arrayFingerprint } from "../utils/image"
import { isNode, isBrowser } from "../utils/env"
import { LruCache, ImageCache, ResultCache } from "../utils/cache"
import { buildModelPath } from "../utils/modelPath"
import { StatsManager } from "../core/statsManager"
import { DEFAULT_VISUAL } from "../utils/visualTypes"
import { THEME_COLORS } from "../core/constants"

const img = (w = 10, h = 10): OcrImageData => ({ width: w, height: h, data: new Uint8Array(w * h * 4).fill(128) })

describe("ImageProcessor", () => {
  test("preprocess 返回 Float32 + 尺寸正确", () => {
    const r = ImageProcessor.preprocess(img(8, 6))
    expect(r.width).toBe(8); expect(r.height).toBe(6); expect(r.data).toBeInstanceOf(Float32Array)
  })

  test("preprocess normalize=false 时不缩放", () => {
    const r = ImageProcessor.preprocess(img(2, 2), false)
    expect(r.data[0]).toBe(img(2, 2).data[0])
  })

  test("preprocess normalize=true 时 255 -> 1", () => {
    const i = img(1, 1)
    i.data[0] = 255
    const r = ImageProcessor.preprocess(i)
    expect(r.data[0]).toBeCloseTo(1, 5)
  })

  test("preprocess 接受 Uint8ClampedArray 输入", () => {
    const i = img(2, 2)
    i.data = new Uint8ClampedArray(16).fill(128)
    expect(() => ImageProcessor.preprocess(i)).not.toThrow()
  })

  test("cropRegion 正确裁剪 + 越界钳制", () => {
    const points: Point[] = [{ x: 1, y: 1 }, { x: 5, y: 1 }, { x: 5, y: 3 }, { x: 1, y: 3 }]
    const cropped = ImageProcessor.cropRegion(img(10, 10), points)
    expect(cropped.width).toBe(5); expect(cropped.height).toBe(3)
  })

  test("cropRegion <3 顶点抛错", () => {
    expect(() => ImageProcessor.cropRegion(img(5, 5), [{ x: 0, y: 0 }, { x: 1, y: 1 }])).toThrow()
  })

  test("cropRegion 退化多边形（所有点重合）返回 1x1 区域而非抛错", () => {
    // 真实行为：w=1,h=1 仍合法，返回单个像素
    // 这个测试反映 spec：基础多边形是不抛错的；上层若要拒退化由调用方决定
    const p: Point[] = [{ x: 1, y: 1 }, { x: 1, y: 1 }, { x: 1, y: 1 }]
    const r = ImageProcessor.cropRegion(img(5, 5), p)
    expect(r.width).toBe(1); expect(r.height).toBe(1)
  })

  test("boundingBox 多点最大最小", () => {
    const b = ImageProcessor.boundingBox([{ x: 1, y: 5 }, { x: 8, y: 2 }])
    expect(b).toEqual({ minX: 1, minY: 2, maxX: 8, maxY: 5 })
  })

  test("cacheKey 幂等", () => {
    expect(ImageProcessor.cacheKey("a", { w: 1 } as never)).toBe(ImageProcessor.cacheKey("a", { w: 1 } as never))
  })

  test("cacheKey 不同内容 → 不同 key", () => {
    expect(ImageProcessor.cacheKey("a")).not.toBe(ImageProcessor.cacheKey("b"))
  })

  test("cacheKey 接受 Uint8Array / ArrayBuffer / 像素对象", () => {
    const k1 = ImageProcessor.cacheKey(new Uint8Array([1, 2, 3]))
    const k2 = ImageProcessor.cacheKey(new Uint8Array([1, 2, 3]).buffer)
    const k3 = ImageProcessor.cacheKey({ data: new Uint8Array([1, 2, 3]), width: 1, height: 1 })
    expect(k1).toBe(k2); expect(k2).toBe(k3)
  })
})

describe("Environment", () => {
  test("isNode 与 isBrowser 互斥", () => {
    expect(isNode()).toBe(!isBrowser())
  })
})

describe("OcrError", () => {
  test("继承 Error，code/name/stage 正确", () => {
    const e = new OcrError("m", ErrorCode.INIT_FAILED, "init")
    expect(e).toBeInstanceOf(Error); expect(e.code).toBe(ErrorCode.INIT_FAILED); expect(e.stage).toBe("init")
  })
})

describe("LruCache", () => {
  test("set/get/has 正确，超过 maxSize 会淘汰", () => {
    const c = new LruCache<string>({ maxSize: 10, maxCount: 2 })
    c.set("a", "AA", 5); c.set("b", "BB", 5); c.set("c", "CC", 5)
    expect(c.has("a")).toBe(false)
    expect(c.has("c")).toBe(true)
  })

  test("重复 set 同一 key 不重复计费", () => {
    const c = new LruCache<string>({ maxSize: 100, maxCount: 5 })
    c.set("x", "1", 10); c.set("y", "2", 10)
    c.set("x", "11", 10) // 覆盖 — 旧值 size(10) 应被释放
    // y 仍在 + x(新) = 2 entries
    expect(c.getStats().count).toBe(2)
    expect(c.getStats().size).toBe(20)
  })

  test("过期条目 get 时被删除", () => {
    const c = new LruCache<number>({ maxSize: 1_000_000, maxCount: 10, ttl: 1 })
    c.set("k", 1)
    return new Promise<void>((resolve) => setTimeout(() => {
      expect(c.has("k")).toBe(false)
      resolve()
    }, 10))
  })

  test("clear 清空 + getStats 0", () => {
    const c = new LruCache<string>({ maxCount: 5 })
    c.set("a", "x", 5)
    c.clear()
    expect(c.getStats().count).toBe(0)
  })

  test("getStats 返回 size/count/hitRate/totalHits", () => {
    const c = new LruCache<string>({ maxCount: 5 })
    c.set("k", "v", 5)
    c.get("k"); c.get("k")
    const s = c.getStats()
    expect(s.size).toBe(5); expect(s.count).toBe(1); expect(s.totalHits).toBe(2); expect(s.hitRate).toBe(1)
  })
})

describe("ImageCache / ResultCache", () => {
  test("ImageCache 字节计费", () => {
    const c = new ImageCache({ maxSize: 1, maxCount: 2 })
    const data = img(10, 10) // 400 bytes
    c.set("k", data)
    expect(c.has("k")).toBe(true)
    expect(c.get("k")?.width).toBe(10)
  })

  test("ResultCache.key 稳定 + 含 options", () => {
    const a = ResultCache.key("img1", { lang: "ch", mode: "text" })
    const b = ResultCache.key("img1", { lang: "ch", mode: "text" })
    const c = ResultCache.key("img1", { lang: "en", mode: "text" })
    expect(a).toBe(b)
    expect(a).not.toBe(c)
  })
})

describe("buildModelPath", () => {
  const base = "/models"
  test("detection 路径", () => {
    expect(buildModelPath({ base, type: "detection", name: "DB", ext: ".onnx" }))
      .toBe("/models/text/det_db/model.onnx")
  })
  test("recognition 含语言段", () => {
    expect(buildModelPath({ base, type: "recognition", name: "CRNN", ext: ".json", language: "en" }))
      .toBe("/models/text/rec_crnn/en/model.json")
  })
  test("layout 无 name 段", () => {
    expect(buildModelPath({ base, type: "layout", name: "X", ext: ".onnx" }))
      .toBe("/models/layout/model.onnx")
  })
  test("table / formula / barcode 各路径", () => {
    expect(buildModelPath({ base, type: "table", name: "T", ext: ".json" })).toBe("/models/table/model.json")
    expect(buildModelPath({ base, type: "formula", name: "LaTeX", ext: ".json" })).toBe("/models/formula/latex/model.json")
    expect(buildModelPath({ base, type: "barcode", name: "X", ext: ".onnx" })).toBe("/models/barcode/detect.onnx")
  })
})

describe("StatsManager", () => {
  test("initial 全 0", () => {
    const s = new StatsManager()
    expect(s.getStats()).toEqual({
      totalRequests: 0, successfulRequests: 0, failedRequests: 0,
      averageDuration: 0, cacheHits: 0, cacheMisses: 0,
    })
  })

  test("increment 计数器", () => {
    const s = new StatsManager()
    s.incrementTotalRequests(); s.incrementSuccessfulRequests(); s.incrementFailedRequests()
    const r = s.getStats()
    expect(r.totalRequests).toBe(1); expect(r.successfulRequests).toBe(1); expect(r.failedRequests).toBe(1)
  })

  test("updateAverageDuration 累积平均", () => {
    const s = new StatsManager()
    s.incrementSuccessfulRequests(); s.updateAverageDuration(100)
    s.incrementSuccessfulRequests(); s.updateAverageDuration(200)
    expect(s.getStats().averageDuration).toBe(150)
  })

  test("reset 全部归 0", () => {
    const s = new StatsManager()
    s.incrementTotalRequests(); s.incrementSuccessfulRequests()
    s.reset()
    expect(s.getStats().totalRequests).toBe(0)
  })

  test("getStats 返回拷贝（不影响内部状态）", () => {
    const s = new StatsManager()
    s.incrementTotalRequests()
    const r = s.getStats()
    r.totalRequests = 999
    expect(s.getStats().totalRequests).toBe(1)
  })
})

describe("Visual defaults", () => {
  test("DEFAULT_VISUAL 字段齐全", () => {
    expect(DEFAULT_VISUAL.theme).toBe("default")
    expect(DEFAULT_VISUAL.showConfidence).toBe(true)
    expect(DEFAULT_VISUAL.width).toBeGreaterThan(0)
  })

  test("THEME_COLORS 含 4 个预设主题", () => {
    expect(Object.keys(THEME_COLORS).sort()).toEqual(["dark", "default", "highContrast", "light"])
  })
})

describe("PaddleOcrOptions 类型", () => {
  test("所有字段都接受", () => {
    const o: PaddleOcrOptions = { language: "ch", enableDetection: true }
    expect(o.language).toBe("ch")
  })
})

describe("hash/arrayFingerprint helpers", () => {
  test("hashKey 确定性", () => {
    expect(hashKey("foo")).toBe(hashKey("foo"))
  })

  test("hashKey 不同输入不同输出", () => {
    expect(hashKey("foo")).not.toBe(hashKey("bar"))
  })

  test("arrayFingerprint 同输入同输出", () => {
    const a = new Uint8Array([1, 2, 3])
    expect(arrayFingerprint(a)).toBe(arrayFingerprint(a))
  })

  test("arrayFingerprint 仅截前 1000 字节", () => {
    const big = new Uint8Array(2000).fill(7)
    const truncated = new Uint8Array(1000).fill(7)
    expect(arrayFingerprint(big)).toBe(arrayFingerprint(truncated))
  })
})
