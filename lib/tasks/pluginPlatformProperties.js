//
// pluginPlatformProperties
// add properties code to an existing plugin
//
// options:
//
//
var fs = require("fs");
var path = require("path");
var shell = require("shelljs");
var utils = require(path.join(__dirname, "..", "utils", "utils"));
var generator = require(path.join(__dirname, "pluginPlatformGenerator"));

var Options = {}; // the running options for this command.

//
// Build the PluginPlatformProperties Command
//
var Command = new utils.Resource({
   command: "pluginPlatformProperties",
   params: "",
   descriptionShort:
      "add properties code to an existing plugin (updated architecture).",
   descriptionLong: `
`,
});

module.exports = Command;

Command.help = function () {
   console.log(`

  usage: $ appbuilder plugin platform-properties [pluginName] [objectName] [options]

  add properties code to an existing plugin in developer/plugins/

  Options:
    [pluginName] the name of the plugin to add properties to (will prompt if not provided).
    [objectName] the object name for the properties (e.g., "ObjectNetsuite" creates FNObjectNetsuite.js). Defaults to pluginName if omitted.

`);
};

Command.run = async function (options) {
   // copy our passed in options to our Options
   for (var o in options) {
      Options[o] = options[o];
   }

   Options.pluginName = Options._.shift();
   Options.objectName = Options._.shift();
   // Properties always has type = "properties"
   Options.type = "properties";

   await generator.checkDependencies();
   await generator.findPluginDirectory(Options, "properties");
   await generator.questions(Options, "properties");
   await copyTemplateFiles();
   await updateWebpackConfig();
   await updateManifest();
};

/**
 * @function copyTemplateFiles
 * copy our template files into the plugin directory
 * @returns {Promise}
 */
function copyTemplateFiles() {
   return new Promise((resolve, reject) => {
      var propertiesJsPath = path.join(Options.pluginDir, "properties.js");
      var propertiesJsExists = fs.existsSync(propertiesJsPath);

      // Change into the plugin directory
      shell.pushd("-q", Options.pluginDir);

      // Use fileCopyTemplates to copy template files
      // This will copy properties/FN[objectNamePascal].js and create properties.js if it doesn't exist
      utils.fileCopyTemplates(
         "pluginPlatformProperties",
         Options,
         [],
         (err) => {
            if (err) {
               shell.popd("-q");
               reject(err);
               return;
            }

            // Handle properties.js - update if exists, create if not
            if (propertiesJsExists) {
               generator
                  .updatePlatformJs(propertiesJsPath, Options, "properties")
                  .then(() => {
                     shell.popd("-q");
                     resolve();
                  })
                  .catch((err) => {
                     shell.popd("-q");
                     reject(err);
                  });
            } else {
               // properties.js was created by fileCopyTemplates, but we need to verify it
               if (fs.existsSync(propertiesJsPath)) {
                  console.log("... created: properties.js");
               }
               shell.popd("-q");
               resolve();
            }
         }
      );
   });
}

/**
 * @function updateWebpackConfig
 * Check webpack.common.js for browserEsm entry with properties.js, ensure it exists
 * @returns {Promise}
 */
function updateWebpackConfig() {
   return new Promise((resolve, reject) => {
      var webpackPath = path.join(Options.pluginDir, "webpack.common.js");

      if (!fs.existsSync(webpackPath)) {
         reject(
            new Error(
               `webpack.common.js not found in plugin directory: ${Options.pluginDir}`
            )
         );
         return;
      }

      var contents = fs.readFileSync(webpackPath, "utf8");

      // Check if browserEsm entry already has properties.js
      var hasPropertiesEntry =
         /entry:\s*\{[^}]*properties:\s*path\.join\(APP,\s*["']properties\.js["']\)/i.test(
            contents
         );

      if (hasPropertiesEntry) {
         console.log("... webpack.common.js already has properties.js entry");
         resolve();
         return;
      }

      // Check if browserEsm exists
      var hasBrowserEsm = /const\s+browserEsm\s*=/i.test(contents);

      if (!hasBrowserEsm) {
         console.log(
            "... webpack.common.js does not have browserEsm entry. It should be added when creating the plugin."
         );
         resolve();
         return;
      }

      // Add properties.js to browserEsm entry
      // Look for: entry: { web: ..., properties: ... }
      var entryPattern =
         /(entry:\s*\{[^}]*)(web:\s*path\.join\(APP,\s*["']web\.js["']\))/i;
      if (entryPattern.test(contents)) {
         // Insert properties entry after web
         contents = contents.replace(
            entryPattern,
            `$1$2,\n      properties: path.join(APP, "properties.js")`
         );
         fs.writeFileSync(webpackPath, contents);
         console.log("... updated webpack.common.js with properties.js entry");
      } else {
         // Try to find entry object and add properties
         var simpleEntryPattern = /(entry:\s*\{)/i;
         if (simpleEntryPattern.test(contents)) {
            contents = contents.replace(
               simpleEntryPattern,
               `$1\n      properties: path.join(APP, "properties.js"),`
            );
            fs.writeFileSync(webpackPath, contents);
            console.log(
               "... updated webpack.common.js with properties.js entry"
            );
         }
      }

      resolve();
   });
}

/**
 * @function updateManifest
 * Update manifest.json to add properties entry to .plugins array
 * @returns {Promise}
 */
function updateManifest() {
   // Uniqueness check: only one properties entry (platform:web, type:properties) per plugin
   var uniquenessCheck = function (plugins) {
      return plugins.some(
         (p) => p.platform === "web" && p.type === "properties"
      );
   };

   var platformPath = `./AB${Options.pluginName}_properties.mjs`;
   return generator.updateManifest(
      Options,
      "web",
      platformPath,
      uniquenessCheck
   );
}
