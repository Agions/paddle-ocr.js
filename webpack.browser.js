const { merge } = require("webpack-merge")
const path = require("path")
const CopyPlugin = require("copy-webpack-plugin")
const TerserPlugin = require("terser-webpack-plugin")
const CompressionPlugin = require("compression-webpack-plugin")
const common = require("./webpack.common.js")
const fs = require("fs")

// 检查资源文件夹是否存在
const assetsExist = fs.existsSync(path.resolve(__dirname, "src/assets"))

// 构建CopyPlugin配置
// 注: 之前 v0.4.0/v0.4.1 把 onnxruntime-web/tfjs-backend-wasm 的 *.wasm (77MB+)
//   复制到 dist/ 并打包进 npm, 导致 tarball 117MB. v0.4.2 起:
//   - WASM 改为运行时从 jsDelivr CDN 加载 (modelLoader.ts 设 ort.env.wasm.wasmPaths)
//   - npm 包体积降到 ~40MB (-66%)
//   - 浏览器首次加载需多 ~25MB WASM 下载, 但 jsDelivr CDN 缓存+ HTTP/2 复用
//     用户体验更好 (npm install 快 5x, tarball 小)
//   - Node.js 不需要 WASM (onnxruntime-web 是 native binding)
const copyPatterns = []

// 如果资源文件夹存在，添加到复制列表
if (assetsExist) {
  copyPatterns.unshift({
    from: path.resolve(__dirname, "src/assets"),
    to: "assets",
    noErrorOnMissing: true,
  })
}

// 通用压缩插件配置
// 注: .gz/.br 预压缩文件原本 -1.3MB. 现代 CDN (npmjs/jsDelivr/unpkg) 自动 gzip,
//   预压缩是浪费. v0.4.2 起取消.
const compressionPlugins = []

// 主入口配置 - 非压缩版本
const mainConfig = merge(common, {
  mode: "production",
  target: "web",
  entry: "./src/index.ts",
  output: {
    filename: "index.js",
    path: path.resolve(__dirname, "dist/browser"),
    globalObject: "this",
    library: {
      name: "PaddleOCR",
      type: "umd",
      export: "default",
    },
  },
  externals: {
    canvas: "canvas",
  },
  optimization: {
    minimize: false,
  },
  plugins: [
    new CopyPlugin({
      patterns: copyPatterns,
      options: {
        concurrency: 100,
      },
    }),
  ],
})

// 主入口配置 - 压缩版本
const minConfig = merge(common, {
  mode: "production",
  target: "web",
  entry: "./src/index.ts",
  output: {
    filename: "index.min.js",
    path: path.resolve(__dirname, "dist/browser"),
    globalObject: "this",
    library: {
      name: "PaddleOCR",
      type: "umd",
      export: "default",
    },
  },
  externals: {
    canvas: "canvas",
  },
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          parse: {
            ecma: 8,
          },
          compress: {
            ecma: 5,
            warnings: false,
            comparisons: false,
            inline: 2,
            drop_console: true,
            pure_funcs: ["console.log", "console.debug"],
          },
          mangle: {
            safari10: true,
          },
          output: {
            ecma: 5,
            comments: false,
            ascii_only: true,
          },
        },
        parallel: true,
      }),
    ],
  },
  plugins: compressionPlugins,
})

// Worker配置 - 非压缩版本
const workerConfig = merge(common, {
  mode: "production",
  target: "web",
  entry: "./src/worker.ts",
  output: {
    filename: "paddle-ocr-worker.js",
    path: path.resolve(__dirname, "dist/browser"),
    globalObject: "this",
  },
  externals: {
    canvas: "canvas",
  },
  optimization: {
    minimize: false,
  },
})

// Worker配置 - 压缩版本
const minWorkerConfig = merge(common, {
  mode: "production",
  target: "web",
  entry: "./src/worker.ts",
  output: {
    filename: "paddle-ocr-worker.min.js",
    path: path.resolve(__dirname, "dist/browser"),
    globalObject: "this",
  },
  externals: {
    canvas: "canvas",
  },
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          parse: {
            ecma: 8,
          },
          compress: {
            ecma: 5,
            warnings: false,
            comparisons: false,
            inline: 2,
            drop_console: true,
          },
          mangle: true,
          output: {
            ecma: 5,
            comments: false,
          },
        },
        parallel: true,
      }),
    ],
  },
  plugins: compressionPlugins,
})

// 导出配置
module.exports = [mainConfig, minConfig, workerConfig, minWorkerConfig]
