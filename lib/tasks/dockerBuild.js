//
// dockerBuild
// Run the build instructions for our repositories.
//
// options:
//
//
var async = require("async");
var fs = require("fs");
var path = require("path");
var shell = require("shelljs");
var utils = require(path.join(__dirname, "..", "utils", "utils"));

var Options = {}; // the running options for this command.

//
// Build the Install Command
//
var Command = new utils.Resource({
   command: "dockerBuild",
   params: "",
   descriptionShort: "run the build instructions for our repository",
   descriptionLong: `
`,
});

module.exports = Command;

Command.help = function () {
   console.log(`

  usage: $ appbuilder docker build [repo]

  build the indicated repository

  Options:
    [repo] the name of the developer service we are building.
    "all"  will build all the repos in our develop

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
               Options.repos = [];
               var repo = options._.shift();
               while (repo) {
                  Options.repos.push(repo);
                  repo = options._.shift();
               }
               if (Options.repos.length == 0) {
                  console.log("missing required param: [repo]");
                  Command.help();
                  process.exit(1);
               }
               done();
            },
            checkDependencies,
            gatherRepos,
            verifyRepos,
            buildEm,
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
   utils.checkDependencies(["docker"], done);
}

/**
 * @function gatherRepos
 * figure out the directories that have the repos we want to build.
 * @param {function} done  node style callback(err)
 */
function gatherRepos(done) {
   // findAllServices ignores "api_sails" so add that in.
   var allServices = utils.findAllServices();
   allServices.unshift("api_sails");

   if (Options.repos.length == 1 && Options.repos[0].toLowerCase() == "all") {
      Options.repos = allServices;
   } else {
      Options.repos.forEach((r) => {
         if (allServices.indexOf(r) == -1) {
            console.error(`  unknown service: ${r}`);
            process.exit(1);
         }
      });
   }
   done();
}

/**
 * @function verifyRepos
 * Make sure each of these Repos have a Dockerfile
 * @param {function} done  node style callback(err)
 */
function verifyRepos(done) {
   var dirDeveloper = path.join(process.cwd(), "developer");
   var verified = [];
   Options.repos.forEach((r) => {
      if (utils.dirLooksLike({ Dockerfile: 1 }, path.join(dirDeveloper, r))) {
         verified.push(r);
      } else {
         console.log(`${r} doesn't have a Dockerfile ... skipping`);
      }
   });

   Options.repos = verified;
   done();
}

/**
 * @function buildEm
 * Process each of the directories and build the images.
 * @param {function} done  node style callback(err)
 */
function buildEm(done) {
   //var dirDeveloper = path.join(process.cwd(), "developer");

   var list = Options.repos.concat([]);
   buildOne(list, (err) => {
      done(err);
   });
}

function buildOne(list, cb) {
   if (list.length == 0) {
      return cb();
   }

   var r = list.shift();
   var dirRepo = path.join(process.cwd(), "developer", r);
   shell.pushd("-q", dirRepo);

   try {
      // Find the Docker build instructions:
      var contents = fs
         .readFileSync(path.join(dirRepo, "Dockerfile"))
         .toString();

      var buildCmd;
      var buildExp = new RegExp(`##\\s\\$\\s(.*)`, "g");
      while ((buildCmd = buildExp.exec(contents))) {
         // execute the instructions
         var cmd = buildCmd[1];
         if (cmd.indexOf(" build ") > -1) {
            cmd = `${cmd} --no-cache`;
         }
         console.log(` ... ${r} : ${cmd}`);
         var { /* stdout,*/ stderr, code } = shell.exec(cmd, { silent: true });
         if (code != 0) {
            console.log(stderr);
         }
      }

      shell.popd("-q");
      buildOne(list, cb);
   } catch (err) {
      console.error(err);
      cb(err);
   }
}
