//
// pluginView
// add view code (properties and web) to an existing plugin
//
// options:
//
//
var path = require("path");
var utils = require(path.join(__dirname, "..", "utils", "utils"));
var generator = require(path.join(__dirname, "pluginPlatformGenerator"));

var Options = {}; // the running options for this command.

//
// Build the PluginView Command
//
var Command = new utils.Resource({
   command: "pluginView",
   params: "",
   descriptionShort:
      "add view code (properties and web) to an existing plugin (updated architecture).",
   descriptionLong: `
`,
});

module.exports = Command;

Command.help = function () {
   console.log(`

  usage: $ appbuilder plugin view [pluginName] [viewName] [options]

  add view code (properties and web) to a plugin in developer/plugins/
  If the plugin doesn't exist, it will be created first.

  Options:
    [pluginName] the name of the plugin to add view code to (will prompt if not provided).
    [viewName] the view name for the view (e.g., "MyWidget" creates FNMyWidget.js). Defaults to pluginName if omitted.

`);
};

Command.run = async function (options) {
   // copy our passed in options to our Options
   for (var o in options) {
      Options[o] = options[o];
   }

   Options.pluginName = Options._.shift();
   Options.objectName = Options._.shift();
   // View always has type = "view"
   Options.type = "view";

   await generator.checkDependencies();

   // Check if plugin exists, create it if it doesn't
   await generator.ensurePluginExists(Options);

   await generator.findPluginDirectory(Options, "view");
   await generator.questions(Options, "view");

   // Override plugin key for views (generator defaults to "ab-object-")
   Options.pluginKey = Options.pluginKey.replace("ab-object-", "ab-view-");

   // Copy all template files once (this will copy properties/, web/ directories and .js files)
   await generator.copyTemplateFiles(Options, "pluginView");

   // Call each platform command to handle webpack and manifest updates
   // They will skip template copying since files already exist, but will update platform.js, webpack, and manifest
   // Prepare options for each command with proper _ array values

   // Properties command expects: [pluginName, objectName] and sets type = "properties"
   var propertiesOptions = generator.prepareCommandOptions(Options, [
      Options.pluginName,
      Options.objectName,
   ]);
   var propertiesCommand = require(path.join(
      __dirname,
      "pluginPlatformProperties"
   ));
   await propertiesCommand.run(propertiesOptions);

   // Update properties.js to register the Editor file (main file is already registered by pluginPlatformProperties)
   await updatePropertiesJs();

   // Web command expects: [pluginName, type, objectName]
   var webOptions = generator.prepareCommandOptions(Options, [
      Options.pluginName,
      Options.type,
      Options.objectName,
   ]);
   var webCommand = require(path.join(__dirname, "pluginPlatformWeb"));
   await webCommand.run(webOptions);
};

/**
 * @function updatePropertiesJs
 * Update properties.js to register the Editor file using the generator's updatePlatformJs function
 * @returns {Promise}
 */
function updatePropertiesJs() {
   var fs = require("fs");
   var propertiesJsPath = path.join(Options.pluginDir, "properties.js");

   if (!fs.existsSync(propertiesJsPath)) {
      // If properties.js doesn't exist, pluginPlatformProperties will create it
      return Promise.resolve();
   }

   // Create a temporary options object with the Editor file name
   var editorOptions = {};
   for (var o in Options) {
      editorOptions[o] = Options[o];
   }
   editorOptions.fnObjectName = Options.fnObjectName + "Editor";

   // Use the generator's updatePlatformJs function to add the Editor file
   return generator.updatePlatformJs(
      propertiesJsPath,
      editorOptions,
      "properties"
   );
}
