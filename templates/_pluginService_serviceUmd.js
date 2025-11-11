// 2) Service UMD bundle
const serviceUmd = {
   ...common,
   name: "serviceUmd",
   entry: { service: path.join(APP, "service.js") },
   output: {
      filename: "AB<%= pluginName %>_service.js",
      library: { name: "Plugin", type: "umd" },
      globalObject: "this",
      // keep default iife=true implicitly (no warning)
   },
   target: "node", // or 'node' if server-side
};

