/**
 * 模型加载器（Backend 抽象 + 模型共享缓存）
 * Phase B 重构：消除 TF/ONNX 分支硬编码，统一接口
 */

import type { PaddleOcrOptions } from "../typings"
import { buildModelPath, ModelType } from "./modelPath"
import { MODEL_PATH } from "../core/constants"

/** 后端类型 */
export type BackendKind = "tensorflow" | "onnx"

export interface LoadedModel {
  predict(input: unknown): Promise<unknown>
  run?(feeds: Record<string, unknown>): Promise<Record<string, unknown>>
  dispose?(): void
}

export interface ModelSpec {
  type: ModelType
  name?: string
  language?: string
  subPath?: string
}

/** Backend 接口 */
interface Backend {
  kind: BackendKind
  load(modelPath: string): Promise<LoadedModel>
}

/** TensorFlow 后端 */
class TensorFlowBackend implements Backend {
  kind: BackendKind = "tensorflow"
  async load(modelPath: string): Promise<LoadedModel> {
    const tf = require("@tensorflow/tfjs")
    return (await tf.loadGraphModel(modelPath)) as LoadedModel
  }
}

/** ONNX 后端 */
class OnnxBackend implements Backend {
  kind: BackendKind = "onnx"
  private static wasmPathsConfigured = false

  async load(modelPath: string): Promise<LoadedModel> {
    const ort = require("onnxruntime-web")
    // v0.4.2+: WASM 文件从 jsDelivr CDN 运行时加载 (不打包进 npm, 节省 77MB)
    // 浏览器首次加载会从 jsDelivr 下载 ~25MB WASM, 之后 HTTP 缓存复用
    // 用户可设置 `options.wasmPaths` 覆盖 (e.g. 自托管 CDN/本地路径)
    if (!OnnxBackend.wasmPathsConfigured) {
      // 用 ort 暴露的 .env.wasm.wasmPaths 默认行为 (从 unpkg 加载),
      // 显式指定 jsDelivr (中国/亚洲访问更稳).
      // 静态版本号与 package.json 保持一致 (1.24.3, 见 dependencies).
      ort.env.wasm.wasmPaths =
        "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.24.3/dist/"
      OnnxBackend.wasmPathsConfigured = true
    }
    return (await ort.InferenceSession.create(modelPath)) as LoadedModel
  }
}

function selectBackend(options: PaddleOcrOptions): Backend {
  if (options.useTensorflow) return new TensorFlowBackend()
  if (options.useOnnx) return new OnnxBackend()
  throw new Error("No model backend specified (useTensorflow/useOnnx)")
}

export class ModelLoader {
  private cache = new Map<string, LoadedModel>()
  private backend: Backend
  private basePath: string

  constructor(options: PaddleOcrOptions) {
    this.backend = selectBackend(options)
    this.basePath = options.modelPath ?? MODEL_PATH.DEFAULT
    // options 保留以备多 backend 调度等扩展；当前架构不在此处读取
    void options
  }

  /** 加载模型（自动缓存） */
  async load(spec: ModelSpec): Promise<LoadedModel> {
    const cacheKey = `${spec.type}-${spec.name ?? ""}-${spec.language ?? ""}`
    if (this.cache.has(cacheKey)) return this.cache.get(cacheKey)!

    const ext = this.backend.kind === "tensorflow" ? ".json" : ".onnx"
    const modelPath = spec.subPath
      ? `${this.basePath}/${spec.subPath}`
      : buildModelPath({
          base: this.basePath,
          type: spec.type,
          name: spec.name ?? defaultName(spec.type),
          ext,
          language: spec.language ?? "ch",
        })

    const model = await this.backend.load(modelPath)
    this.cache.set(cacheKey, model)
    return model
  }

  /** 释放所有模型 */
  dispose(): void {
    this.cache.forEach((m) => { try { m.dispose?.() } catch { /* swallow */ } })
    this.cache.clear()
  }
}

function defaultName(type: ModelType): string {
  switch (type) {
    case "detection": return "DB"
    case "recognition": return "CRNN"
    case "layout": return "Layout"
    case "table": return "TableRec"
    case "formula": return "LaTeX"
    case "barcode": return "Detect"
  }
}
