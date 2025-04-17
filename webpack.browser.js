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
const copyPatterns = [
  {
    from: "node_modules/onnxruntime-web/dist/*.wasm",
    to: "[name][ext]",
  },
  {
    from: "node_modules/@tensorflow/tfjs-backend-wasm/dist/*.wasm",
    to: "[name][ext]",
  },
]

// 如果资源文件夹存在，添加到复制列表
if (assetsExist) {
  copyPatterns.unshift({
    from: path.resolve(__dirname, "src/assets"),
    to: "assets",
    noErrorOnMissing: true,
  })
}

// 通用压缩插件配置
const compressionPlugins = [
  new CompressionPlugin({
    test: /\.(js|css|html|svg|wasm)$/,
    algorithm: "gzip",
    threshold: 10240,
    minRatio: 0.8,
  }),
  new CompressionPlugin({
    test: /\.(js|css|html|svg|wasm)$/,
    algorithm: "brotliCompress",
    filename: "[path][base].br",
    threshold: 10240,
    minRatio: 0.8,
  }),
]

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
