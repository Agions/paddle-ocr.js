#!/usr/bin/env node

/**
 * PaddleOCR.js Node.js示例
 * 此示例演示如何在Node.js环境中使用PaddleOCR.js进行图像识别
 */

const fs = require("fs")
const path = require("path")
const PaddleOCR = require("../../dist/node/index")

// 彩色日志函数
const log = {
  info: (message) => console.log(`\x1b[36m[信息]\x1b[0m ${message}`),
  success: (message) => console.log(`\x1b[32m[成功]\x1b[0m ${message}`),
  warning: (message) => console.log(`\x1b[33m[警告]\x1b[0m ${message}`),
  error: (message) => console.log(`\x1b[31m[错误]\x1b[0m ${message}`),
}

// 命令行参数处理
const args = process.argv.slice(2)
let filePath = null
let mode = "text"
let language = "ch"

// 解析命令行参数
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--file" || args[i] === "-f") {
    filePath = args[i + 1]
    i++
  } else if (args[i] === "--mode" || args[i] === "-m") {
    mode = args[i + 1]
    i++
  } else if (args[i] === "--language" || args[i] === "-l") {
    language = args[i + 1]
    i++
  } else if (args[i] === "--help" || args[i] === "-h") {
    console.log(`
使用方法: node example.js [选项]

选项:
  -f, --file <path>      要处理的图像文件路径
  -m, --mode <mode>      处理模式 (text|table|layout) [默认: text]
  -l, --language <lang>  识别语言 (ch|en|japan|korean|...) [默认: ch]
  -h, --help             显示帮助信息
    `)
    process.exit(0)
  }
}

// 检查必要参数
if (!filePath) {
  log.error("必须指定图像文件路径")
  console.log("使用 --help 查看帮助")
  process.exit(1)
}

// 检查文件是否存在
if (!fs.existsSync(filePath)) {
  log.error(`文件 "${filePath}" 不存在`)
  process.exit(1)
}

// 进度回调函数
const onProgress = (progress, stage) => {
  process.stdout.write(`\r加载进度: ${progress.toFixed(0)}% - ${stage}`)
  if (progress >= 100) {
    process.stdout.write("\n")
  }
}

// 主函数
async function main() {
  log.info(`处理图像文件: ${filePath}`)
  log.info(`模式: ${mode}, 语言: ${language}`)

  // 创建 OCR 实例
  const paddleOCR = new PaddleOCR({
    modelPath: path.resolve(__dirname, "../../models"),
    language: language,
    enableTable: mode === "table",
    enableLayout: mode === "layout",
    onProgress: onProgress,
  })

  try {
    // 初始化模型
    log.info("正在初始化模型...")
    await paddleOCR.init()
    log.success("模型初始化完成")

    // 读取图像文件
    const image = fs.readFileSync(filePath)

    // 处理开始时间
    const startTime = Date.now()

    // 根据模式选择处理方法
    let result
    if (mode === "table") {
      log.info("识别表格...")
      result = await paddleOCR.recognizeTable(image)
    } else if (mode === "layout") {
      log.info("分析版面...")
      result = await paddleOCR.analyzeLayout(image)
    } else {
      log.info("识别文本...")
      result = await paddleOCR.recognize(image)
    }

    // 处理结束时间
    const endTime = Date.now()
    log.success(`处理完成，耗时: ${endTime - startTime}ms`)

    // 输出结果
    if (mode === "text") {
      console.log("\n识别到的文本:")
      console.log("-------------------------------------")
      result.textRecognition.forEach((line) => {
        console.log(line.text)
      })
      console.log("-------------------------------------")

      console.log("\n性能统计:")
      console.log(`- 预处理: ${result.duration.preprocess}ms`)
      console.log(`- 文本检测: ${result.duration.detection}ms`)
      console.log(`- 文本识别: ${result.duration.recognition}ms`)
      console.log(`- 总耗时: ${result.duration.total}ms`)
    } else if (mode === "table") {
      console.log("\n表格HTML:")
      console.log("-------------------------------------")
      console.log(result.html)
      console.log("-------------------------------------")

      console.log("\n表格结构:")
      console.log(`- 行数: ${result.structure.rows}`)
      console.log(`- 列数: ${result.structure.cols}`)
      console.log(`- 单元格数量: ${result.cells.length}`)
    } else if (mode === "layout") {
      console.log("\n版面分析结果:")
      console.log("-------------------------------------")
      result.regions.forEach((region, index) => {
        console.log(
          `[区域 ${index + 1}] 类型: ${
            region.type
          }, 置信度: ${region.score.toFixed(2)}`
        )
        if (region.content) {
          if (region.type === "table" && typeof region.content === "object") {
            console.log(`  表格: ${region.content.cells.length} 个单元格`)
          } else {
            const contentPreview =
              region.content.length > 100
                ? region.content.substring(0, 100) + "..."
                : region.content
            console.log(`  内容: ${contentPreview}`)
          }
        }
      })
      console.log("-------------------------------------")
    }

    // 导出JSON结果
    const resultJsonPath = `${path.basename(
      filePath,
      path.extname(filePath)
    )}_result.json`
    fs.writeFileSync(resultJsonPath, JSON.stringify(result, null, 2))
    log.success(`结果已保存至: ${resultJsonPath}`)

    // 如果是表格模式，保存HTML
    if (mode === "table") {
      const htmlPath = `${path.basename(
        filePath,
        path.extname(filePath)
      )}_table.html`
      fs.writeFileSync(
        htmlPath,
        `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Table Result</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 8px; }
    th { background-color: #f2f2f2; }
  </style>
</head>
<body>
  <h1>表格识别结果</h1>
  ${result.html}
</body>
</html>
      `
      )
      log.success(`表格HTML已保存至: ${htmlPath}`)
    }
  } catch (error) {
    log.error(`处理过程中出错: ${error.message}`)
    console.error(error)
  } finally {
    // 释放资源
    log.info("释放资源...")
    await paddleOCR.dispose()
    log.success("资源已释放")
  }
}

// 执行主函数
main().catch((error) => {
  log.error(`程序出错: ${error.message}`)
  process.exit(1)
})
