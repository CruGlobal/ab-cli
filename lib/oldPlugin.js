//
// oldPlugin
// manage plugin related tasks (old architecture)
//
// options:
//  appbuilder oldPlugin new [name]  : create a new plugin
//  appbuilder oldPlugin page new [name] : create a new page within a plugin
//
var async = require("async");
var path = require("path");
var utils = require(path.join(__dirname, "utils", "utils"));

var oldPluginNew = require(path.join(__dirname, "tasks", "oldPluginNew.js"));
var oldPluginPage = require(path.join(__dirname, "tasks", "oldPluginPage.js"));

var Options = {}; // the running options for this command.

//
// Build the Service Command
//
var Command = new utils.Resource({
   command: "oldPlugin",
   params: "",
   descriptionShort: "manage plugins (old architecture).",
   descriptionLong: `
`,
});

module.exports = Command;

Command.help = function () {
   console.log(`

  usage: $ appbuilder oldPlugin [operation] [options]

  [operation]s :
    new :    $ appbuilder oldPlugin new [name]
    page:    $ appbuilder oldPlugin page [plugin-name] [page-name]


  [options] :
    name:  the name of the plugin

  examples:

    $ appbuilder oldPlugin new RemoteConnection
        - creates new plugin in developer/plugins/RemoteConnection
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
               Options.operation = options._.shift();

               // check for valid params:
               if (!Options.operation) {
                  Command.help();
                  process.exit(1);
               }
               done();
            },
            checkDependencies,
            chooseTask,
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
 * verify the system has any required dependencies for our operations.
 * @param {function} done  node style callback(err)
 */
function checkDependencies(done) {
   utils.checkDependencies(["git"], done);
}

/**
 * @function chooseTask
 * choose the proper subTask to perform.
 * @param {cb(err)} done
 */
function chooseTask(done) {
   var task;
   switch (Options.operation.toLowerCase()) {
      case "new":
         task = oldPluginNew;
         break;

      case "page":
         task = oldPluginPage;
         break;
   }
   if (!task) {
      Command.help();
      process.exit(1);
   }

   task.run(Options).then(done).catch(done);
}
