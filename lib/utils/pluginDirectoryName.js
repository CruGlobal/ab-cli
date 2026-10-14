/**
 * @function pluginDirectoryName
 * Convert a plugin name to the standard directory name format: ab_plugin_<snake_case>
 *
 * @param {string} pluginName
 * @return {string}
 */
function pluginDirectoryName(pluginName) {
   if (!pluginName || typeof pluginName !== "string") {
      return "";
   }

   var snakeCase = toSnakeCase(pluginName);
   return `ab_plugin_${snakeCase}`;
}

/**
 * @param {string} input
 * @return {string}
 */
function toSnakeCase(input) {
   var nameNoSpaces = input.replaceAll(" ", "");
   return nameNoSpaces
      .replace(/([a-z])([A-Z])/g, "$1_$2")
      .replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "");
}

/**
 * Directory name for plugin bundle — avoids double ab_plugin_ prefix.
 *
 * @param {string} input
 * @return {string}
 */
function resolveBundlePluginDirName(input) {
   if (!input || typeof input !== "string") {
      return "";
   }

   var trimmed = input.trim();
   var asDir = trimmed.toLowerCase().replace(/\s+/g, "_");

   if (/^ab_plugin_[a-z0-9_]+$/.test(asDir)) {
      return asDir;
   }

   var abPluginsMatch = trimmed.match(/^ab\s+plugins\s+(.+)$/i);
   if (abPluginsMatch) {
      return `ab_plugin_${toSnakeCase(abPluginsMatch[1])}`;
   }

   return pluginDirectoryName(trimmed);
}

/**
 * PascalCase each word segment (spaces, underscores, hyphens).
 *
 * @param {string} name
 * @return {string}
 */
function toPluginNamePascal(name) {
   if (!name || typeof name !== "string") {
      return "";
   }

   var parts = name.split(/[\s_-]+/).filter(function (p) {
      return p.length > 0;
   });

   for (var i = 0; i < parts.length; i++) {
      parts[i] =
         parts[i].charAt(0).toUpperCase() + parts[i].slice(1).toLowerCase();
   }

   return parts.join("");
}

/**
 * Webpack/manifest filename prefix — single leading AB.
 *
 * @param {string} pluginName - PascalCase plugin name
 * @return {string}
 */
function bundleOutputPrefix(pluginName) {
   if (!pluginName) {
      return "AB";
   }

   if (/^AB/.test(pluginName)) {
      return pluginName;
   }

   if (/^Ab/.test(pluginName)) {
      return "AB" + pluginName.slice(2);
   }

   if (/^ab/.test(pluginName)) {
      return "AB" + pluginName.slice(2);
   }

   return "AB" + pluginName;
}

module.exports = pluginDirectoryName;
module.exports.resolveBundlePluginDirName = resolveBundlePluginDirName;
module.exports.toPluginNamePascal = toPluginNamePascal;
module.exports.bundleOutputPrefix = bundleOutputPrefix;
module.exports.toSnakeCase = toSnakeCase;
