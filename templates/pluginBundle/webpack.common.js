// developer/plugins/<pluginDir>/webpack.common.js
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
         crypto: false,
         stream: require.resolve("stream-browserify"),
         buffer: require.resolve("buffer/"),
      },
   },
};

const browserEntry = {
   web: path.join(APP, "web.js"),
};
<% if (hasProperties) { %>
browserEntry.properties = path.join(APP, "properties.js");
<% } %>

const browserEsm = {
   ...common,
   name: "browserEsm",
   entry: browserEntry,
   output: {
      filename: "<%= bundleOutputPrefix %>_[name].mjs",
      module: true,
      iife: false,
      chunkFormat: "module",
      library: { type: "module" },
   },
   experiments: {
      outputModule: true,
   },
   target: ["web", "es2020"],
   optimization: { runtimeChunk: false, splitChunks: false },
};

module.exports = [browserEsm];
