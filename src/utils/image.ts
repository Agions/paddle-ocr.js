import { ImageSource } from "../typings"
import { isNode, isBrowser } from "./env"

/**
 * 图像对象：统一处理浏览器和Node环境的图像
 */
export interface ImageData {
  width: number
  height: number
  data: Uint8Array | Uint8ClampedArray
  channels?: number
}

/**
 * 加载图像
 * @param source 图像源
 */
export async function loadImage(source: ImageSource): Promise<ImageData> {
  if (isNode()) {
    return loadImageNode(source)
  } else if (isBrowser()) {
    return loadImageBrowser(source)
  } else {
    throw new Error("不支持的运行环境")
  }
}

/**
 * 在Node.js环境中加载图像
 */
async function loadImageNode(source: ImageSource): Promise<ImageData> {
  // 在Node.js环境中，使用canvas包处理图像
  const { createCanvas, loadImage } = require("canvas")

  let img
  if (typeof source === "string") {
    // 从文件路径或URL加载
    img = await loadImage(source)
  } else if (source instanceof Uint8Array || Buffer.isBuffer(source)) {
    // 从二进制数据加载
    img = await loadImage(source)
  } else {
    throw new Error("Node环境中不支持的图像源类型")
  }

  const canvas = createCanvas(img.width, img.height)
  const ctx = canvas.getContext("2d")
  ctx.drawImage(img, 0, 0)

  const imageData = ctx.getImageData(0, 0, img.width, img.height)

  return {
    width: imageData.width,
    height: imageData.height,
    data: imageData.data,
    channels: 4,
  }
}

/**
 * 在浏览器环境中加载图像
 */
async function loadImageBrowser(source: ImageSource): Promise<ImageData> {
  // 处理HTMLImageElement
  if (source instanceof HTMLImageElement) {
    if (!source.complete) {
      // 如果图片尚未加载完成，等待加载
      await new Promise<void>((resolve, reject) => {
        source.onload = () => resolve()
        source.onerror = () => reject(new Error("图像加载失败"))
      })
    }

    // 创建canvas并绘制图像
    const canvas = document.createElement("canvas")
    canvas.width = source.naturalWidth
    canvas.height = source.naturalHeight

    const ctx = canvas.getContext("2d")
    if (!ctx) {
      throw new Error("无法创建2D上下文")
    }

    ctx.drawImage(source, 0, 0)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

    return {
      width: imageData.width,
      height: imageData.height,
      data: imageData.data,
      channels: 4,
    }
  }
  // 处理HTMLCanvasElement
  else if (source instanceof HTMLCanvasElement) {
    const ctx = source.getContext("2d")
    if (!ctx) {
      throw new Error("无法创建2D上下文")
    }

    const imageData = ctx.getImageData(0, 0, source.width, source.height)

    return {
      width: imageData.width,
      height: imageData.height,
      data: imageData.data,
      channels: 4,
    }
  }
  // 处理ImageData对象
  else if (
    (typeof ImageData !== "undefined" && source instanceof ImageData) ||
    (source &&
      typeof source === "object" &&
      "width" in source &&
      "height" in source &&
      "data" in source)
  ) {
    // 使用类型断言来确保TypeScript理解这个结构
    const imgData = source as {
      width: number
      height: number
      data: Uint8Array | Uint8ClampedArray
    }

    return {
      width: imgData.width,
      height: imgData.height,
      data: imgData.data,
      channels: 4,
    }
  }
  // 处理URL字符串
  else if (typeof source === "string") {
    // 从URL或Data URL加载
    const img = new Image()
    img.crossOrigin = "anonymous" // 解决跨域问题

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error("图像加载失败"))
      img.src = source
    })

    return loadImageBrowser(img)
  } else {
    throw new Error("浏览器环境中不支持的图像源类型")
  }
}

/**
 * 预处理图像，调整大小，标准化等
 * @param imageData 输入图像数据
 * @param maxSideLen 最大边长
 * @param preserveAspectRatio 是否保持宽高比
 */
export function preprocessImage(
  imageData: ImageData,
  maxSideLen: number = 960,
  preserveAspectRatio: boolean = true
): ImageData {
  // 性能优化：如果图像尺寸已经小于最大边长，则不调整大小
  if (imageData.width <= maxSideLen && imageData.height <= maxSideLen) {
    return imageData
  }

  let targetWidth: number
  let targetHeight: number

  // 计算调整后的大小，保持纵横比
  if (preserveAspectRatio) {
    if (imageData.width > imageData.height) {
      targetWidth = maxSideLen
      targetHeight = Math.round(
        imageData.height * (maxSideLen / imageData.width)
      )
    } else {
      targetHeight = maxSideLen
      targetWidth = Math.round(
        imageData.width * (maxSideLen / imageData.height)
      )
    }
  } else {
    // 不保持纵横比，直接调整为最大尺寸
    targetWidth = maxSideLen
    targetHeight = maxSideLen
  }

  // 创建一个新的canvas进行大小调整
  let canvas: HTMLCanvasElement
  let ctx: CanvasRenderingContext2D

  if (isBrowser()) {
    canvas = document.createElement("canvas")
    ctx = canvas.getContext("2d") as CanvasRenderingContext2D
  } else {
    const { createCanvas } = require("canvas")
    canvas = createCanvas(targetWidth, targetHeight)
    ctx = canvas.getContext("2d") as CanvasRenderingContext2D
  }

  canvas.width = targetWidth
  canvas.height = targetHeight

  // 创建临时canvas用于绘制原始图像
  let tempCanvas: HTMLCanvasElement
  let tempCtx: CanvasRenderingContext2D

  if (isBrowser()) {
    tempCanvas = document.createElement("canvas")
    tempCtx = tempCanvas.getContext("2d") as CanvasRenderingContext2D
  } else {
    const { createCanvas } = require("canvas")
    tempCanvas = createCanvas(imageData.width, imageData.height)
    tempCtx = tempCanvas.getContext("2d") as CanvasRenderingContext2D
  }

  tempCanvas.width = imageData.width
  tempCanvas.height = imageData.height

  // 性能优化：直接创建ImageData对象而不是先绘制再获取
  const tempImgData = new (
    isBrowser() ? window.ImageData : require("canvas").ImageData
  )(new Uint8ClampedArray(imageData.data), imageData.width, imageData.height)

  tempCtx.putImageData(tempImgData, 0, 0)

  // 使用缩放绘制到目标canvas
  ctx.drawImage(
    tempCanvas,
    0,
    0,
    imageData.width,
    imageData.height,
    0,
    0,
    targetWidth,
    targetHeight
  )

  // 获取调整大小后的图像数据
  const resizedImgData = ctx.getImageData(0, 0, targetWidth, targetHeight)

  return {
    width: targetWidth,
    height: targetHeight,
    data: resizedImgData.data,
    channels: 4,
  }
}

/**
 * 图像归一化处理 - 将像素值归一化到[-1,1]或[0,1]区间
 * @param imageData 输入图像数据
 * @param toRange01 是否归一化到[0,1]区间，默认为[-1,1]区间
 */
export function normalizeImage(
  imageData: ImageData,
  toRange01: boolean = false
): Float32Array {
  const { width, height, data } = imageData
  const pixelCount = width * height
  const normalized = new Float32Array(pixelCount * 3) // 仅使用RGB通道

  const scale = toRange01 ? 255 : 127.5
  const offset = toRange01 ? 0 : 1

  // 性能优化：使用单次循环处理所有像素，减少循环开销
  for (let i = 0, j = 0; i < data.length; i += 4, j += 3) {
    // 转换RGB值到所需范围
    normalized[j] = data[i] / scale - (toRange01 ? 0 : 1) // R
    normalized[j + 1] = data[i + 1] / scale - (toRange01 ? 0 : 1) // G
    normalized[j + 2] = data[i + 2] / scale - (toRange01 ? 0 : 1) // B
    // 忽略Alpha通道
  }

  return normalized
}

/**
 * 图像通道重排 - 从RGBA格式转换为模型所需的格式（如RGB、BGR等）
 * @param imageData 输入图像数据
 * @param channelOrder 通道顺序，如'RGB'或'BGR'
 */
export function reorderChannels(
  imageData: ImageData,
  channelOrder: "RGB" | "BGR" = "RGB"
): Uint8Array {
  const { width, height, data } = imageData
  const pixelCount = width * height
  const result = new Uint8Array(pixelCount * 3)

  const rIndex = channelOrder === "RGB" ? 0 : 2
  const gIndex = 1
  const bIndex = channelOrder === "RGB" ? 2 : 0

  for (let i = 0, j = 0; i < data.length; i += 4, j += 3) {
    result[j + rIndex] = data[i] // R
    result[j + gIndex] = data[i + 1] // G
    result[j + bIndex] = data[i + 2] // B
  }

  return result
}

/**
 * 图像缓存系统 - 缓存处理过的图像以提高性能
 */
class ImageCache {
  private cache = new Map<string, ImageData>()
  private maxSize: number

  constructor(maxSize: number = 10) {
    this.maxSize = maxSize
  }

  get(key: string): ImageData | undefined {
    return this.cache.get(key)
  }

  set(key: string, imageData: ImageData): void {
    // 如果缓存已满，删除最早添加的条目
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value
      if (firstKey !== undefined) {
        this.cache.delete(firstKey)
      }
    }

    this.cache.set(key, imageData)
  }

  clear(): void {
    this.cache.clear()
  }
}

// 导出图像缓存实例
export const imageCache = new ImageCache(20)
