// developer/plugins/[pluginName]/webpack.common.js
const path = require("path");
const APP = path.resolve(__dirname);
const webpack = require("webpack");

const common = {
   context: APP,
   module: {
      rules: [
         { test: /\.css$/, use: ["style-loader"] },
         { test: /\.css$/, loader: "css-loader", options: { url: false } },
         {
            test: /\.(eot|woff|woff2|svg|ttf)([?]?.*)$/,
            use: ["url-loader?limit=10000000"],
         },
         {
            test: /\.js$/,
            exclude: /node_modules/,
            use: {
               loader: "babel-loader",
               options: {
                  presets: [["@babel/preset-env", { modules: false }]],
               },
            },
         },
      ],
   },
   plugins: [
      new webpack.DefinePlugin({
         WEBPACK_MODE: JSON.stringify("production"),
         VERSION: JSON.stringify(process.env.npm_package_version),
      }),
      new webpack.ProvidePlugin({ Buffer: ["buffer", "Buffer"] }),
   ],
   resolve: {
      alias: {
         assets: path.resolve(__dirname, "..", "..", "..", "assets"),
         "axios-http": path.resolve(
            __dirname,
            "node_modules/axios/lib/adapters/http.js"
         ),
      },
      fallback: {
         process: false,
         vm: require.resolve("vm-browserify"),
         crypto: require.resolve("crypto-browserify"),
         stream: require.resolve("stream-browserify"),
         buffer: require.resolve("buffer/"),
      },
   },
};

// 1) Browser ESM bundles
const browserEsm = {
   ...common,
   name: "browserEsm",
   entry: {
      web: path.join(APP, "web.js"),
      properties: path.join(APP, "properties.js"),
   },
   output: {
      filename: "AB<%= pluginName %>_[name].mjs",
      module: true,
      iife: false,
      chunkFormat: "module",
      library: { type: "module" },
   },
   experiments: {
      outputModule: true, // allow output.module
   },
   target: ["web", "es2020"],
   // Optional: make sure webpack doesn't try to split/runtime-chunk into non-ESM:
   optimization: { runtimeChunk: false, splitChunks: false },
};

// 2) Service UMD bundle
const serviceUmd = {
   ...common,
   name: "serviceUmd",
   entry: { service: path.join(APP, "service.js") },
   output: {
      filename: "AB<%= pluginName %>_service.js",
      library: { name: "Plugin", type: "umd" },
      globalObject: "this",
      // keep default iife=true implicitly (no warning)
   },
   target: "node", // or 'node' if server-side
};

module.exports = [browserEsm, serviceUmd];
