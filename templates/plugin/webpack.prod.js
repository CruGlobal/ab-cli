const path = require("path");
const APP = path.resolve(__dirname);
const { merge } = require("webpack-merge");
const commons = require("./webpack.common.js"); // exports [browserEsm, serviceUmd]

const outPath = path.join(
   APP,
   "dist"
);

module.exports = commons.map((cfg) =>
   merge(cfg, {
      output: {
         path: outPath,
         // filenames come from each per-entry config in webpack.common.js
      },
      mode: "production",
      devtool: false,
      optimization: {
         minimize: true,
      },
      performance: {
         hints: false,
      },
   })
);
