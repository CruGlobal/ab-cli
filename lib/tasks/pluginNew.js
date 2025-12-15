//
// pluginNew
// create a new plugin in the working directory (updated architecture).
//
// options:
//
//
var fs = require("fs");
var inquirer = import("inquirer");
var path = require("path");
var shell = require("shelljs");
var utils = require(path.join(__dirname, "..", "utils", "utils"));

var Options = {}; // the running options for this command.

//
// Build the PluginNew Command
//
var Command = new utils.Resource({
   command: "pluginNew",
   params: "",
   descriptionShort:
      "create a new plugin in the working directory (updated architecture).",
   descriptionLong: `
`,
});

module.exports = Command;

Command.help = function () {
   console.log(`

  usage: $ appbuilder plugin new [name] [options]

  create a new plugin in developer/plugins/

  Options:
    [name] the name of the plugin to create.

`);
};

Command.run = async function (options) {
   // copy our passed in options to our Options
   for (var o in options) {
      Options[o] = options[o];
   }

   Options.name = Options._.shift();
   if (!Options.name) {
      console.log("missing parameter [name]");
      Command.help();
      process.exit(1);
   }

   await checkDependencies();
   await questions();
   await createPluginDirectory();
   await copyTemplateFiles();
};

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
 * @function questions
 * Present the user with a list of configuration questions.
 * If the answer for a question is already present in Options, then we
 * skip that question.
 * @returns {Promise}
 */
function questions() {
   return new Promise((resolve, reject) => {
      inquirer
         .prompt([
            {
               name: "description",
               type: "input",
               message: "Describe this plugin :",
               default: "A new AppBuilder plugin",
               when: (values) => {
                  return (
                     !values.description &&
                     typeof Options.description == "undefined"
                  );
               },
            },
            {
               name: "author",
               type: "input",
               message: "Enter your name (name of the author) :",
               default: "AppBuilder Developer",
               when: (values) => {
                  return !values.author && typeof Options.author == "undefined";
               },
            },
            {
               name: "icon",
               type: "input",
               message: "Enter the fontawesome icon reference (fa-*) :",
               default: "fa-puzzle-piece",
               when: (values) => {
                  return !values.icon && typeof Options.icon == "undefined";
               },
            },
         ])
         .then((answers) => {
            for (var a in answers) {
               Options[a] = answers[a];
            }
            resolve();
         })
         .catch(reject);
   });
}

/**
 * @function createPluginDirectory
 * create the plugin directory with inferred name
 * @returns {Promise}
 */
function createPluginDirectory() {
   return new Promise((resolve, reject) => {
      var pluginDirectoryName = require(path.join(
         __dirname,
         "..",
         "utils",
         "pluginDirectoryName"
      ));

      // Convert name to directory name format: ab_plugin_<snake_case>
      Options.pluginDirName = pluginDirectoryName(Options.name);

      // Create developer/plugins directory if it doesn't exist
      var pluginsDir = path.join(process.cwd(), "developer", "plugins");
      if (!fs.existsSync(pluginsDir)) {
         fs.mkdirSync(pluginsDir, { recursive: true });
      }

      var pluginDir = path.join(pluginsDir, Options.pluginDirName);

      // Check if directory already exists
      if (fs.existsSync(pluginDir)) {
         reject(
            new Error(
               `Directory developer/plugins/${Options.pluginDirName} already exists. Please choose a different name.`
            )
         );
         return;
      }

      // Create the directory
      fs.mkdirSync(pluginDir, { recursive: true });
      console.log(
         `... created directory: developer/plugins/${Options.pluginDirName}`
      );

      resolve();
   });
}

/**
 * @function copyTemplateFiles
 * copy our template files into the project
 * @returns {Promise}
 */
function copyTemplateFiles() {
   return new Promise((resolve, reject) => {
      // Convert name to different formats for templating
      var nameNoSpaces = Options.name.replaceAll(" ", "");

      // pluginName: PascalCase (e.g., "NetsuiteAPI" from "netsuite_api" or "Netsuite API")
      var parts = nameNoSpaces.split(/[_-]/);
      for (var p = 0; p < parts.length; p++) {
         parts[p] =
            parts[p].charAt(0).toUpperCase() + parts[p].slice(1).toLowerCase();
      }
      Options.pluginName = parts.join("");

      // pluginKey: snake_case version (e.g., "object_netsuite_api")
      Options.pluginKey = nameNoSpaces.toLowerCase().replace(/[^a-z0-9]/g, "_");

      // pluginNameDisplay: Display name (e.g., "Netsuite API")
      Options.pluginNameDisplay = Options.name;

      // Change into the plugin directory
      var pluginDir = path.join(
         process.cwd(),
         "developer",
         "plugins",
         Options.pluginDirName
      );
      shell.pushd("-q", pluginDir);

      utils.fileCopyTemplates("plugin", Options, [], (err) => {
         // Change back to original directory
         shell.popd("-q");

         if (err) {
            reject(err);
         } else {
            resolve();
         }
      });
   });
}
