import { OCRImageData as ImageData } from "./image"
import { Point } from "../typings"

/**
 * 通用图像处理工具类
 * 统一提供预处理、裁剪、归一化等操作
 * 消除各个模块之间的重复代码
 */
export class ImageProcessor {
  /**
   * 标准化预处理：将图像数据转换为模型输入格式
   * @param image 输入图像
   * @param options 预处理选项
   */
  public static preprocess(
    image: ImageData,
    options: {
      toFloat32?: boolean
      normalize?: boolean
      scaleX?: number
      scaleY?: number
    } = {}
  ): { data: Float32Array | Uint8Array | Uint8ClampedArray; width: number; height: number; scaleX: number; scaleY: number } {
    const { toFloat32 = true, normalize = false, scaleX = 1, scaleY = 1 } = options

    let processedData: Float32Array | Uint8Array | Uint8ClampedArray

    if (toFloat32) {
      // Uint8ClampedArray 需要先转换为普通数组再创建 Float32Array
      const rawData = image.data instanceof Uint8ClampedArray
        ? new Uint8Array(image.data.buffer)
        : image.data
      processedData = new Float32Array(rawData)
      if (normalize) {
        for (let i = 0; i < processedData.length; i++) {
          processedData[i] = processedData[i] / 255.0
        }
      }
    } else {
      processedData = image.data
    }

    return {
      data: processedData,
      width: image.width,
      height: image.height,
      scaleX,
      scaleY,
    }
  }

  /**
   * 从图像中按多边形点裁剪区域
   * @param image 源图像
   * @param points 多边形顶点坐标
   * @returns 裁剪后的图像数据
   */
  public static cropRegion(image: ImageData, points: Point[]): ImageData {
    if (!points || points.length < 3) {
      throw new Error("裁剪区域需要至少3个点构成有效多边形")
    }

    // 计算边界框
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity

    for (const point of points) {
      minX = Math.min(minX, point.x)
      minY = Math.min(minY, point.y)
      maxX = Math.max(maxX, point.x)
      maxY = Math.max(maxY, point.y)
    }

    // 确保坐标在图像范围内
    minX = Math.max(0, Math.floor(minX))
    minY = Math.max(0, Math.floor(minY))
    maxX = Math.min(image.width - 1, Math.ceil(maxX))
    maxY = Math.min(image.height - 1, Math.ceil(maxY))

    const width = maxX - minX + 1
    const height = maxY - minY + 1

    if (width <= 0 || height <= 0) {
      throw new Error("裁剪区域无效：宽度或高度为0")
    }

    // 检查是否为退化区域（所有点同一位置）
    if (width === 1 && height === 1 && points.length > 1) {
      throw new Error("裁剪区域无效：退化多边形（所有点重合）")
    }

    // 创建新的图像数据
    const regionData = new Uint8Array(width * height * 4)

    // 从原图复制像素
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const srcIdx = ((minY + y) * image.width + (minX + x)) * 4
        const dstIdx = (y * width + x) * 4

        regionData[dstIdx] = image.data[srcIdx]       // R
        regionData[dstIdx + 1] = image.data[srcIdx + 1] // G
        regionData[dstIdx + 2] = image.data[srcIdx + 2] // B
        regionData[dstIdx + 3] = image.data[srcIdx + 3] // A
      }
    }

    return { width, height, data: regionData }
  }

  /**
   * 计算多边形边界框
   * @param points 多边形顶点
   */
  public static getBoundingBox(points: Point[]): { minX: number; minY: number; maxX: number; maxY: number } {
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity

    for (const point of points) {
      minX = Math.min(minX, point.x)
      minY = Math.min(minY, point.y)
      maxX = Math.max(maxX, point.x)
      maxY = Math.max(maxY, point.y)
    }

    return { minX, minY, maxX, maxY }
  }

  /**
   * 计算图像缓存键
   * @param source 图像源标识
   * @param options 处理选项
   */
  public static generateCacheKey(
    source: string | Uint8Array,
    options?: { width?: number; height?: number; threshold?: number; mode?: string }
  ): string {
    const hash = this.simpleHash(typeof source === "string" ? source : this.arrayToString(source))
    return `img_${hash}_${options?.width || 0}x${options?.height || 0}_${options?.mode || "default"}`
  }

  private static simpleHash(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash
    }
    return Math.abs(hash).toString(36)
  }

  private static arrayToString(arr: Uint8Array): string {
    return Array.from(arr).slice(0, 1000).join(",")
  }
}
