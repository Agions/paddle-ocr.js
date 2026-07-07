/**
 * 运行环境检测
 */

export function isNode(): boolean {
  return typeof process !== "undefined" && !!process.versions?.node
}

export function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined"
}
