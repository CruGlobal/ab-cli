/**
 * @function pluginDirectoryName
 * Convert a plugin name to the standard directory name format: ab_plugin_<snake_case>
 * This ensures consistent directory naming across all plugin-related commands.
 *
 * Examples:
 *   "Netsuite API" -> "ab_plugin_netsuite_api"
 *   "NetsuiteAPI" -> "ab_plugin_netsuite_api"
 *   "My Plugin" -> "ab_plugin_my_plugin"
 *
 * @param {string} pluginName - The plugin name to convert
 * @return {string} The directory name in format ab_plugin_<snake_case>
 */
module.exports = function (pluginName) {
   if (!pluginName || typeof pluginName !== "string") {
      return "";
   }

   // Remove spaces
   var nameNoSpaces = pluginName.replaceAll(" ", "");

   // Convert camelCase to snake_case
   // Insert underscore before capital letters that follow lowercase or other capitals
   var snakeCase = nameNoSpaces
      .replace(/([a-z])([A-Z])/g, "$1_$2") // lowercase followed by uppercase
      .replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2") // sequence of capitals followed by capital+lowercase
      .toLowerCase() // Convert to lowercase
      .replace(/[^a-z0-9]/g, "_") // Replace any remaining non-alphanumeric with underscore
      .replace(/_+/g, "_") // Replace multiple underscores with single underscore
      .replace(/^_|_$/g, ""); // Remove leading/trailing underscores

   return `ab_plugin_${snakeCase}`;
};
