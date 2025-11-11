//
// pluginPlatformWeb
// add web code to an existing plugin
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
// Build the PluginPlatformWeb Command
//
var Command = new utils.Resource({
   command: "pluginPlatformWeb",
   params: "",
   descriptionShort:
      "add web code to an existing plugin (updated architecture).",
   descriptionLong: `
`,
});

module.exports = Command;

Command.help = function () {
   console.log(`

  usage: $ appbuilder plugin platform-web [pluginName] [type] [objectName] [options]

  add web code to an existing plugin in developer/plugins/

  Options:
    [pluginName] the name of the plugin to add web code to (will prompt if not provided).
    [type] the type of the web entry (e.g., "object", "model", etc.).
    [objectName] the object name for the web (e.g., "ObjectNetsuite" creates FNObjectNetsuite.js). Defaults to pluginName if omitted.

`);
};

Command.run = async function (options) {
   // copy our passed in options to our Options
   for (var o in options) {
      Options[o] = options[o];
   }

   Options.pluginName = Options._.shift();
   Options.type = Options._.shift();
   Options.objectName = Options._.shift();

   await generator.checkDependencies();
   await generator.findPluginDirectory(Options, "web");
   await generator.questions(Options, "web");
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
      var webJsPath = path.join(Options.pluginDir, "web.js");
      var webJsExists = fs.existsSync(webJsPath);

      // Change into the plugin directory
      shell.pushd("-q", Options.pluginDir);

      // Use fileCopyTemplates to copy template files (will skip web.js if it exists)
      // This will copy web/FN[objectNamePascal].js and create web.js if it doesn't exist
      utils.fileCopyTemplates("pluginPlatformWeb", Options, [], (err) => {
         if (err) {
            shell.popd("-q");
            reject(err);
            return;
         }

         // Handle web.js - update if exists, create if not
         if (webJsExists) {
            generator
               .updatePlatformJs(webJsPath, Options, "web")
               .then(() => {
                  shell.popd("-q");
                  resolve();
               })
               .catch((err) => {
                  shell.popd("-q");
                  reject(err);
               });
         } else {
            // web.js was created by fileCopyTemplates, but we need to verify it
            if (fs.existsSync(webJsPath)) {
               console.log("... created: web.js");
            }
            shell.popd("-q");
            resolve();
         }
      });
   });
}

/**
 * @function updateWebpackConfig
 * Check webpack.common.js for browserEsm entry with web.js, ensure it exists
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

      // Check if browserEsm entry already has web.js
      var hasWebEntry =
         /entry:\s*\{[^}]*web:\s*path\.join\(APP,\s*["']web\.js["']\)/i.test(
            contents
         );

      if (hasWebEntry) {
         console.log("... webpack.common.js already has web.js entry");
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

      // Add web.js to browserEsm entry
      // Look for: entry: { web: ..., properties: ... }
      var entryPattern =
         /(entry:\s*\{[^}]*)(properties:\s*path\.join\(APP,\s*["']properties\.js["']\))/i;
      if (entryPattern.test(contents)) {
         // Insert web entry before properties
         contents = contents.replace(
            entryPattern,
            `$1web: path.join(APP, "web.js"),\n      $2`
         );
         fs.writeFileSync(webpackPath, contents);
         console.log("... updated webpack.common.js with web.js entry");
      } else {
         // Try to find entry object and add web
         var simpleEntryPattern = /(entry:\s*\{)/i;
         if (simpleEntryPattern.test(contents)) {
            contents = contents.replace(
               simpleEntryPattern,
               `$1\n      web: path.join(APP, "web.js"),`
            );
            fs.writeFileSync(webpackPath, contents);
            console.log("... updated webpack.common.js with web.js entry");
         }
      }

      resolve();
   });
}

/**
 * @function updateManifest
 * Update manifest.json to add web entry to .plugins array
 * @returns {Promise}
 */
function updateManifest() {
   // Uniqueness check: web entry with same platform and type already exists
   // For web platform, there can be 2 entries: one with type != "properties" and one with type == "properties"
   var uniquenessCheck = function (plugins) {
      var typeValue = Options.type || "object";
      return plugins.some((p) => p.platform === "web" && p.type === typeValue);
   };

   var platformPath = `./${Options.pluginName}_web.mjs`;
   return generator.updateManifest(
      Options,
      "web",
      platformPath,
      uniquenessCheck
   );
}
