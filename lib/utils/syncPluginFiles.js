/**
 * Incrementally sync .js files from srcDir to destDir.
 */
var fs = require("fs");
var path = require("path");

function syncDir(srcDir, destDir) {
   var stats = { added: 0, updated: 0, unchanged: 0, files: [] };

   if (!fs.existsSync(srcDir)) {
      return stats;
   }

   syncDirRecursive(srcDir, destDir, stats);
   return stats;
}

function syncDirRecursive(srcDir, destDir, stats) {
   fs.mkdirSync(destDir, { recursive: true });

   var entries = fs.readdirSync(srcDir, { withFileTypes: true });
   for (var i = 0; i < entries.length; i++) {
      var entry = entries[i];
      var srcPath = path.join(srcDir, entry.name);
      var destPath = path.join(destDir, entry.name);

      if (entry.isDirectory()) {
         syncDirRecursive(srcPath, destPath, stats);
         continue;
      }

      if (!entry.isFile() || !entry.name.endsWith(".js")) {
         continue;
      }

      stats.files.push(path.relative(srcDir, srcPath));

      if (!fs.existsSync(destPath)) {
         fs.copyFileSync(srcPath, destPath);
         stats.added++;
         continue;
      }

      var srcContent = fs.readFileSync(srcPath, "utf8");
      var destContent = fs.readFileSync(destPath, "utf8");
      var srcMtime = fs.statSync(srcPath).mtimeMs;
      var destMtime = fs.statSync(destPath).mtimeMs;

      if (srcContent !== destContent || srcMtime > destMtime) {
         fs.copyFileSync(srcPath, destPath);
         stats.updated++;
      } else {
         stats.unchanged++;
      }
   }
}

module.exports = syncDir;
module.exports.syncDir = syncDir;

var SHARED_VIEW_DIRS = ["view_core"];

module.exports.isSharedViewDir = function isSharedViewDir(name) {
   return SHARED_VIEW_DIRS.indexOf(name) !== -1;
};

/**
 * Shared included dirs (e.g. view_core) synced for imports but not registered
 * as standalone views in web.js / properties.js.
 *
 * @param {string} includedDir
 * @returns {string[]}
 */
module.exports.discoverSharedViewDirs = function discoverSharedViewDirs(
   includedDir
) {
   if (!fs.existsSync(includedDir)) {
      return [];
   }

   return SHARED_VIEW_DIRS.filter(function (name) {
      return fs.existsSync(path.join(includedDir, name));
   }).sort();
};

/**
 * List view_* directories under included.
 *
 * @param {string} includedDir
 * @param {string[]|null} filter
 * @returns {string[]}
 */
module.exports.discoverViewDirs = function discoverViewDirs(
   includedDir,
   filter
) {
   if (!fs.existsSync(includedDir)) {
      return [];
   }

   var viewDirs = fs
      .readdirSync(includedDir)
      .filter(function (name) {
         var full = path.join(includedDir, name);
         return (
            name.indexOf("view_") === 0 &&
            !module.exports.isSharedViewDir(name) &&
            fs.statSync(full).isDirectory()
         );
      })
      .sort();

   if (filter && filter.length) {
      var filterSet = {};
      for (var f = 0; f < filter.length; f++) {
         filterSet[filter[f]] = true;
      }
      viewDirs = viewDirs.filter(function (name) {
         return filterSet[name];
      });
   }

   return viewDirs;
};

/**
 * Production output slug under developer/web/assets/ab_plugins/
 * e.g. ab_plugin_tab_test -> ab-tabtest
 *
 * @param {string} pluginDirName
 * @returns {string}
 */
module.exports.pluginProdSlug = function pluginProdSlug(pluginDirName) {
   var base = pluginDirName.replace(/^ab_plugin_/, "").replace(/_/g, "");
   return "ab-" + base;
};
