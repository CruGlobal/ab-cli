//
// oldPluginNew
// create a new plugin in the developer/plugins directory (old architecture).
//
// options:
//
//
var async = require("async");
// var fs = require("fs");
var inquirer = require("inquirer");
var path = require("path");
var shell = require("shelljs");
var utils = require(path.join(__dirname, "..", "utils", "utils"));

var Options = {}; // the running options for this command.

//
// Build the Install Command
//
var Command = new utils.Resource({
   command: "oldPluginNew",
   params: "",
   descriptionShort:
      "create a new plugin in developer/plugins/ directory (old architecture).",
   descriptionLong: `
`,
});

module.exports = Command;

Command.help = function () {
   console.log(`

  usage: $ appbuilder oldPlugin new [name] [options]

  create a new plugin in [root]/developer/plugins/[name]

  Options:
    [name] the name of the service to create.
    -d     the name of the plugins directory (default: plugins)

`);
};

Command.run = function (options) {
   return new Promise((resolve, reject) => {
      async.series(
         [
            // copy our passed in options to our Options
            (done) => {
               for (var o in options) {
                  Options[o] = options[o];
               }

               Options.name = Options._.shift();
               if (!Options.name) {
                  console.log("missing parameter [name]");
                  Command.help();
                  process.exit(1);
               }
               done();
            },
            checkDependencies,
            questions,
            copyTemplateFiles,
            installGitDependencies,
         ],
         (err) => {
            if (err) {
               reject(err);
               return;
            }
            resolve();
         }
      );
   });
};

/**
 * @function checkDependencies
 * verify the system has any required dependencies for generating ssl certs.
 * @param {function} done  node style callback(err)
 */
function checkDependencies(done) {
   utils.checkDependencies(["git"], done);
}

/**
 * @function copyTemplateFiles
 * copy our template files into the project
 * @param {cb(err)} done
 */
function copyTemplateFiles(done) {
   var parts = Options.name.split("_");
   for (var p = 0; p < parts.length; p++) {
      parts[p] = parts[p].charAt(0).toUpperCase() + parts[p].slice(1);
   }
   //    Options.className = parts.join("");
   Options.pluginName = Options.name.replaceAll(" ", "");
   Options.pluginID = Options.pluginName;
   // options.name, no spaces,
   Options.description = Options.description || "a new plugin"; // package.json .description
   Options.icon = Options.icon || "puzzle-piece";
   Options.fileName = `${Options.pluginID}.js`;

   utils.fileCopyTemplates("oldPluginNew", Options, [], done);
}

/**
 * @function installGitDependencies
 * install our initial git dependencies.
 * @param {cb(err)} done
 */
function installGitDependencies(done) {
   shell.pushd(
      "-q",
      path.join(process.cwd(), "developer", "plugins", Options.pluginName)
   );

   // init git repo
   shell.exec(`git init`);

   console.log("... npm install (this takes a while)");
   shell.exec("npm install");
   // utils.execCli("npm install");

   shell.popd();
   done();
}

/**
 * @function questions
 * Present the user with a list of configuration questions.
 * If the answer for a question is already present in Options, then we
 * skip that question.
 * @param {cb(err)} done
 */
function questions(done) {
   inquirer
      .prompt([
         {
            name: "description",
            type: "input",
            message: "Describe this plugin :",
            default: "A cool new plugin.",
            when: (values) => {
               return (
                  !values.description &&
                  typeof Options.description == "undefined"
               );
            },
         },
         {
            name: "icon",
            type: "input",
            message: "Enter the fontawesome icon reference fa-* :",
            default: "puzzle-piece",
            when: (values) => {
               return !values.icon && typeof Options.icon == "undefined";
            },
         },
      ])
      .then((answers) => {
         for (var a in answers) {
            Options[a] = answers[a];
         }
         // console.log("Options:", Options);
         done();
      })
      .catch(done);
}
