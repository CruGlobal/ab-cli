//
// oldPluginPage
// create a new plugin in the developer/plugins directory (old architecture).
//
// options:
//
//
var async = require("async");
// var fs = require("fs");
// var inquirer = import("inquirer");
var path = require("path");
// var shell = require("shelljs");
var utils = require(path.join(__dirname, "..", "utils", "utils"));

var Options = {}; // the running options for this command.

//
// Build the Install Command
//
var Command = new utils.Resource({
   command: "oldPluginPage",
   params: "",
   descriptionShort:
      "create a new plugin page in developer/plugins/[plugin] directory (old architecture).",
   descriptionLong: `
`,
});

module.exports = Command;

Command.help = function () {
   console.log(`

  usage: $ appbuilder oldPlugin page [plugin] [pageName]

  create a new plugin page in [root]/developer/plugins/[name]/src/rootPages/

  Options:
    [plugin] the name of the plugin we are adding a page to
    [pageName] the name of the root page we are creating

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

               Options.pluginName = Options._.shift();
               if (!Options.pluginName) {
                  console.log("missing parameter [plugin]");
                  Command.help();
                  process.exit(1);
               }
               Options.pageName = Options._.shift();
               if (!Options.pageName) {
                  console.log("missing parameter [pageName]");
                  Command.help();
                  process.exit(1);
               }
               done();
            },
            checkDependencies,
            // questions,
            copyTemplateFiles,
            updateApplication,
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
   utils.checkDependencies([], done);
}

/**
 * @function copyTemplateFiles
 * copy our template files into the project
 * @param {cb(err)} done
 */
function copyTemplateFiles(done) {
   // Options.pluginName;
   // Options.pageName;

   utils.fileCopyTemplates("oldPluginPage", Options, [], done);
}

/**
 * @function updateApplication()
 * Insert this Page info into the plugin/src/application.js file
 */
function updateApplication(done) {
   var pathFile = path.join(
      "developer",
      "plugins",
      Options.pluginName,
      "src",
      "application.js"
   );

   var pageName = Options.pageName.replaceAll(" ", "_");
   // {string} Name of our Page that is OK as a variable (no spaces)

   var tagExport = "export default function (AB) {";

   var replaceImport = `import ${pageName}Factory from "./rootPages/${Options.pageName}/ui.js";
${tagExport}`;

   var replaceVariable = `${tagExport}
   var ${pageName} = ${pageName}Factory(AB);`;

   var tagAppLink = "return application;";
   var replaceAppLink = `${pageName}.application = application;
   ${tagAppLink}`;

   utils.filePatch([
      {
         // insert the Factory Import statement
         file: pathFile,
         tag: tagExport,
         replace: replaceImport,
      },
      {
         // insert the Page Variable from Factory statement
         file: pathFile,
         tag: tagExport,
         replace: replaceVariable,
      },
      {
         // insert our Page Variable into our _pages
         file: pathFile,
         tag: "_pages: [",
         replace: `_pages: [ ${pageName},`,
      },
      {
         // Fix any improper page insert (on first insert)
         file: pathFile,
         tag: ",],",
         replace: "],",
      },
      {
         // Each New Page needs to link back to our application
         file: pathFile,
         tag: tagAppLink,
         replace: replaceAppLink,
      },
   ]);

   done();
}

/**
 * @function questions
 * Present the user with a list of configuration questions.
 * If the answer for a question is already present in Options, then we
 * skip that question.
 * @param {cb(err)} done
 */
// function questions(done) {
//    inquirer
//       .prompt([
//          {
//             name: "description",
//             type: "input",
//             message: "Describe this plugin :",
//             default: "A cool new plugin.",
//             when: (values) => {
//                return (
//                   !values.description &&
//                   typeof Options.description == "undefined"
//                );
//             },
//          },
//          {
//             name: "icon",
//             type: "input",
//             message: "Enter the fontawesome icon reference fa-* :",
//             default: "puzzle-piece",
//             when: (values) => {
//                return !values.icon && typeof Options.icon == "undefined";
//             },
//          },
//       ])
//       .then((answers) => {
//          for (var a in answers) {
//             Options[a] = answers[a];
//          }
//          // console.log("Options:", Options);
//          done();
//       })
//       .catch(done);
// }
