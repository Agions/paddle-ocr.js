const { merge } = require("webpack-merge")
const path = require("path")
const common = require("./webpack.common.js")
const TerserPlugin = require("terser-webpack-plugin")

module.exports = merge(common, {
  mode: "production",
  target: "node",
  entry: "./src/index.ts",
  output: {
    filename: "index.js",
    path: path.resolve(__dirname, "dist/node"),
    library: {
      type: "commonjs2",
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
  externals: {
    canvas: "commonjs canvas",
    "@tensorflow/tfjs-node": "commonjs @tensorflow/tfjs-node",
    "@tensorflow/tfjs-node-gpu": "commonjs @tensorflow/tfjs-node-gpu",
    "onnxruntime-node": "commonjs onnxruntime-node",
  },
  resolve: {
    fallback: {
      fs: false,
      path: require.resolve("path-browserify"),
      stream: require.resolve("stream-browserify"),
      buffer: require.resolve("buffer/"),
      util: require.resolve("util/"),
    },
  },
})
