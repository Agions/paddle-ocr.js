/**
 * 检测是否在Node.js环境中运行
 */
export function isNode(): boolean {
  return (
    typeof process !== "undefined" &&
    process.versions != null &&
    process.versions.node != null
  )
}

/**
 * 检测是否在浏览器环境中运行
 */
export function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined"
}

/**
 * 检测是否在Web Worker中运行
 */
export function isWebWorker(): boolean {
  if (typeof self === "undefined") return false

  if (typeof window === "undefined") {
    try {
      return typeof (self as any).importScripts === "function"
    } catch (e) {
      return false
    }
  }

  return false
}

/**
 * 检测是否支持WebGL
 */
export function hasWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas")
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
    )
  } catch (e) {
    return false
  }
}

/**
 * 检测是否支持WebAssembly
 */
export function hasWasm(): boolean {
  try {
    if (
      typeof WebAssembly === "object" &&
      typeof WebAssembly.instantiate === "function"
    ) {
      const module = new WebAssembly.Module(
        new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0])
      )
      if (module instanceof WebAssembly.Module) {
        return new WebAssembly.Instance(module) instanceof WebAssembly.Instance
      }
    }
  } catch (e) {}
  return false
}

/**
 * 检测浏览器类型
 */
export function getBrowserType(): string {
  if (!isBrowser()) return "none"

  const ua = navigator.userAgent

  if (/Chrome/i.test(ua)) return "chrome"
  if (/Firefox/i.test(ua)) return "firefox"
  if (/Safari/i.test(ua)) return "safari"
  if (/Edge/i.test(ua)) return "edge"
  if (/MSIE|Trident/i.test(ua)) return "ie"

  return "unknown"
}
