const { merge } = require("webpack-merge")
const path = require("path")
const common = require("./webpack.common.js")

module.exports = merge(common, {
  mode: "development",
  devtool: "inline-source-map",
  target: "web",
  entry: "./src/index.ts",
  output: {
    filename: "index.js",
    path: path.resolve(__dirname, "dist/dev"),
    library: {
      name: "PaddleOCR",
      type: "umd",
      export: "default",
    },
    globalObject: "this",
  },
})
