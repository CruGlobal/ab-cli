//
// plugin
// manage plugin related tasks (updated architecture)
//
var path = require("path");
var utils = require(path.join(__dirname, "utils", "utils"));

var pluginNew = require(path.join(__dirname, "tasks", "pluginNew.js"));
var pluginObject = require(path.join(__dirname, "tasks", "pluginObject.js"));
var pluginView = require(path.join(__dirname, "tasks", "pluginView.js"));

var Options = {}; // the running options for this command.

//
// Build the Plugin Command
//
var Command = new utils.Resource({
   command: "plugin",
   params: "",
   descriptionShort: "manage plugins (updated architecture).",
   descriptionLong: `
`,
});

module.exports = Command;

Command.help = function () {
   console.log(`

  usage: $ appbuilder plugin [operation] [options]

  [operation]s :
    new :              $ appbuilder plugin new [name]
    object :           $ appbuilder plugin object [pluginName] [objectName]
    view :             $ appbuilder plugin view [pluginName] [viewName]

  [options] :
    name:  the name of the plugin

  examples:

    $ appbuilder plugin new MyPlugin
        - creates new plugin in developer/plugins/ab_plugin_my_plugin

    $ appbuilder plugin object MyPlugin ObjectNetsuite
        - adds object code (properties, service, and web) to existing plugin with object name
    $ appbuilder plugin object MyPlugin
        - adds object code, objectName defaults to pluginName
    $ appbuilder plugin object
        - prompts to select plugin and object name
    $ appbuilder plugin view MyPlugin MyWidget
        - adds view code (properties and web) to existing plugin with view name
    $ appbuilder plugin view MyPlugin
        - adds view code, viewName defaults to pluginName
    $ appbuilder plugin view
        - prompts to select plugin and view name
`);
};

Command.run = async function (options) {
   // copy our passed in options to our Options
   for (var o in options) {
      Options[o] = options[o];
   }
   Options.operation = options._.shift();

   // check for valid params:
   if (!Options.operation) {
      Command.help();
      process.exit(1);
   }

   await checkDependencies();
   await chooseTask();
};

/**
 * @function checkDependencies
 * verify the system has any required dependencies for our operations.
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
 * @function chooseTask
 * choose the proper subTask to perform.
 * @returns {Promise}
 */
async function chooseTask() {
   var task;
   switch (Options.operation.toLowerCase()) {
      case "new":
         task = pluginNew;
         break;
      case "object":
         task = pluginObject;
         break;
      case "view":
         task = pluginView;
         break;
   }
   if (!task) {
      Command.help();
      process.exit(1);
   }

   await task.run(Options);
}
