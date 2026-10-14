//
// docker
// manage docker related tasks
//
// options:
//  appbuilder docker build  : build a new Docker Image from a repository
//
//
var async = require("async");
var path = require("path");
var utils = require(path.join(__dirname, "utils", "utils"));

var dockerBuild = require(path.join(__dirname, "tasks", "dockerBuild.js"));

var Options = {}; // the running options for this command.

//
// Build the Service Command
//
var Command = new utils.Resource({
   command: "docker",
   params: "",
   descriptionShort: "manage docker related tasks",
   descriptionLong: `
`,
});

module.exports = Command;

Command.help = function () {
   console.log(`

  usage: $ appbuilder docker [operation]

  [operation]s :
    build [repos] : build and push a new image for a set of [repos]
                    these repos are the directories in your [root]/developer
                    directory and need to have a Dockerfile present.

    build all     : scan the /developer directories and build all the repos.
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
 * verify the system has any required dependencies for service operations.
 * @param {function} done  node style callback(err)
 */
function checkDependencies(done) {
   utils.checkDependencies(["docker"], done);
}

/**
 * @function chooseTask
 * choose the proper subTask to perform.
 * @param {cb(err)} done
 */
function chooseTask(done) {
   var task;
   switch (Options.operation.toLowerCase()) {
      case "build":
         task = dockerBuild;
         break;
   }
   if (!task) {
      Command.help();
      process.exit(1);
   }

   task.run(Options).then(done).catch(done);
}
