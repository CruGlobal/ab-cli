//
// pluginPlatformGenerator
// Shared code for pluginPlatformService and pluginPlatformWeb
//
var fs = require("fs");
var inquirer = require("inquirer");
var path = require("path");
var shell = require("shelljs");
var utils = require(path.join(__dirname, "..", "utils", "utils"));

/**
 * @function checkDependencies
 * verify the system has any required dependencies for generating plugins.
 * @returns {Promise}
 */
function checkDependencies() {
   return new Promise((resolve, reject) => {
      utils.checkDependencies([], (err) => {
         if (err) {
            reject(err);
         } else {
            resolve();
         }
      });
   });
}

/**
 * @function findPluginDirectory
 * find the plugin directory based on the plugin name, or let user choose
 * @param {object} Options - the options object containing pluginName
 * @param {string} platformName - name of platform for user messages (e.g., "service", "web")
 * @returns {Promise}
 */
function findPluginDirectory(Options, platformName) {
   return new Promise((resolve, reject) => {
      var pluginsDir = path.join(process.cwd(), "developer", "plugins");

      if (!fs.existsSync(pluginsDir)) {
         reject(
            new Error(
               `Directory developer/plugins/ does not exist. Please create a plugin first.`
            )
         );
         return;
      }

      // If pluginName is provided, try to find it
      if (Options.pluginName) {
         var pluginDirectoryName = require(path.join(
            __dirname,
            "..",
            "utils",
            "pluginDirectoryName"
         ));

         // Try to find plugin directory - could be exact match or ab_plugin_* format
         var expectedDirName = pluginDirectoryName(Options.pluginName);
         var possibleDirs = [
            Options.pluginName,
            expectedDirName,
            // Also try lowercase version for backwards compatibility
            Options.pluginName.toLowerCase().replace(/[^a-z0-9]/g, "_"),
         ];
         var foundDir = null;
         var pluginFiles = fs.readdirSync(pluginsDir);
         for (var pf in pluginFiles) {
            var pluginFilePath = path.join(pluginsDir, pluginFiles[pf]);
            if (fs.statSync(pluginFilePath).isDirectory()) {
               if (
                  pluginFiles[pf] === Options.pluginName ||
                  pluginFiles[pf].toLowerCase() ===
                     Options.pluginName.toLowerCase() ||
                  possibleDirs.indexOf(pluginFiles[pf]) !== -1
               ) {
                  foundDir = pluginFiles[pf];
                  break;
               }
            }
         }

         if (!foundDir) {
            reject(
               new Error(
                  `Plugin directory not found for "${Options.pluginName}". Please check the plugin name.`
               )
            );
            return;
         }

         Options.pluginDir = path.join(pluginsDir, foundDir);
         Options.pluginDirName = foundDir;
         console.log(
            `... found plugin directory: developer/plugins/${foundDir}`
         );
         resolve();
      } else {
         // Scan plugins directory and let user choose
         var files = fs.readdirSync(pluginsDir);
         var pluginDirs = [];
         for (var f in files) {
            var filePath = path.join(pluginsDir, files[f]);
            if (fs.statSync(filePath).isDirectory()) {
               // Try to get plugin name from manifest
               var manifestPath = path.join(filePath, "manifest.json");
               var displayName = files[f];
               if (fs.existsSync(manifestPath)) {
                  try {
                     var manifest = JSON.parse(
                        fs.readFileSync(manifestPath, "utf8")
                     );
                     if (manifest.name) {
                        displayName = `${manifest.name} (${files[f]})`;
                     }
                  } catch (e) {
                     // Ignore manifest parsing errors
                  }
               }
               pluginDirs.push({
                  name: displayName,
                  value: files[f],
               });
            }
         }

         if (pluginDirs.length === 0) {
            reject(
               new Error(
                  `No plugins found in developer/plugins/. Please create a plugin first.`
               )
            );
            return;
         }

         inquirer
            .prompt([
               {
                  name: "selectedPlugin",
                  type: "list",
                  message: `Select the plugin to add ${platformName} code to:`,
                  choices: pluginDirs,
               },
            ])
            .then((answers) => {
               Options.pluginDir = path.join(
                  pluginsDir,
                  answers.selectedPlugin
               );
               Options.pluginDirName = answers.selectedPlugin;
               console.log(
                  `... selected plugin: developer/plugins/${answers.selectedPlugin}`
               );
               resolve();
            })
            .catch(reject);
      }
   });
}

/**
 * @function questions
 * Present the user with a list of configuration questions.
 * @param {object} Options - the options object
 * @param {string} platformName - name of platform for user messages (e.g., "service", "web")
 * @returns {Promise}
 */
function questions(Options, platformName) {
   return new Promise((resolve, reject) => {
      // Helper function to process object name
      function processObjectName() {
         // Ensure objectName is PascalCase
         var objectNameNoSpaces = Options.objectName.replaceAll(" ", "");
         var objectParts = objectNameNoSpaces.split(/[_-]/);
         for (var p = 0; p < objectParts.length; p++) {
            objectParts[p] =
               objectParts[p].charAt(0).toUpperCase() +
               objectParts[p].slice(1).toLowerCase();
         }
         Options.objectNamePascal = objectParts.join("");

         // Create FN[ObjectName] format
         Options.fnObjectName = "FN" + Options.objectNamePascal;

         // Generate plugin key: "ab-object-[objectname-lowercase-with-hyphens]"
         // Convert PascalCase to kebab-case: "ObjectNetsuiteAPI" -> "object-netsuite-api"
         var pluginKey = Options.objectNamePascal
            .replace(/([a-z])([A-Z])/g, "$1-$2") // lowercase followed by uppercase
            .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2") // sequence of capitals followed by capital+lowercase
            .toLowerCase() // Convert to lowercase
            .replace(/[^a-z0-9-]/g, "-") // Replace non-alphanumeric (except hyphens) with hyphen
            .replace(/-+/g, "-") // Replace multiple hyphens with single hyphen
            .replace(/^-|-$/g, ""); // Remove leading/trailing hyphens
         Options.pluginKey = `ab-object-${pluginKey}`;
      }

      // Load plugin manifest to get pluginName
      var manifestPath = path.join(Options.pluginDir, "manifest.json");
      if (fs.existsSync(manifestPath)) {
         try {
            var manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
            // Extract pluginName from manifest or directory name
            Options.pluginName =
               manifest.name ||
               Options.pluginDirName.replace(/^ab_plugin_/, "");
         } catch (e) {
            // If manifest parsing fails, use directory name
            Options.pluginName = Options.pluginDirName.replace(
               /^ab_plugin_/,
               ""
            );
         }
      } else {
         Options.pluginName = Options.pluginDirName.replace(/^ab_plugin_/, "");
      }

      // Default objectName to pluginName if not provided
      if (!Options.objectName) {
         Options.objectName = Options.pluginName;
      }

      // Handle type and objectName - prompt if not provided
      var prompts = [];
      if (!Options.type) {
         prompts.push({
            name: "type",
            type: "input",
            message: `Enter the type for the ${platformName} (e.g., 'object', 'model'):`,
            default: "object",
            validate: (input) => {
               if (!input || input.trim() === "") {
                  return "Type is required";
               }
               return true;
            },
         });
      }
      // Only prompt for objectName if it wasn't provided (still equals pluginName)
      // This allows user to override the default
      if (Options.objectName === Options.pluginName) {
         prompts.push({
            name: "objectName",
            type: "input",
            message: `Enter the object name for the ${platformName} (e.g., 'ObjectNetsuite'):`,
            default: Options.pluginName,
            validate: (input) => {
               if (!input || input.trim() === "") {
                  return "Object name is required";
               }
               return true;
            },
         });
      }

      if (prompts.length > 0) {
         inquirer
            .prompt(prompts)
            .then((answers) => {
               if (answers.type) Options.type = answers.type;
               if (answers.objectName) Options.objectName = answers.objectName;
               if (Options.objectName) processObjectName();
               resolve();
            })
            .catch(reject);
      } else {
         if (Options.objectName) processObjectName();
         resolve();
      }
   });
}

/**
 * @function updatePlatformJs
 * Update existing platform.js (service.js or web.js) to add new import and array entry
 * @param {string} platformJsPath path to platform.js file
 * @param {object} Options - the options object
 * @param {string} subDir - subdirectory name ("service", "web" or "properties")
 * @returns {Promise}
 */
function updatePlatformJs(platformJsPath, Options, subDir) {
   return new Promise((resolve, reject) => {
      try {
         var contents = fs.readFileSync(platformJsPath, "utf8");

         // Check if this fnObjectName is already imported
         var importPattern = new RegExp(
            `import\\s+${Options.fnObjectName}\\s+from\\s+["'].*${Options.fnObjectName}["']`,
            "i"
         );
         if (importPattern.test(contents)) {
            console.log(
               `... ${Options.fnObjectName} already exists in ${subDir}.js`
            );
            resolve();
            return;
         }

         // Add the new import statement
         var newImport = `import ${Options.fnObjectName} from "./${subDir}/${Options.fnObjectName}.js";`;

         // Find where to insert the import (after existing imports, before export)
         // Look for the last import statement or export
         var lastImportPattern = /(import\s+[^;]+;)/g;
         var matches = [];
         var match;
         while ((match = lastImportPattern.exec(contents)) !== null) {
            matches.push(match);
         }

         if (matches.length > 0) {
            // Insert after the last import
            var lastMatch = matches[matches.length - 1];
            var insertPos = lastMatch.index + lastMatch[0].length;
            contents =
               contents.substring(0, insertPos) +
               "\n" +
               newImport +
               contents.substring(insertPos);
         } else {
            // No imports found, insert before export or at the beginning
            var exportPattern = /export\s+default\s+function/;
            if (exportPattern.test(contents)) {
               contents = contents.replace(exportPattern, newImport + "\n\n$&");
            } else {
               // If no export found, prepend to file
               contents = newImport + "\n\n" + contents;
            }
         }

         // Find the return array and add the new entry
         // Look for: return [ ... ];
         var returnArrayPattern = /return\s*\[\s*([^\]]*)\s*\]/s;
         if (returnArrayPattern.test(contents)) {
            var returnMatch = contents.match(returnArrayPattern);
            var existingItems = returnMatch[1].trim();
            var newItem = `${Options.fnObjectName}(PluginAPI)`;

            // Check if item already exists in array
            if (existingItems.indexOf(Options.fnObjectName) !== -1) {
               console.log(
                  `... ${Options.fnObjectName} already exists in return array`
               );
               resolve();
               return;
            }

            // Add new item to array
            var newArrayContent;
            if (existingItems) {
               // Clean up existing items (remove extra whitespace/newlines)
               var cleanedItems = existingItems
                  .split(",")
                  .map((item) => item.trim())
                  .filter((item) => item.length > 0)
                  .join(",\n      ");
               // Add comma and new item
               newArrayContent = cleanedItems + ",\n      " + newItem;
            } else {
               // First item in array
               newArrayContent = newItem;
            }

            contents = contents.replace(
               returnArrayPattern,
               `return [\n      ${newArrayContent}\n   ]`
            );
         } else {
            // No return array found, try to add it
            var returnPattern = /return\s+[^[;]+/;
            if (returnPattern.test(contents)) {
               // Replace single return with array
               contents = contents.replace(
                  returnPattern,
                  `return [\n      ${Options.fnObjectName}(PluginAPI)\n   ]`
               );
            } else {
               // Try to find the function body and add return
               var functionBodyPattern =
                  /(export\s+default\s+function\s+\w+\s*\([^)]*\)\s*\{[^}]*)(\})/s;
               if (functionBodyPattern.test(contents)) {
                  contents = contents.replace(
                     functionBodyPattern,
                     `$1\n   return [\n      ${Options.fnObjectName}(PluginAPI)\n   ];\n$2`
                  );
               } else {
                  reject(
                     new Error(
                        `Could not parse ${subDir}.js to add new entry. Please update manually.`
                     )
                  );
                  return;
               }
            }
         }

         fs.writeFileSync(platformJsPath, contents);
         console.log(`... updated ${subDir}.js with ${Options.fnObjectName}`);
         resolve();
      } catch (err) {
         reject(err);
      }
   });
}

/**
 * @function updateManifest
 * Update manifest.json to add platform entry to .plugins array
 * @param {object} Options - the options object
 * @param {string} platform - platform name ("service" or "web")
 * @param {string} platformPath - the path to the platform file (e.g., "./MyPlugin_web.mjs")
 * @param {function} uniquenessCheck - function to check if entry already exists
 * @returns {Promise}
 */
function updateManifest(Options, platform, platformPath, uniquenessCheck) {
   return new Promise((resolve, reject) => {
      var manifestPath = path.join(Options.pluginDir, "manifest.json");

      if (!fs.existsSync(manifestPath)) {
         reject(
            new Error(
               `manifest.json not found in plugin directory: ${Options.pluginDir}`
            )
         );
         return;
      }

      var manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

      // Initialize plugins array if it doesn't exist
      if (!manifest.plugins) {
         manifest.plugins = [];
      }

      // Check uniqueness using provided function
      if (uniquenessCheck && uniquenessCheck(manifest.plugins)) {
         console.log(`... ${platform} entry already exists in manifest.json`);
         resolve();
         return;
      }

      // Add new platform entry
      var platformKey =
         Options.pluginName.toLowerCase().replace(/[^a-z0-9]/g, "_") +
         `_${platform}`;
      var platformEntry = {
         name:
            Options.pluginName +
            " " +
            platform.charAt(0).toUpperCase() +
            platform.slice(1),
         key: platformKey,
         platform: platform,
         type: Options.type || "object",
         path: platformPath,
      };

      manifest.plugins.push(platformEntry);

      // Write back to file with proper formatting
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 3) + "\n");
      console.log(`... updated manifest.json with ${platform} entry`);
      resolve();
   });
}

/**
 * @function copyTemplateFiles
 * copy all template files from a template directory into the plugin directory
 * @param {object} Options - the options object containing pluginDir
 * @param {string} templateDir - the template directory name (e.g., "pluginObject", "pluginPlatformService")
 * @returns {Promise}
 */
function copyTemplateFiles(Options, templateDir) {
   return new Promise((resolve, reject) => {
      // Change into the plugin directory
      shell.pushd("-q", Options.pluginDir);

      // Use fileCopyTemplates to copy all template files from the specified template folder
      utils.fileCopyTemplates(templateDir, Options, [], (err) => {
         shell.popd("-q");
         if (err) {
            reject(err);
            return;
         }
         resolve();
      });
   });
}

/**
 * @function ensurePluginExists
 * Check if the plugin exists, and create it if it doesn't
 * @param {object} Options - the options object
 * @returns {Promise}
 */
async function ensurePluginExists(Options) {
   // If pluginName is not provided, we'll let findPluginDirectory handle prompting
   if (!Options.pluginName) {
      return;
   }

   var pluginsDir = path.join(process.cwd(), "developer", "plugins");

   // Create developer/plugins directory if it doesn't exist
   if (!fs.existsSync(pluginsDir)) {
      fs.mkdirSync(pluginsDir, { recursive: true });
   }

   var pluginDirectoryName = require(path.join(
      __dirname,
      "..",
      "utils",
      "pluginDirectoryName"
   ));

   // Try to find plugin directory - could be exact match or ab_plugin_* format
   var expectedDirName = pluginDirectoryName(Options.pluginName);
   var possibleDirs = [
      Options.pluginName,
      expectedDirName,
      // Also try lowercase version for backwards compatibility
      Options.pluginName.toLowerCase().replace(/[^a-z0-9]/g, "_"),
   ];
   var foundDir = null;
   var pluginFiles = fs.readdirSync(pluginsDir);
   for (var pf in pluginFiles) {
      var pluginFilePath = path.join(pluginsDir, pluginFiles[pf]);
      if (fs.statSync(pluginFilePath).isDirectory()) {
         if (
            pluginFiles[pf] === Options.pluginName ||
            pluginFiles[pf].toLowerCase() ===
               Options.pluginName.toLowerCase() ||
            possibleDirs.indexOf(pluginFiles[pf]) !== -1
         ) {
            foundDir = pluginFiles[pf];
            break;
         }
      }
   }

   // If plugin doesn't exist, create it
   if (!foundDir) {
      console.log(
         `... plugin "${Options.pluginName}" not found, creating new plugin...`
      );

      var pluginNew = require(path.join(__dirname, "pluginNew"));

      // Create a new options object for pluginNew
      // pluginNew expects Options.name, not Options.pluginName
      var newPluginOptions = {
         _: [Options.pluginName], // Pass pluginName as the name parameter
      };

      // Copy any other options that might be useful
      for (var o in Options) {
         if (
            o !== "pluginName" &&
            o !== "objectName" &&
            o !== "type" &&
            o !== "_"
         ) {
            newPluginOptions[o] = Options[o];
         }
      }

      await pluginNew.run(newPluginOptions);

      // After pluginNew runs, the plugin directory should exist
      // pluginNew uses the same pluginDirectoryName utility, so expectedDirName should match
      var createdPluginDir = path.join(pluginsDir, expectedDirName);

      if (fs.existsSync(createdPluginDir)) {
         Options.pluginDir = createdPluginDir;
         Options.pluginDirName = expectedDirName;
         console.log(`... plugin created successfully`);
      } else {
         throw new Error(
            `Plugin was created but directory not found: ${createdPluginDir}`
         );
      }
   }
}

/**
 * @function prepareCommandOptions
 * Prepare options object for a sub-command with proper _ array values
 * @param {object} baseOptions - the base options object with all processed values
 * @param {array} argsArray - array of arguments to set in Options._ for the command
 * @returns {object} new options object with _ array set properly
 */
function prepareCommandOptions(baseOptions, argsArray) {
   // Create a copy of the options
   var commandOptions = {};
   for (var o in baseOptions) {
      commandOptions[o] = baseOptions[o];
   }

   // Set the _ array with the proper values for the command to shift
   commandOptions._ = argsArray.slice();

   return commandOptions;
}

module.exports = {
   checkDependencies,
   findPluginDirectory,
   questions,
   updatePlatformJs,
   updateManifest,
   copyTemplateFiles,
   ensurePluginExists,
   prepareCommandOptions,
};
