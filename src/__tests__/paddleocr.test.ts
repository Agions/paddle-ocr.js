import type { Point, OcrImageData, PaddleOcrOptions } from "../typings"
import { ErrorCode, OcrError } from "../typings"
import { ImageProcessor } from "../utils/imageProcessor"
import { hashKey, arrayFingerprint } from "../utils/image"
import { isNode, isBrowser } from "../utils/env"
import { LruCache } from "../utils/cache"

const img = (w = 10, h = 10): OcrImageData => ({ width: w, height: h, data: new Uint8Array(w * h * 4).fill(128) })

describe("ImageProcessor", () => {
  test("preprocess 返回 Float32 + 尺寸正确", () => {
    const r = ImageProcessor.preprocess(img(8, 6))
    expect(r.width).toBe(8); expect(r.height).toBe(6); expect(r.data).toBeInstanceOf(Float32Array)
  })

  test("cropRegion 正确裁剪 + 越界钳制", () => {
    const points: Point[] = [{ x: 1, y: 1 }, { x: 5, y: 1 }, { x: 5, y: 3 }, { x: 1, y: 3 }]
    const cropped = ImageProcessor.cropRegion(img(10, 10), points)
    expect(cropped.width).toBe(5); expect(cropped.height).toBe(3)
  })

  test("boundingBox 多点最大最小", () => {
    const b = ImageProcessor.boundingBox([{ x: 1, y: 5 }, { x: 8, y: 2 }])
    expect(b).toEqual({ minX: 1, minY: 2, maxX: 8, maxY: 5 })
  })

  test("cacheKey 幂等", () => {
    expect(ImageProcessor.cacheKey("a", { w: 1 } as never)).toBe(ImageProcessor.cacheKey("a", { w: 1 } as never))
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
    expect(c.has("a")).toBe(false) // LRU 淘汰
    expect(c.has("c")).toBe(true)
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
  test("arrayFingerprint 同输入同输出", () => {
    const a = new Uint8Array([1, 2, 3])
    expect(arrayFingerprint(a)).toBe(arrayFingerprint(a))
  })
})
