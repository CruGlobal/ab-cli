const path = require("path");
const APP = path.resolve(__dirname);
const { merge } = require("webpack-merge");
const commons = require("./webpack.common.js"); // exports [browserEsm, serviceUmd]

// todo: move this to a /dist folder in the plugin root
const outPath = path.join(
   APP,
   "..",
   "..",
   "web",
   "assets",
   "ab_plugins",
   "ab-<%= pluginName.toLowerCase() %>"
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
