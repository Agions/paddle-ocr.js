/**
 * 模型路径构建
 */

export type ModelType = "detection" | "recognition" | "table" | "layout" | "formula" | "barcode"

export interface ModelPathSpec {
  base: string
  type: ModelType
  name: string
  ext: ".json" | ".onnx"
  language?: string
}

export function buildModelPath(spec: ModelPathSpec): string {
  const { base, type, name, ext, language = "ch" } = spec
  switch (type) {
    case "detection": return `${base}/text/det_${name.toLowerCase()}/model${ext}`
    case "recognition": return `${base}/text/rec_${name.toLowerCase()}/${language}/model${ext}`
    case "layout": return `${base}/layout/model${ext}`
    case "table": return `${base}/table/model${ext}`
    case "formula": return `${base}/formula/${name.toLowerCase()}/model${ext}`
    case "barcode": return `${base}/barcode/detect${ext}`
  }
}
