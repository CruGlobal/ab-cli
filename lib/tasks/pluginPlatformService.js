//
// pluginPlatformService
// add service code to an existing plugin
//
// options:
//
//
var fs = require("fs");
var path = require("path");
var shell = require("shelljs");
var utils = require(path.join(__dirname, "..", "utils", "utils"));
var fileRender = require(path.join(__dirname, "..", "utils", "fileRender"));
var fileTemplatePath = require(path.join(
   __dirname,
   "..",
   "utils",
   "fileTemplatePath"
));
var generator = require(path.join(__dirname, "pluginPlatformGenerator"));

var Options = {}; // the running options for this command.

//
// Build the PluginPlatformService Command
//
var Command = new utils.Resource({
   command: "pluginPlatformService",
   params: "",
   descriptionShort:
      "add service code to an existing plugin (updated architecture).",
   descriptionLong: `
`,
});

module.exports = Command;

Command.help = function () {
   console.log(`

  usage: $ appbuilder plugin platform-service [pluginName] [type] [objectName] [options]

  add service code to an existing plugin in developer/plugins/

  Options:
    [pluginName] the name of the plugin to add service to (will prompt if not provided).
    [type] the type of the service entry (e.g., "object", "model", etc.).
    [objectName] the object name for the service (e.g., "ObjectNetsuite" creates FNObjectNetsuite.js). Defaults to pluginName if omitted.

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
   await generator.findPluginDirectory(Options, "service");
   await generator.questions(Options, "service");
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
      var serviceJsPath = path.join(Options.pluginDir, "service.js");
      var serviceJsExists = fs.existsSync(serviceJsPath);

      // Change into the plugin directory
      shell.pushd("-q", Options.pluginDir);

      // Use fileCopyTemplates to copy template files (will skip service.js if it exists)
      // This will copy service/FN[objectNamePascal].js and create service.js if it doesn't exist
      utils.fileCopyTemplates("pluginPlatformService", Options, [], (err) => {
         if (err) {
            shell.popd("-q");
            reject(err);
            return;
         }

         // Handle service.js - update if exists, create if not
         if (serviceJsExists) {
            generator
               .updatePlatformJs(serviceJsPath, Options, "service")
               .then(() => {
                  shell.popd("-q");
                  resolve();
               })
               .catch((err) => {
                  shell.popd("-q");
                  reject(err);
               });
         } else {
            // service.js was created by fileCopyTemplates, but we need to verify it
            if (fs.existsSync(serviceJsPath)) {
               console.log("... created: service.js");
            }
            shell.popd("-q");
            resolve();
         }
      });
   });
}

/**
 * @function updateWebpackConfig
 * Check webpack.common.js for serviceUmd entry, add if missing
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

      // Check if serviceUmd is already defined and exported
      var hasServiceUmdDef = /const\s+serviceUmd\s*=/i.test(contents);
      var hasServiceUmdInExports = /module\.exports.*serviceUmd/i.test(
         contents
      );

      if (hasServiceUmdDef && hasServiceUmdInExports) {
         console.log("... webpack.common.js already has serviceUmd entry");
         resolve();
         return;
      }

      // Read the template for serviceUmd entry
      var templatePath = path.join(
         fileTemplatePath(),
         "_pluginService_serviceUmd.js"
      );

      if (!fs.existsSync(templatePath)) {
         reject(new Error(`Template file not found: ${templatePath}`));
         return;
      }

      var serviceUmdCode = fileRender(templatePath, Options);
      var modified = false;

      // If serviceUmd is not defined, add it before module.exports
      if (!hasServiceUmdDef) {
         // Find where to insert - look for module.exports = [
         var insertPattern = /(module\.exports\s*=\s*\[)/;
         if (insertPattern.test(contents)) {
            // Insert serviceUmd definition before module.exports
            contents = contents.replace(
               insertPattern,
               serviceUmdCode + "\n\n$1"
            );
            modified = true;
         } else {
            // If no array export found, try to find just module.exports
            var simplePattern = /(module\.exports\s*=)/;
            if (simplePattern.test(contents)) {
               contents = contents.replace(
                  simplePattern,
                  serviceUmdCode + "\n\n$1"
               );
               modified = true;
            } else {
               // Append at the end
               contents = contents + "\n\n" + serviceUmdCode;
               modified = true;
            }
         }
      }

      // If serviceUmd is defined but not in exports, or if we just added it, add it to the exports array
      if (!hasServiceUmdInExports) {
         // Find module.exports = [browserEsm] or similar and add serviceUmd
         var exportsPattern = /module\.exports\s*=\s*\[([^\]]+)\]/;
         if (exportsPattern.test(contents)) {
            var match = contents.match(exportsPattern);
            var currentExports = match[1].trim();
            // Check if serviceUmd is already in the exports (shouldn't be, but just in case)
            if (currentExports.indexOf("serviceUmd") === -1) {
               var newExports = currentExports + ", serviceUmd";
               contents = contents.replace(
                  exportsPattern,
                  `module.exports = [${newExports}]`
               );
               modified = true;
            }
         }
      }

      if (modified) {
         fs.writeFileSync(webpackPath, contents);
         console.log("... updated webpack.common.js with serviceUmd entry");
      }
      resolve();
   });
}

/**
 * @function updateManifest
 * Update manifest.json to add service entry to .plugins array
 * @returns {Promise}
 */
function updateManifest() {
   // Uniqueness check: only one service entry per plugin
   var uniquenessCheck = function (plugins) {
      return plugins.some((p) => p.platform === "service");
   };

   var platformPath = `./AB${Options.pluginName}_service.js`;
   return generator.updateManifest(
      Options,
      "service",
      platformPath,
      uniquenessCheck
   );
}
