//
// pluginMigrateView
// migrate view code from platform to a plugin
//
var fs = require("fs");
var path = require("path");
var utils = require(path.join(__dirname, "..", "utils", "utils"));
var generator = require(path.join(__dirname, "pluginPlatformGenerator"));
var pluginView = require(path.join(__dirname, "pluginView"));
var dirLooksLikeRoot = require(path.join(
   __dirname,
   "..",
   "utils",
   "dirLooksLikeRoot"
));

var Options = {}; // the running options for this command.

const INSERT_HERE = "// Insert Here //";

/**
 * Escape $ in strings used as .replace(regex, replacement) replacement.
 * Otherwise JS interprets $$ as single $, $1 as capture group, etc.
 * @param {string} str
 * @returns {string}
 */
function escapeReplacement(str) {
   return str.replace(/\$/g, "$$$$");
}

//
// Build the PluginMigrateView Command
//
var Command = new utils.Resource({
   command: "pluginMigrateView",
   params: "",
   descriptionShort:
      "migrate view code from platform to a plugin (updated architecture).",
   descriptionLong: `
`,
});

module.exports = Command;

Command.help = function () {
   console.log(`

  usage: $ appbuilder plugin migrate view [pluginName] [viewName] [options]

  migrate view code from platform to a plugin in developer/plugins/
  If the plugin doesn't exist, it will be created first.

  Options:
    [pluginName] the name of the plugin to migrate view code to (will prompt if not provided).
    [viewName] the view name to migrate (e.g., "MyWidget").

`);
};

Command.run = async function (options) {
   // copy our passed in options to our Options
   for (var o in options) {
      Options[o] = options[o];
   }

   Options.pluginName = Options._.shift();
   Options.viewName = Options._.shift();

   if (!Options.viewName) {
      console.log("missing parameter [viewName]");
      Command.help();
      process.exit(1);
   }

   await generator.checkDependencies();

   // Check if plugin exists, create it if it doesn't
   Options.description = "plugin migration for view: " + Options.viewName;
   Options.author = "Coding Monkey";
   Options.icon = "fa-puzzle-piece";
   await generator.ensurePluginExists(Options);

   // Find or set plugin directory
   if (!Options.pluginDir) {
      await generator.findPluginDirectory(Options, "view");
   }

   // Set objectName to viewName for view migration
   Options.objectName = Options.viewName;
   Options.type = "view";

   // Process objectName to get PascalCase and other formats
   await generator.questions(Options, "view");

   // // Override plugin key for views (generator defaults to "ab-object-")
   // Options.pluginKey = Options.pluginKey.replace("ab-object-", "ab-view-");

   // Create placeholder view code first
   await createPlaceholderView();

   // Migrate files from platform
   await migrateViewFiles();
};

/**
 * @function createPlaceholderView
 * Create placeholder view code using pluginView logic
 * @returns {Promise}
 */
async function createPlaceholderView() {
   // Use pluginView to create the placeholder structure
   // We'll override the template copying to skip it, then do our own migration

   // Check if files already exist
   var webPath = path.join(
      Options.pluginDir,
      "web",
      Options.fnObjectName + ".js"
   );
   var componentPath = path.join(
      Options.pluginDir,
      "web",
      Options.fnObjectName + "Component.js"
   );
   var propertiesPath = path.join(
      Options.pluginDir,
      "properties",
      Options.fnObjectName + ".js"
   );
   var editorPath = path.join(
      Options.pluginDir,
      "properties",
      Options.fnObjectName + "Editor.js"
   );

   // Only create placeholders if files don't exist
   if (
      !fs.existsSync(webPath) ||
      !fs.existsSync(componentPath) ||
      !fs.existsSync(propertiesPath) ||
      !fs.existsSync(editorPath)
   ) {
      console.log("... creating placeholder view structure...");
      // PluginView needs these parameters: pluginName, objectName
      var viewOptions = generator.prepareCommandOptions(Options, [
         Options.pluginName,
         Options.viewName,
      ]);

      await pluginView.run(viewOptions);
   } else {
      console.log(
         "... view files already exist, skipping placeholder creation"
      );
   }
}

/**
 * @function migrateViewFiles
 * Search for and migrate view files from platform to plugin
 * @returns {Promise}
 */
async function migrateViewFiles() {
   console.log("... searching for source files...");

   // Find the root directory (should contain ab_platform_web and plugins)
   var rootDir = findRootDirectory();
   if (!rootDir) {
      throw new Error(
         "Could not find root directory containing developer/ab_platform_web and plugins directories"
      );
   }

   // Search for source files
   var sourceFiles = await findSourceFiles(rootDir, Options.viewName);

   // Migrate each file
   if (sourceFiles.platformView) {
      await migrateCoreView(sourceFiles.platformView, sourceFiles.coreViewCore);
   }
   if (sourceFiles.component) {
      await migrateComponent(sourceFiles.component);
   }

   //// Left Off Here:

   if (sourceFiles.properties) {
      await migrateProperties(sourceFiles.properties);
   }
   if (sourceFiles.editor) {
      await migrateEditor(sourceFiles.editor);
   }

   //// Final file movements

   //// Then Remove ABViewXXXX from the base ViewManager imports
   await unLinkOriginalView(Options.viewName);

   //// create a new directory in ab_platform_web/platform/plugins/included/'view_[key]`
   //// copy the plugin/web files to the new directory
   //// include the plugin in platform/plugins/included/index.js
   await linkNewPlugin(sourceFiles);

   //// ABDesigner

   await unlinkDesignerFiles(sourceFiles, Options.viewName);

   //// - create a new directory in src/plugins/web_view_[key]
   //// - copy the plugin/properties files to the new directory
   //// - include the plugins in src/plugins/index.js
   await linkNewDesignerPlugins(sourceFiles);

   //// Remove ABViewXXXX from the base ViewManager imports
   console.log("... migration complete");
}

/**
 * @function findRootDirectory
 * Find the root directory (ab_runtime) that contains developer/ab_platform_web and plugins
 * @returns {string|null} path to root directory or null if not found
 */
function findRootDirectory() {
   var currentDir = process.cwd();
   var maxDepth = 20; // Prevent infinite loops
   var depth = 0;

   // First, find the root directory (ab_runtime) using dirLooksLikeRoot
   var rootDir = null;
   while (depth < maxDepth) {
      if (dirLooksLikeRoot(currentDir)) {
         rootDir = currentDir;
         break;
      }

      var parentDir = path.dirname(currentDir);
      if (parentDir === currentDir) {
         // Reached filesystem root
         break;
      }
      currentDir = parentDir;
      depth++;
   }

   if (!rootDir) {
      return null;
   }

   // Now check if developer/ab_platform_web and plugins exist from the root
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
}

/**
 * @function findSourceFiles
 * Find all source files for the view
 * @param {string} rootDir - root directory path
 * @param {string} viewName - name of the view
 * @returns {Promise<object>} object containing paths to source files
 */
function findSourceFiles(rootDir, viewName) {
   return new Promise((resolve) => {
      var sourceFiles = {};

      // Helper function to find directory with case-insensitive search
      function findDir(basePath, possibleNames) {
         if (!fs.existsSync(basePath)) {
            return null;
         }
         var entries = fs.readdirSync(basePath);
         for (var i = 0; i < entries.length; i++) {
            for (var j = 0; j < possibleNames.length; j++) {
               if (
                  entries[i].toLowerCase() === possibleNames[j].toLowerCase()
               ) {
                  return path.join(basePath, entries[i]);
               }
            }
         }
         return null;
      }

      // Try to find Appbuilder directory (case-insensitive)
      // Path is: rootDir/developer/ab_platform_web
      var abPlatformWebDir = path.join(rootDir, "developer", "ab_platform_web");
      var appbuilderDir = findDir(abPlatformWebDir, [
         "Appbuilder",
         "AppBuilder",
         "appbuilder",
      ]);

      if (appbuilderDir) {
         // Paths to search
         var coreViewsDir = findDir(appbuilderDir, ["core"]);
         if (coreViewsDir) {
            coreViewsDir = findDir(coreViewsDir, ["views"]);
         }

         var platformDir = findDir(appbuilderDir, ["platform"]);
         var platformViewsDir = null;
         if (platformDir) {
            platformViewsDir = findDir(platformDir, ["views"]);
         }

         if (platformViewsDir) {
            var platformViewPath = path.join(
               platformViewsDir,
               viewName + ".js"
            );
            if (fs.existsSync(platformViewPath)) {
               sourceFiles.platformView = platformViewPath;
            }

            var viewComponentBase = findDir(platformViewsDir, [
               "viewComponent",
               "viewcomponent",
            ]);
            // Find component file
            if (viewComponentBase) {
               var componentPath = path.join(
                  viewComponentBase,
                  viewName + "Component.js"
               );
               if (fs.existsSync(componentPath)) {
                  sourceFiles.component = componentPath;
               }
            }
         }

         // Find core view files
         if (coreViewsDir) {
            var coreViewCorePath = path.join(
               coreViewsDir,
               viewName + "Core.js"
            );

            if (fs.existsSync(coreViewCorePath)) {
               sourceFiles.coreViewCore = coreViewCorePath;
            }
         }
      }

      // Find designer files
      var pluginsDir = path.join(rootDir, "developer", "plugins");
      var abDesignerDir = findDir(pluginsDir, [
         "ABDesigner",
         "abdesigner",
         "AbDesigner",
      ]);

      if (abDesignerDir) {
         var designerEditorsDir = path.join(
            abDesignerDir,
            "src",
            "rootPages",
            "Designer",
            "editors",
            "views"
         );
         var designerPropertiesDir = path.join(
            abDesignerDir,
            "src",
            "rootPages",
            "Designer",
            "properties",
            "views"
         );

         // Find properties file
         if (fs.existsSync(designerPropertiesDir)) {
            var propertiesPath = path.join(
               designerPropertiesDir,
               viewName + ".js"
            );
            if (fs.existsSync(propertiesPath)) {
               sourceFiles.properties = propertiesPath;
            }
         }

         // Find editor file
         if (fs.existsSync(designerEditorsDir)) {
            var editorPath = path.join(designerEditorsDir, viewName + ".js");
            if (fs.existsSync(editorPath)) {
               sourceFiles.editor = editorPath;
            }
         }
      }

      // Log what was found
      console.log("... found source files:");
      if (sourceFiles.platformView) {
         console.log(`    - core view: ${sourceFiles.platformView}`);
      }
      if (sourceFiles.coreViewCore) {
         console.log(`    - core view core: ${sourceFiles.coreViewCore}`);
      }
      if (sourceFiles.component) {
         console.log(`    - component: ${sourceFiles.component}`);
      }
      if (sourceFiles.properties) {
         console.log(`    - properties: ${sourceFiles.properties}`);
      }
      if (sourceFiles.editor) {
         console.log(`    - editor: ${sourceFiles.editor}`);
      }

      resolve(sourceFiles);
   });
}

/**
 * @function migrateCoreView
 * Migrate core view files and combine them
 * @param {string} coreViewPath - path to core view file
 * @param {string} coreViewCorePath - path to core view core file (optional)
 * @returns {Promise}
 */
function migrateCoreView(platformViewPath, coreViewPath) {
   return new Promise((resolve, reject) => {
      try {
         var targetPath = path.join(
            Options.pluginDir,
            "web",
            Options.fnObjectName + ".js"
         );

         Options.pathWebPlugin = targetPath;

         var targetContent = fs.readFileSync(targetPath, "utf8");

         // // extract the getPluginKey() {} method (with optional comment header)
         // var getPluginKeyMatch = targetContent.match(
         //    /((?:\/\*\*(?:(?!\/\*\*)[\s\S])*?\*\/\s*)?static\s+getPluginKey\(\s*\)\s*{\s*return\s+"[^"]+"\s*;\s*})/
         // );
         // var getPluginKey = getPluginKeyMatch ? getPluginKeyMatch[1] : "";
         //// Convert getPluginKey() to return this.common().key
         var getPluginKey = `/**
       * @method getPluginKey
       * return the plugin key for this view.
       * @return {string} plugin key
       */
      static getPluginKey() {
         return this.common().key;
      }`;

         // extract the component() {} method (with optional comment header)
         var componentMatch = targetContent.match(
            /((?:\/\*\*(?:(?!\/\*\*)[\s\S])*?\*\/\s*)?component\(\s*\w*\s*\)\s*{\s*return\s+new\s+\w+\s*\([^)]*\)\s*;\s*})/
         );
         var component = componentMatch ? componentMatch[1] : "";

         let codeToAddBackIn = "";
         if (getPluginKey) {
            codeToAddBackIn += getPluginKey + "\n\n";
         }
         if (component) {
            codeToAddBackIn += component + "\n\n";
         }

         // Extract the function body (excluding the const initialization line)
         var bodyMatch = targetContent.match(
            /export\s+default\s+function\s+\w+\s*\(\s*\{[\s\S]*?\}\s*,?\s*\)\s*\{\s*const\s+\w+\s*=\s*\w+\s*\(\s*\{\s*ABViewComponentPlugin\s*\}\s*\)\s*;([\s\S]*)\}\s*$/
         );
         var targetBody = bodyMatch ? bodyMatch[1] : "";
         if (targetBody) {
            targetContent = targetContent.replace(
               targetBody,
               "\n\n" + INSERT_HERE + "\n\n"
            );
         }

         // Read core view files
         var coreViewContent = fs.readFileSync(coreViewPath, "utf8");
         // remove the import statements
         let coreImports = extractImports(coreViewContent);
         coreViewContent = coreViewContent.replace(coreImports, "").trim();

         if (coreImports.indexOf("ABViewWidget") !== -1) {
            targetContent = targetContent.replace(
               "ABViewPlugin",
               "ABViewWidgetPlugin"
            );

            coreViewContent = coreViewContent.replace(
               "ABViewWidget",
               "ABViewWidgetPlugin"
            );
         }

         // make sure coreViewContent doesn't have export commands
         coreViewContent = coreViewContent.replace(/export\s+default\s+/g, "");
         coreViewContent = coreViewContent.replace(
            /module\.exports\s*=\s*/g,
            ""
         );

         targetContent = targetContent.replace(
            INSERT_HERE,
            escapeReplacement(coreViewContent + "\n\n" + INSERT_HERE)
         );

         // Now insert the platform view content
         var platformViewContent = fs.readFileSync(platformViewPath, "utf8");

         // remove the import statements
         let platformImports = extractImports(platformViewContent);
         platformViewContent = platformViewContent
            .replace(platformImports, "")
            .trim();

         // remove the let L = (...params) => AB.Multilingual.label(...params); statement
         platformViewContent = platformViewContent.replace(
            /let\s+L\s*=[^;]+;/g,
            ""
         );

         // replace exports default or modlule.exports with "return
         platformViewContent = platformViewContent.replace(
            /export\s+default\s+/g,
            "return "
         );
         platformViewContent = platformViewContent.replace(
            /module\.exports\s*=\s*/g,
            "return "
         );

         // remove the existing component() {} method (simple return new X() or full body with nested {})
         var platformComponentMatch = platformViewContent.match(
            /((?:\/\*\*(?:(?!\/\*\*)[\s\S])*?\*\/\s*)?component\s*\(\s*[^)]*\)\s*\{(\s*return\s+new\s+\w+\s*\([^)]*\)\s*;\s*}|(?:[^{}]|\{(?:[^{}]|\{(?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*\})*\})*)\})/
         );
         var platformComponent = platformComponentMatch
            ? platformComponentMatch[1]
            : "";

         if (platformComponent) {
            platformViewContent = platformViewContent.replace(
               platformComponent,
               ""
            );
         }

         // remove const ...Component... = require("...Component...");
         var platformRequireMatch = platformViewContent.match(
            /const\s+\w*Component\w*\s*=\s*require\s*\(\s*["'][^"']*Component[^"']*["']\s*\)\s*;/
         );
         var platformRequire = platformRequireMatch
            ? platformRequireMatch[0]
            : "";
         if (platformRequire) {
            platformViewContent = platformViewContent.replace(
               platformRequire,
               ""
            );
         }

         // add the code to add back in to platformViewContent
         // this needs to be added after the return class ... extends .... { line
         var returnClassMatch = platformViewContent.match(
            /return\s+class\s+\w+\s+extends\s+\w+\s*\{/
         );
         var returnClass = returnClassMatch ? returnClassMatch[0] : "";
         if (returnClass) {
            platformViewContent = platformViewContent.replace(
               returnClass,
               escapeReplacement(returnClass + "\n\n" + codeToAddBackIn)
            );
         }

         // add the platform view content
         targetContent = targetContent.replace(
            INSERT_HERE,
            escapeReplacement(platformViewContent)
         );

         // Write to target
         fs.writeFileSync(targetPath, targetContent, "utf8");
         console.log(`... migrated core view to ${targetPath}`);

         resolve();
      } catch (err) {
         reject(err);
      }
   });
}

// /**
//  * @function combineCoreViews
//  * Combine core view and core view core files, ensuring it extends ABViewPlugin
//  * @param {string} coreViewContent - content of core view file
//  * @param {string} coreViewCoreContent - content of core view core file
//  * @returns {string} combined and modified content
//  */
// function combineCoreViews(coreViewContent, coreViewCoreContent) {
//    var combinedContent = "";

//    // If we have both files, we need to combine them intelligently
//    if (coreViewCoreContent) {
//       // The Core file typically contains the class definition
//       // The main file typically contains the function wrapper
//       // We need to merge them

//       // Extract imports and other code from both files
//       var coreViewImports = extractImports(coreViewContent);
//       var coreViewCoreImports = extractImports(coreViewCoreContent);

//       // Combine imports (remove duplicates)
//       var allImports = combineImports(coreViewImports, coreViewCoreImports);

//       // Extract the class from coreViewCore
//       // Try ES6 export default class first
//       var classMatch = coreViewCoreContent.match(
//          /export\s+default\s+class\s+(\w+)\s+extends\s+(\w+)\s*\{([\s\S]*)\}/
//       );
//       var isModuleExports = false;

//       // If not found, try CommonJS module.exports = class
//       if (!classMatch) {
//          classMatch = coreViewCoreContent.match(
//             /module\.exports\s*=\s*class\s+(\w+)\s+extends\s+(\w+)\s*\{([\s\S]*)\}/
//          );
//          if (classMatch) {
//             isModuleExports = true;
//          }
//       }

//       // Also try module.exports = class without name (anonymous class)
//       if (!classMatch) {
//          classMatch = coreViewCoreContent.match(
//             /module\.exports\s*=\s*class\s+extends\s+(\w+)\s*\{([\s\S]*)\}/
//          );
//          if (classMatch) {
//             isModuleExports = true;
//             // Shift the capture groups to match expected format
//             // [0] = full match, [1] = base class, [2] = body
//             // We need: [1] = className, [2] = base class, [3] = body
//             classMatch = [
//                classMatch[0],
//                Options.fnObjectName, // Use the object name as class name
//                classMatch[1],
//                classMatch[2],
//             ];
//          }
//       }

//       if (classMatch) {
//          var className = classMatch[1];
//          var classBody = classMatch[3];

//          // Replace base class with ABViewPlugin
//          var modifiedClass = `export default class ${className} extends ABViewPlugin {${classBody}}`;

//          // Check if coreViewContent is a function wrapper
//          var functionMatch = coreViewContent.match(
//             /export\s+default\s+function\s+(\w+)\s*\([^)]*\)\s*\{([\s\S]*)\}/
//          );

//          if (functionMatch) {
//             // It's a function wrapper - we need to keep the function structure
//             var functionName = functionMatch[1];

//             // Extract function parameters
//             var paramMatch = coreViewContent.match(
//                /export\s+default\s+function\s+\w+\s*\(([^)]*)\)/
//             );
//             var params = paramMatch ? paramMatch[1] : "";

//             // Ensure ABViewPlugin is in parameters
//             if (params && !params.includes("ABViewPlugin")) {
//                params = params.trim();
//                if (params && !params.endsWith(",")) {
//                   params += ", ";
//                }
//                params += "ABViewPlugin";
//             } else if (!params) {
//                params = "ABViewPlugin";
//             }

//             // Build the combined content
//             combinedContent =
//                allImports +
//                "\n\n" +
//                `export default function ${functionName}(${params}) {\n` +
//                `   ${modifiedClass.replace(
//                   /export\s+default\s+class/,
//                   "return class"
//                )}\n` +
//                `}`;
//          } else {
//             // Not a function wrapper, just use the modified class
//             combinedContent = allImports + "\n\n" + modifiedClass;
//          }
//       } else {
//          // Fallback: just modify the coreViewContent
//          combinedContent = coreViewContent;
//       }
//    } else {
//       // Only have coreViewContent, just modify it
//       combinedContent = coreViewContent;
//    }

//    // Ensure ABViewPlugin is used instead of ABView or ABViewCore
//    combinedContent = combinedContent.replace(
//       /extends\s+ABView\b/g,
//       "extends ABViewPlugin"
//    );
//    combinedContent = combinedContent.replace(
//       /extends\s+ABViewCore\b/g,
//       "extends ABViewPlugin"
//    );

//    // Ensure ABViewPlugin is in function parameters if it's a function export
//    if (
//       combinedContent.includes("export default function") &&
//       !combinedContent.match(
//          /export\s+default\s+function\s+\w+\s*\([^)]*ABViewPlugin/
//       )
//    ) {
//       combinedContent = combinedContent.replace(
//          /(export\s+default\s+function\s+\w+\s*\([^)]*)\)/,
//          function (match, p1) {
//             if (p1.trim().length === 0) {
//                return (
//                   "export default function " +
//                   match.match(/\w+/)[0] +
//                   "(ABViewPlugin)"
//                );
//             }
//             return p1 + ", ABViewPlugin)";
//          }
//       );
//    }

//    return combinedContent;
// }

/**
 * @function extractImports
 * Extract import statements (ES6 import) or require statements (CommonJS) from file content
 * @param {string} content - file content
 * @returns {string} import/require statements
 */
function extractImports(content) {
   var imports = [];
   var lines = content.split("\n");
   var inImport = false;
   var currentImport = "";

   // Regex patterns for require statements
   // Matches: var/const/let x = require("..."); or var/const/let { a, b } = require("...");
   var requirePattern = /^(var|const|let)\s+(\w+|\{[^}]+\})\s*=\s*require\s*\(/;
   // Matches: require("..."); (side-effect only imports)
   var requireSideEffectPattern = /^require\s*\(/;

   for (var idx = 0; idx < lines.length; idx++) {
      var lineContent = lines[idx];
      var trimmedLine = lineContent.trim();

      // Check for ES6 import statements
      if (trimmedLine.startsWith("import ")) {
         inImport = true;
         currentImport = lineContent;
         // Check if it's a multi-line import
         if (
            lineContent.includes(";") ||
            trimmedLine.endsWith("'") ||
            trimmedLine.endsWith('"')
         ) {
            imports.push(currentImport);
            currentImport = "";
            inImport = false;
         }
      } else if (inImport) {
         // Continue multi-line import
         currentImport += "\n" + lineContent;
         if (
            lineContent.includes(";") ||
            trimmedLine.endsWith("'") ||
            trimmedLine.endsWith('"')
         ) {
            imports.push(currentImport);
            currentImport = "";
            inImport = false;
         }
      } else if (
         requirePattern.test(trimmedLine) ||
         requireSideEffectPattern.test(trimmedLine)
      ) {
         // Check for CommonJS require statements
         // Handle multi-line require (e.g., with path.join)
         currentImport = lineContent;
         if (trimmedLine.includes(";")) {
            imports.push(currentImport);
            currentImport = "";
         } else {
            // Multi-line require statement
            inImport = true;
         }
      } else if (trimmedLine === "" && imports.length > 0 && !inImport) {
         // Empty line after imports/requires, we're done
         break;
      }
   }

   return imports.join("\n");
}

// /**
//  * @function combineImports
//  * Combine import/require statements, removing duplicates
//  * @param {string} imports1 - first set of imports/requires
//  * @param {string} imports2 - second set of imports/requires
//  * @returns {string} combined imports/requires
//  */
// function combineImports(imports1, imports2) {
//    var allImports = [];
//    var seen = new Set();

//    // Helper to check if a line is an import or require statement
//    function isImportOrRequire(line) {
//       if (!line) return false;
//       var trimmed = line.trim();
//       if (trimmed.startsWith("import ")) return true;
//       if (/^(var|const|let)\s+(\w+|\{[^}]+\})\s*=\s*require\s*\(/.test(trimmed))
//          return true;
//       if (/^require\s*\(/.test(trimmed)) return true;
//       return false;
//    }

//    // Add imports from first set
//    if (imports1) {
//       var lines1 = imports1.split("\n");
//       for (var idx1 = 0; idx1 < lines1.length; idx1++) {
//          var line1 = lines1[idx1].trim();
//          if (isImportOrRequire(line1)) {
//             if (!seen.has(line1)) {
//                allImports.push(line1);
//                seen.add(line1);
//             }
//          }
//       }
//    }

//    // Add imports from second set
//    if (imports2) {
//       var lines2 = imports2.split("\n");
//       for (var idx2 = 0; idx2 < lines2.length; idx2++) {
//          var line2 = lines2[idx2].trim();
//          if (isImportOrRequire(line2)) {
//             if (!seen.has(line2)) {
//                allImports.push(line2);
//                seen.add(line2);
//             }
//          }
//       }
//    }

//    return allImports.join("\n");
// }

/**
 * @function migrateComponent
 * Migrate component file and ensure it extends ABViewComponentPlugin
 * @param {string} componentPath - path to component file
 * @returns {Promise}
 */
function migrateComponent(componentPath) {
   return new Promise((resolve, reject) => {
      try {
         var targetPath = path.join(
            Options.pluginDir,
            "web",
            Options.fnObjectName + "Component.js"
         );

         // grap the targetConetnts
         var targetContent = fs.readFileSync(targetPath, "utf8");
         // extract everything inside the class ... extends ... { definition
         var targetContentsMatch = targetContent.match(
            /class\s+\w+\s+extends\s+\w+\s*\{([\s\S]*)\}/
         );
         var classTargetContents = targetContentsMatch
            ? targetContentsMatch[1]
            : "";
         if (classTargetContents) {
            targetContent = targetContent.replace(
               classTargetContents,
               "\n\n" + INSERT_HERE + "\n\n   };\n\n"
            );
         }

         var componentContent = fs.readFileSync(componentPath, "utf8");
         var componentContentsMatch = componentContent.match(
            /class\s+\w+\s+extends\s+\w+\s*\{([\s\S]*)\}/
         );
         var classComponentContents = componentContentsMatch
            ? componentContentsMatch[1]
            : "";
         if (classComponentContents) {
            targetContent = targetContent.replace(
               INSERT_HERE,
               escapeReplacement(classComponentContents)
            );
         }

         fs.writeFileSync(targetPath, targetContent, "utf8");
         console.log(`... migrated component to ${targetPath}`);

         resolve();
      } catch (err) {
         reject(err);
      }
   });
}

/**
 * @function migrateProperties
 * Migrate properties file and ensure it extends ABViewPropertiesPlugin
 * @param {string} propertiesPath - path to properties file
 * @returns {Promise}
 */
function migrateProperties(propertiesPath) {
   return new Promise((resolve, reject) => {
      try {
         var targetPath = path.join(
            Options.pluginDir,
            "properties",
            Options.fnObjectName + ".js"
         );

         var targetContent = fs.readFileSync(targetPath, "utf8");

         // grab the getPluginKey() and getPluginType() methods with optional comment headers
         // var getPluginKeyMatch = targetContent.match(
         //    /((?:\/\*\*(?:(?!\/\*\*)[\s\S])*?\*\/\s*)?static\s+getPluginKey\(\s*\)\s*{\s*\S+\s+\S+\s*;\s*(?:\/\/[^\n]*\n\s*)?})/
         // );
         // var getPluginKey = getPluginKeyMatch ? getPluginKeyMatch[1] : "";
         var getPluginKey = `static getPluginKey() {
         return this.key;
      }`;

         var getPluginTypeMatch = targetContent.match(
            /((?:\/\*\*(?:(?!\/\*\*)[\s\S])*?\*\/\s*)?static\s+getPluginType\(\s*\)\s*{\s*return\s+"[^"]+"\s*;\s*(?:\/\/[^\n]*\n\s*)?})/
         );
         var getPluginType = getPluginTypeMatch ? getPluginTypeMatch[1] : "";

         let codeToAddBackIn = "";
         if (getPluginKey) {
            codeToAddBackIn += getPluginKey + "\n\n";
         }
         if (getPluginType) {
            codeToAddBackIn += getPluginType + "\n\n";
         }

         // NOW get the existing property contents
         var propertiesContent = fs.readFileSync(propertiesPath, "utf8");

         // grab the section between export default function(AB) {
         // and the class ... extends ... { definition
         let propertiesHeaderMatch = propertiesContent.match(
            /export\s+default\s+function\s+\(\s*AB\s*\)\s*\{[^\n]*\n([\s\S]*?)(?=class\s+\w+\s+extends)/
         );
         let propertiesHeader = propertiesHeaderMatch
            ? propertiesHeaderMatch[1]
            : "";
         propertiesContent = propertiesContent.replace(propertiesHeader, "");

         // remove lines that define ABView (e.g., "const ABView = FABView(AB);")
         propertiesHeader = propertiesHeader.replace(
            /^.*\bABView\b.*\n?/gm,
            ""
         );

         // remove the final "return ABView...;" line
         propertiesContent = propertiesContent.replace(
            /return\s+ABView\w+\s*;/gm,
            ""
         );

         // now pull the contents of the class ... extends ... { definition
         let propertiesClassMatch = propertiesContent.match(
            /class\s+\w+\s+extends\s+\w+\s*\{([\s\S]*)\}/
         );
         let propertiesClassContents = propertiesClassMatch
            ? propertiesClassMatch[1]
            : "";

         propertiesClassContents = `${codeToAddBackIn}\n\n${propertiesClassContents}`;

         // Now remove the contents of the class ... extends ... { definition
         let classTargetContentsMatch = targetContent.match(
            /class\s+\w+\s+extends\s+\w+\s*\{([\s\S]*)\}/
         );
         let classTargetContents = classTargetContentsMatch
            ? classTargetContentsMatch[1]
            : "";
         if (classTargetContents) {
            targetContent = targetContent.replace(
               classTargetContents,
               "\n\n" + INSERT_HERE + "\n\n"
            );
         }

         // add in the properties class contents
         targetContent = targetContent.replace(
            INSERT_HERE,
            escapeReplacement(propertiesClassContents)
         );

         // Now find the line that says "return class ..." and before that I need to add
         // the properties header
         let returnClassMatch = targetContent.match(
            /return\s+class\s+\w+\s+extends\s+\w+\s*\{/
         );
         let returnClass = returnClassMatch ? returnClassMatch[0] : "";
         if (returnClass) {
            targetContent = targetContent.replace(
               returnClass,
               escapeReplacement(propertiesHeader + "\n\n" + returnClass)
            );
         }

         fs.writeFileSync(targetPath, targetContent, "utf8");
         console.log(`... migrated properties to ${targetPath}`);

         resolve();
      } catch (err) {
         reject(err);
      }
   });
}

/**
 * @function migrateEditor
 * Migrate editor file and ensure it extends ABViewEditorPlugin
 * @param {string} editorPath - path to editor file
 * @returns {Promise}
 */
function migrateEditor(editorPath) {
   return new Promise((resolve, reject) => {
      try {
         var targetPath = path.join(
            Options.pluginDir,
            "properties",
            Options.fnObjectName + "Editor.js"
         );

         var targetContent = fs.readFileSync(targetPath, "utf8");

         // capture the getPluginKey() and getPluginType() methods with optional comment headers
         // var getPluginKeyMatch = targetContent.match(
         //    /((?:\/\*\*(?:(?!\/\*\*)[\s\S])*?\*\/\s*)?static\s+getPluginKey\(\s*\)\s*{\s*\S+\s+\S+\s*;\s*(?:\/\/[^\n]*\n\s*)?})/
         // );
         // var getPluginKey = getPluginKeyMatch ? getPluginKeyMatch[1] : "";

         var getPluginKey = `static getPluginKey() {
         return this.key;
      }`;

         var getPluginTypeMatch = targetContent.match(
            /((?:\/\*\*(?:(?!\/\*\*)[\s\S])*?\*\/\s*)?static\s+getPluginType\(\s*\)\s*{\s*return\s+"[^"]+"\s*;\s*(?:\/\/[^\n]*\n\s*)?})/
         );
         var getPluginType = getPluginTypeMatch ? getPluginTypeMatch[1] : "";

         let codeToAddBackIn = "";
         if (getPluginKey) {
            codeToAddBackIn += getPluginKey + "\n\n";
         }
         if (getPluginType) {
            codeToAddBackIn += getPluginType + "\n\n";
         }

         // now clear the contents of the class ... extends ... { definition
         let targetClassMatch = targetContent.match(
            /class\s+\w+\s+extends\s+\w+\s*\{([\s\S]*)\}/
         );
         let targetClassContents = targetClassMatch ? targetClassMatch[1] : "";
         if (targetClassContents) {
            targetContent = targetContent.replace(
               targetClassContents,
               "\n\n" + INSERT_HERE + "\n\n"
            );
         }

         var editorContent = fs.readFileSync(editorPath, "utf8");

         var editorContentsMatch = editorContent.match(
            /myClass\s*=\s*class\s+\w+\s+extends\s+\w+\s*\{([\s\S]*)\}\s+return\s+myClass\s*;/
         );
         var classEditorContents = editorContentsMatch
            ? editorContentsMatch[1]
            : "";
         if (classEditorContents) {
            classEditorContents = `${codeToAddBackIn}\n\n${classEditorContents}`;

            // add in the editor class contents
            targetContent = targetContent.replace(
               INSERT_HERE,
               escapeReplacement(classEditorContents)
            );
         }

         // now grab the header content between "if (!myClass) {" and "myClass = class ... extends ... {"
         let editorHeaderMatch = editorContent.match(
            /if\s*\(\s*!myClass\s*\)\s*\{([\s\S]*?)(?=\w+\s*=\s*class\s+\w+\s+extends\s+\w+\s*\{)/
         );
         let editorHeader = editorHeaderMatch ? editorHeaderMatch[1] : "";
         if (editorHeader) {
            // convert
            //      const UIClass = UI_Class(AB);
            //      const L = UIClass.L();
            // to
            //      this.L = AB.Label();
            editorHeader = editorHeader.replace(
               /const\s+UIClass\s*=\s*UI_Class\s*\(AB\)\s*;/,
               ""
            );
            editorHeader = editorHeader.replace(
               /const\s+L\s*=\s*UIClass\.L\(\s*\)\s*;/,
               "this.L = AB.Label();"
            );

            // Find the "return class ... extends ... {" line and insert header before it
            let returnClassMatch = targetContent.match(
               /return\s+class\s+\w+\s+extends\s+\w+\s*\{/
            );
            let returnClass = returnClassMatch ? returnClassMatch[0] : "";
            if (returnClass) {
               targetContent = targetContent.replace(
                  returnClass,
                  escapeReplacement(editorHeader.trim() + "\n\n" + returnClass)
               );
            }
         }

         fs.writeFileSync(targetPath, targetContent, "utf8");
         console.log(`... migrated editor to ${targetPath}`);

         resolve();
      } catch (err) {
         reject(err);
      }
   });
}

function unLinkOriginalView(viewName) {
   return new Promise((resolve, reject) => {
      try {
         var targetPath = path.join(
            process.cwd(),
            "developer",
            "ab_platform_web",
            "AppBuilder",
            "core",
            "ABViewManagerCore.js"
         );
         var targetContent = fs.readFileSync(targetPath, "utf8");

         // find the line with Original View //    require(".....viewName"),
         // Escape special regex characters in viewName
         let escapedViewName = viewName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
         let originalViewMatch = targetContent.match(
            new RegExp(
               `require\\s*\\(\\s*["'][^"']*${escapedViewName}[^"']*["']\\s*\\)\\s*,`
            )
         );
         let originalView = originalViewMatch ? originalViewMatch[0] : "";
         if (originalView) {
            targetContent = targetContent.replace(
               originalView,
               `// ${originalView}`
            );
         }
         fs.writeFileSync(targetPath, targetContent, "utf8");
         console.log(`... unlinked original view from ${targetPath}`);
         resolve();
      } catch (err) {
         reject(err);
      }
   });
}

function linkNewPlugin() {
   return new Promise((resolve, reject) => {
      try {
         let pathWebPlugin = Options.pathWebPlugin;
         let contentsWebPlugin = fs.readFileSync(pathWebPlugin, "utf8");
         let matchPluginKey = contentsWebPlugin.match(
            /ABViewDefaults\s*=\s*\{[\s\S]*?key:\s*"([^"]+)"/
         );
         let pluginKey = matchPluginKey ? matchPluginKey[1] : "";
         Options.pluginKey = pluginKey;

         let pluginDir = path.join(
            process.cwd(),
            "developer",
            "ab_platform_web",
            "AppBuilder",
            "platform",
            "plugins",
            "included"
         );

         let newPluginDir = path.join(pluginDir, `view_${pluginKey}`);
         fs.mkdirSync(newPluginDir, { recursive: true });

         let dirWebPluginFiles = path.join(Options.pluginDir, "web");
         let newPluginFile = "";
         // I now need to copy ALL the files in pathWebPlugin to newPluginDir:
         fs.readdirSync(dirWebPluginFiles).forEach((file) => {
            if (file.indexOf(".js") !== -1 && file.indexOf("Component") == -1) {
               newPluginFile = file;
            }
            fs.copyFileSync(
               path.join(dirWebPluginFiles, file),
               path.join(newPluginDir, file)
            );
         });

         let newPluginRef = `view${pluginKey[0].toUpperCase()}${pluginKey.slice(
            1
         )}`;

         //// create a new directory in ab_platform_web/platform/plugins/included/'view_[key]`
         //// copy the plugin/web files to the new directory
         //// include the plugin in platform/plugins/included/index.js
         let indexPath = path.join(pluginDir, "index.js");
         let indexContent = fs.readFileSync(indexPath, "utf8");

         // make sure our new view_[key] isn't already in the indexContent
         if (indexContent.indexOf(`view_${pluginKey}`) == -1) {
            let newImport = `import ${newPluginRef} from "./view_${pluginKey}/${newPluginFile}";`;
            indexContent = `${newImport}\n${indexContent}`;

            indexContent = indexContent.replace("];", `, ${newPluginRef}];`);

            fs.writeFileSync(indexPath, indexContent, "utf8");
            console.log(`... linked new plugin to ${indexPath}`);
         } else {
            console.log(`... view_${pluginKey} already exists in ${indexPath}`);
         }
         resolve();
      } catch (err) {
         reject(err);
      }
   });
}

function unlinkFile(filePath, fileName, escapedRegEx) {
   let paths = filePath.split(path.sep);
   paths.pop();
   paths.pop();
   paths.push(fileName);
   let editorManagerPath = paths.join(path.sep);
   let editorManagerContent = fs.readFileSync(editorManagerPath, "utf8");

   let editorManagerMatch = editorManagerContent.match(escapedRegEx);

   let editorManager = editorManagerMatch ? editorManagerMatch[0] : "";
   if (editorManager) {
      editorManagerContent = editorManagerContent.replace(
         editorManager,
         `// ${editorManager}`
      );
   }
   fs.writeFileSync(editorManagerPath, editorManagerContent, "utf8");
   console.log(`... unlinked editor from ${editorManagerPath}`);
}

function unlinkDesignerFiles(sourceFiles, viewName) {
   return new Promise((resolve, reject) => {
      try {
         let escapedViewName = viewName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
         let escapedRegEx = new RegExp(
            `require\\s*\\(\\s*["'][^"']*${escapedViewName}[^"']*["']\\s*\\)\\s*,`
         );

         // if an editor exists, unlink it
         if (sourceFiles.editor) {
            unlinkFile(sourceFiles.editor, "EditorManager.js", escapedRegEx);
         }
         // if a properties file exists, unlink it
         if (sourceFiles.properties) {
            unlinkFile(
               sourceFiles.properties,
               "PropertyManager.js",
               escapedRegEx
            );
         }
         resolve();
      } catch (err) {
         reject(err);
      }
   });
}

function linkNewDesignerPlugins(sourceFiles) {
   return new Promise((resolve, reject) => {
      try {
         let pathPropertiesPlugin = path.join(Options.pluginDir, "properties");

         let pluginKey = Options.pluginKey;

         let pluginDir = path.join(
            process.cwd(),
            "developer",
            "plugins",
            "ABDesigner",
            "src",
            "plugins"
         );

         let newPluginDir = path.join(pluginDir, `web_view_${pluginKey}`);
         fs.mkdirSync(newPluginDir, { recursive: true });

         let newPluginFiles = [];
         let newPluginNames = [];
         // I now need to copy ALL the files in pluginDir to newPluginDir:
         fs.readdirSync(pathPropertiesPlugin).forEach((file) => {
            let newPluginRef = `view${pluginKey[0].toUpperCase()}${pluginKey.slice(
               1
            )}`;
            let keepThis = false;
            if (file.indexOf("Editor") !== -1) {
               if (sourceFiles.editor) keepThis = true;
               newPluginRef = `${newPluginRef}Editor`;
            } else {
               if (sourceFiles.properties) keepThis = true;
               newPluginRef = `${newPluginRef}Properties`;
            }
            if (keepThis) {
               newPluginFiles.push(
                  `import ${newPluginRef} from "./web_view_${pluginKey}/${file}";`
               );
               newPluginNames.push(newPluginRef);
               fs.copyFileSync(
                  path.join(pathPropertiesPlugin, file),
                  path.join(newPluginDir, file)
               );
            }
         });

         //// create a new directory in ab_platform_web/platform/plugins/included/'view_[key]`
         //// copy the plugin/web files to the new directory
         //// include the plugin in platform/plugins/included/index.js
         let indexPath = path.join(pluginDir, "index.js");
         let indexContent = fs.readFileSync(indexPath, "utf8");

         // only update if web_view_${pluginKey} isn't already in the indexContent
         if (indexContent.indexOf(`web_view_${pluginKey}`) == -1) {
            indexContent = `${newPluginFiles.join("\n")}\n${indexContent}`;

            indexContent = indexContent.replace(
               "];",
               `, ${newPluginNames.join(", ")}];`
            );

            fs.writeFileSync(indexPath, indexContent, "utf8");
            console.log(`... linked new plugin to ${indexPath}`);
         } else {
            console.log(
               `... web_view_${pluginKey} already exists in ${indexPath}`
            );
         }
         resolve();
      } catch (err) {
         reject(err);
      }
   });
}
