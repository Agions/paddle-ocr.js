/**
 * 模型路径统一构建工具
 */

export interface ModelPathOptions {
  modelPath: string
  modelType: "detection" | "recognition" | "layout" | "table" | "formula" | "barcode"
  modelName: string
  language?: string
  extension: ".json" | ".onnx"
}

/**
 * 构建统一的模型路径
 * @param options 路径构建选项
 * @returns 完整的模型路径
 */
export function buildModelPath(options: ModelPathOptions): string {
  const { modelPath, modelType, modelName, language = "ch", extension } = options
  let path = `${modelPath}/`

  switch (modelType) {
    case "detection":
      path += `text/det_${modelName.toLowerCase()}/model${extension}`
      break
    case "recognition":
      path += `text/rec_${modelName.toLowerCase()}/${language}/model${extension}`
      break
    case "layout":
      path += `layout/model${extension}`
      break
    case "table":
      path += `table/model${extension}`
      break
    case "formula":
      path += `formula/${modelName.toLowerCase()}/model${extension}`
      break
    case "barcode":
      path += `barcode/detect${extension}`
      break
    default:
      throw new Error(`未知的模型类型: ${modelType}`)
  }

  return path
}

/**
 * 构建 Wasm 路径（用于 ONNX Runtime 等需要 Wasm 的库）
 */
export function buildWasmPath(modelPath: string, wasmFile: string): string {
  return `${modelPath}/onnxruntime-web/${wasmFile}`
}
