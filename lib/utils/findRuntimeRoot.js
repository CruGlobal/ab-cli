/**
 * Find the ab_runtime root directory from a starting path.
 * Requires developer/ab_platform_web and developer/plugins.
 *
 * @param {string} [startPath]
 * @returns {string|null}
 */
var path = require("path");
var fs = require("fs");
var dirLooksLikeRoot = require(path.join(__dirname, "dirLooksLikeRoot"));

module.exports = function findRuntimeRoot(startPath) {
   var currentDir = startPath || process.cwd();
   var maxDepth = 20;
   var depth = 0;
   var rootDir = null;

   while (depth < maxDepth) {
      if (dirLooksLikeRoot(currentDir)) {
         rootDir = currentDir;
         break;
      }
      var parentDir = path.dirname(currentDir);
      if (parentDir === currentDir) {
         break;
      }
      currentDir = parentDir;
      depth++;
   }

   if (!rootDir) {
      return null;
   }

   var abPlatformWeb = path.join(rootDir, "developer", "ab_platform_web");
   var pluginsDir = path.join(rootDir, "developer", "plugins");

   if (
      fs.existsSync(abPlatformWeb) &&
      fs.existsSync(pluginsDir) &&
      fs.statSync(abPlatformWeb).isDirectory() &&
      fs.statSync(pluginsDir).isDirectory()
   ) {
      return rootDir;
   }

   return null;
};

module.exports.paths = function paths(rootDir) {
   return {
      includedDir: path.join(
         rootDir,
         "developer",
         "ab_platform_web",
         "AppBuilder",
         "platform",
         "plugins",
         "included"
      ),
      includedIndex: path.join(
         rootDir,
         "developer",
         "ab_platform_web",
         "AppBuilder",
         "platform",
         "plugins",
         "included",
         "index.js"
      ),
      pluginsDir: path.join(rootDir, "developer", "plugins"),
      designerPluginsDir: path.join(
         rootDir,
         "developer",
         "plugins",
         "ABDesigner",
         "src",
         "plugins"
      ),
      designerIndex: path.join(
         rootDir,
         "developer",
         "plugins",
         "ABDesigner",
         "src",
         "plugins",
         "index.js"
      ),
   };
};
