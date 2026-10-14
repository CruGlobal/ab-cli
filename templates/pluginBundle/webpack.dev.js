const path = require("path");
const APP = path.resolve(__dirname);
const { merge } = require("webpack-merge");
const commons = require("./webpack.common.js");

const outPath = path.join(APP, "dist");

let configs = null;
let myChanges = {
   output: {
      path: outPath,
   },
   mode: "development",
   devtool: "source-map",
};

if (Array.isArray(commons)) {
   configs = commons.map((cfg) => merge(cfg, myChanges));
} else {
   configs = merge(commons, myChanges);
}
module.exports = configs;
