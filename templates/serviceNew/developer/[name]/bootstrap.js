const path = require("path");
const { spawn } = require("child_process");

function command(cmd, options) {
   return new Promise((resolve /*, reject */) => {
      var install = spawn(cmd, options);
      install.stdout.on("data", (data) => {
         console.log(data.toString().trim());
      });
      install.stderr.on("data", (data) => {
         console.log(data.toString().trim());
      });
      install.on("close", (/* code */) => {
         // console.log(` ... close[${code}]`);
         //   console.log(" ... restarting");

         // setInterval(()=>{ console.log("use cli");}, 10000);
         resolve();
      });
      install.on("exit", (/* code */) => {
         // console.log(` ... exit[${code}]`);
         //   console.log(" ... restarting");
         //   setInterval(()=>{ console.log("use cli");}, 10000);
         resolve();
      });
   });
}

try {
   require(path.join(__dirname, "app.js"));
} catch (e) {
   var strErr = e.toString();
   var match = strErr.match(/Cannot find module '(.*)'/);
   if (match) {
      var module = match[1];
      console.log(strErr);
      console.log(` ... fixing [${module}]`);
      Promise.resolve()
         .then(() => {
            return command("npm", ["uninstall", module]);
         })
         .then(() => {
            if (module == "ab-utils") {
               module = `hiro-nakamura/ab-utils`;
            }
            return command("npm", ["install", module, "--save"]);
         })
         .then(() => {
            console.log(" ... initializing all dependencies  ");
            return command("npm", ["install", "--force"]);
         })
         .then(() => {
            // setInterval(()=>{ console.log("use cli");}, 10000);
            process.exit();
         });
   } else {
      console.log(e);
      process.exit(1);
   }
}
