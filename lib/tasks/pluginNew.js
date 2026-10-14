//
// pluginNew
// create a new plugin in the working directory (updated architecture).
//
var fs = require("fs");
var inquirer = require("inquirer");
var path = require("path");
var shell = require("shelljs");
var utils = require(path.join(__dirname, "..", "utils", "utils"));
var pluginDirectoryName = require(path.join(
   __dirname,
   "..",
   "utils",
   "pluginDirectoryName"
));

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
   for (var o in options) {
      Options[o] = options[o];
   }

   Options.name = Options._.shift();
   if (!Options.name) {
      console.log("missing parameter [name]");
      Command.help();
      process.exit(1);
   }

   await createPlugin(Options);
};

/**
 * Programmatic plugin scaffold (used by bundle and other tasks).
 *
 * @param {object} inputOptions
 * @param {string} inputOptions.name - display / plugin name
 * @param {string} [inputOptions.pluginDirName] - exact directory name under developer/plugins/
 * @param {string} [inputOptions.pluginsDir] - parent plugins directory (default cwd/developer/plugins)
 * @param {string} [inputOptions.description]
 * @param {string} [inputOptions.author]
 * @param {string} [inputOptions.icon]
 * @param {boolean} [inputOptions.skipQuestions]
 * @param {string} [inputOptions.pluginName] - PascalCase for templates (optional)
 * @param {string} [inputOptions.pluginKey] - manifest key (optional)
 * @param {string} [inputOptions.pluginNameDisplay] - manifest display name (optional)
 * @returns {Promise<object>} created plugin paths and names
 */
async function createPlugin(inputOptions) {
   var runOptions = {};
   for (var o in inputOptions) {
      runOptions[o] = inputOptions[o];
   }

   if (!runOptions.name) {
      throw new Error("createPlugin requires name");
   }

   await checkDependencies();
   await questions(runOptions);
   await createPluginDirectory(runOptions);
   await copyTemplateFiles(runOptions);

   var pluginsDir =
      runOptions.pluginsDir ||
      path.join(process.cwd(), "developer", "plugins");

   return {
      pluginDirName: runOptions.pluginDirName,
      pluginDir: path.join(pluginsDir, runOptions.pluginDirName),
      pluginName: runOptions.pluginName,
      pluginKey: runOptions.pluginKey,
      pluginNameDisplay: runOptions.pluginNameDisplay,
   };
}

module.exports.createPlugin = createPlugin;
module.exports.pluginCreate = createPlugin;

/**
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
 * @param {object} runOptions
 * @returns {Promise}
 */
function questions(runOptions) {
   return new Promise((resolve, reject) => {
      if (runOptions.skipQuestions) {
         resolve();
         return;
      }

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
                     typeof runOptions.description == "undefined"
                  );
               },
            },
            {
               name: "author",
               type: "input",
               message: "Enter your name (name of the author) :",
               default: "AppBuilder Developer",
               when: (values) => {
                  return (
                     !values.author && typeof runOptions.author == "undefined"
                  );
               },
            },
            {
               name: "icon",
               type: "input",
               message: "Enter the fontawesome icon reference (fa-*) :",
               default: "fa-puzzle-piece",
               when: (values) => {
                  return !values.icon && typeof runOptions.icon == "undefined";
               },
            },
         ])
         .then((answers) => {
            for (var a in answers) {
               runOptions[a] = answers[a];
            }
            resolve();
         })
         .catch(reject);
   });
}

/**
 * @param {object} runOptions
 * @returns {Promise}
 */
function createPluginDirectory(runOptions) {
   return new Promise((resolve, reject) => {
      runOptions.pluginDirName =
         runOptions.pluginDirName || pluginDirectoryName(runOptions.name);

      var pluginsDir =
         runOptions.pluginsDir ||
         path.join(process.cwd(), "developer", "plugins");

      if (!fs.existsSync(pluginsDir)) {
         fs.mkdirSync(pluginsDir, { recursive: true });
      }

      var pluginDir = path.join(pluginsDir, runOptions.pluginDirName);

      if (fs.existsSync(pluginDir)) {
         reject(
            new Error(
               `Directory developer/plugins/${runOptions.pluginDirName} already exists. Please choose a different name.`
            )
         );
         return;
      }

      fs.mkdirSync(pluginDir, { recursive: true });
      console.log(
         `... created directory: developer/plugins/${runOptions.pluginDirName}`
      );

      resolve();
   });
}

/**
 * @param {object} runOptions
 * @returns {Promise}
 */
function copyTemplateFiles(runOptions) {
   return new Promise((resolve, reject) => {
      if (!runOptions.pluginName) {
         var nameNoSpaces = runOptions.name.replaceAll(" ", "");
         var parts = nameNoSpaces.split(/[_-]/);
         for (var p = 0; p < parts.length; p++) {
            parts[p] =
               parts[p].charAt(0).toUpperCase() +
               parts[p].slice(1).toLowerCase();
         }
         runOptions.pluginName = parts.join("");
      }

      if (!runOptions.pluginKey) {
         var keySource = runOptions.name.replaceAll(" ", "");
         runOptions.pluginKey = keySource
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "_");
      }

      runOptions.pluginNameDisplay =
         runOptions.pluginNameDisplay || runOptions.name;

      var pluginsDir =
         runOptions.pluginsDir ||
         path.join(process.cwd(), "developer", "plugins");
      var pluginDir = path.join(pluginsDir, runOptions.pluginDirName);

      shell.pushd("-q", pluginDir);

      utils.fileCopyTemplates("plugin", runOptions, [], (err) => {
         shell.popd("-q");

         if (err) {
            reject(err);
         } else {
            resolve();
         }
      });
   });
}
