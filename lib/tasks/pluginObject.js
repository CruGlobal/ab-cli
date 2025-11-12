//
// pluginObject
// add object code (properties, service, and web) to an existing plugin
//
// options:
//
//
var path = require("path");
var utils = require(path.join(__dirname, "..", "utils", "utils"));
var generator = require(path.join(__dirname, "pluginPlatformGenerator"));

var Options = {}; // the running options for this command.

//
// Build the PluginObject Command
//
var Command = new utils.Resource({
   command: "pluginObject",
   params: "",
   descriptionShort:
      "add object code (properties, service, and web) to an existing plugin (updated architecture).",
   descriptionLong: `
`,
});

module.exports = Command;

Command.help = function () {
   console.log(`

  usage: $ appbuilder plugin object [pluginName] [objectName] [options]

  add object code (properties, service, and web) to a plugin in developer/plugins/
  If the plugin doesn't exist, it will be created first.

  Options:
    [pluginName] the name of the plugin to add object code to (will prompt if not provided).
    [objectName] the object name for the object (e.g., "ObjectNetsuite" creates FNObjectNetsuite.js). Defaults to pluginName if omitted.

`);
};

Command.run = async function (options) {
   // copy our passed in options to our Options
   for (var o in options) {
      Options[o] = options[o];
   }

   Options.pluginName = Options._.shift();
   Options.objectName = Options._.shift();
   // Object always has type = "object"
   Options.type = "object";

   await generator.checkDependencies();

   // Check if plugin exists, create it if it doesn't
   await generator.ensurePluginExists(Options);

   await generator.findPluginDirectory(Options, "object");
   await generator.questions(Options, "object");

   // Copy all template files once (this will copy properties/, service/, web/ directories and .js files)
   await generator.copyTemplateFiles(Options, "pluginObject");

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

   // Service command expects: [pluginName, type, objectName]
   var serviceOptions = generator.prepareCommandOptions(Options, [
      Options.pluginName,
      Options.type,
      Options.objectName,
   ]);
   var serviceCommand = require(path.join(__dirname, "pluginPlatformService"));
   await serviceCommand.run(serviceOptions);

   // Web command expects: [pluginName, type, objectName]
   var webOptions = generator.prepareCommandOptions(Options, [
      Options.pluginName,
      Options.type,
      Options.objectName,
   ]);
   var webCommand = require(path.join(__dirname, "pluginPlatformWeb"));
   await webCommand.run(webOptions);
};
