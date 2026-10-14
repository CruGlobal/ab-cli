//
// pull
// update the root directory and any relevant dependant developer projects.
//
// options:
//  --developer   :  setup the environment for a developer
//
var async = require("async");
// var fs = require("fs");
var path = require("path");
var shell = require("shelljs");
var utils = require(path.join(__dirname, "utils", "utils"));
var Setup = require(path.join(__dirname, "setup.js"));

var Options = {}; // the running options for this command.

//
// Build the Install Command
//
var Command = new utils.Resource({
   command: "pull",
   params: "--developer",
   descriptionShort: "perform a new installation of the AB Runtime.",
   descriptionLong: `
`,
});

module.exports = Command;

Command.help = function () {
   console.log(`

  usage: $ appbuilder pull [name]

  [name] : [optional] the name of a specific developer project to git pull.
           if not provided, then all projects will be pulled.
           (same as --all flag)

  [options] :
    --all   : perform a pull on all project related repositories

  examples:

    $ appbuilder pull --all
        - git pull the root directory
        - scan the latest source.docker-compose.dev.yml for expected git
          projects
        - for each project, git clone if not there, and then git pull

    $ appbuilder pull api_sails
        - specifically pulls ./developer/api_sails project.

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
               Options.name = options._.shift();

               // check for valid params:
               if (!Options.name) {
                  console.log("missing required param: [name]");
                  Command.help();
                  process.exit(1);
               }
               done();
            },
            checkV1,
            checkDependencies,
            cloneRepo,
            installDependencies,
            runSetup,
            devInstallServices,
            initializeDB,
         ],
         (err) => {
            // now make sure we have popd() all remaining directories
            // we start by pushd() an additional one and then using
            // the returned list of entries as a basis for removing
            // all the remaining.
            var list = shell.pushd("-q", process.cwd());
            list.pop(); // we need to popd() until there is only 1
            // remove the rest:
            list.forEach(() => {
               shell.popd("-q");
            });

            // if there was an error that wasn't an ESKIP error:
            if (err && (!err.code || err.code != "ESKIP")) {
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
   // verify we have 'git'
   utils.checkDependencies(["git", "docker"], done);
}

/**
 * @function checkV1
 * check to see if they are requesting an install of the V1 AppBuilder environment.
 * if they are, pass control to the installV1 command and skip the rest of the steps.
 * @param {function} done  node style callback(err)
 */
function checkV1(done) {
   if (Options["V1"] || Options["v1"]) {
      try {
         Options._.unshift(Options.name);
         delete Options.name;

         var installV1 = require(path.join(__dirname, "installV1.js"));
         installV1
            .run(Options)
            .then(() => {
               var skipError = new Error("Just Skip this install");
               skipError.code = "ESKIP";
               done(skipError);
            })
            .catch(done);
      } catch (e) {
         console.error("Unable to find installV1.js install script.");
         done(e);
      }
   } else {
      done();
   }
}

/**
 * @function cloneRepo
 * clone the AB_runtime repo into the specified directory.
 * @param {cb(err)} done
 */
function cloneRepo(done) {
   console.log("... cloning repo");
   shell.exec(
      `git clone https://github.com/Hiro-Nakamura/ab_runtime.git ${Options.name}`
   );

   shell.pushd("-q", Options.name);
   done();
}

/**
 * @function installDependencies
 * clone the AB_runtime repo into the specified directory.
 * @param {cb(err)} done
 */
function installDependencies(done) {
   console.log("... install dependencies");
   shell.exec(`npm install`);
   done();
}

/**
 * @function runSetup
 * perform the "$ appbuilder setup" command.
 * @param {cb(err)} done
 */
function runSetup(done) {
   Setup.run().then(done).catch(done);
}

/**
 * @function devInstallServices
 * install all of our development services.
 * @param {cb(err)} done
 */
function devInstallServices(done) {
   // only do this if they put the --develop flag
   if (!Options.develop) {
      done();
      return;
   }

   utils.gitScanDevYML((err, services) => {
      if (err) {
         done(err);
         return;
      }

      utils.InstallServices(services, done);
   });
}

function initializeDB(done) {
   console.log();
   console.log("initialize the DB tables");
   utils
      .dbInit("dbinit-compose.yml")
      .then(() => {
         done();
      })
      .catch(done);
   // shell.exec(path.join(process.cwd(), "DBInit.js"));
   // done();
}
