//
// pluginBundleIncluded
// Bundle platform included view plugins into developer/plugins/
//
var fs = require("fs");
var inquirer = require("inquirer");
var path = require("path");
var shell = require("shelljs");
var utils = require(path.join(__dirname, "..", "utils", "utils"));
var findRuntimeRoot = require(path.join(
   __dirname,
   "..",
   "utils",
   "findRuntimeRoot"
));
var syncPluginFiles = require(path.join(
   __dirname,
   "..",
   "utils",
   "syncPluginFiles"
));
var pluginBundleIndex = require(path.join(
   __dirname,
   "..",
   "utils",
   "pluginBundleIndex"
));
var pluginDirectoryName = require(path.join(
   __dirname,
   "..",
   "utils",
   "pluginDirectoryName"
));
var pluginNew = require(path.join(__dirname, "pluginNew"));

var Options = {};
var STATE_FILE = ".plugin-bundle.json";

var Command = new utils.Resource({
   command: "pluginBundleIncluded",
   params: "",
   descriptionShort:
      "bundle platform included views into a developer/plugins plugin.",
   descriptionLong: `
`,
});

module.exports = Command;

Command.help = function () {
   console.log(`

  usage: $ appbuilder plugin bundle [name] [options]

  Bundle view plugins from ab_platform_web/.../plugins/included/ into
  developer/plugins/<pluginDir>/ for serving via /assets/ab_plugins.

  Safe to run multiple times — syncs new/changed files and regenerates web.js.

  Options:
    [name]              Plugin display name (required on first create).
    --plugin-dir <dir>  Target existing bundle plugin directory name.
    --views <list>      Comma-separated view_* dirs to include (default: all).
    --prune             Remove web/properties subdirs no longer in included/.

  examples:

    $ appbuilder plugin bundle "Platform Included"
    $ appbuilder plugin bundle --plugin-dir ab_plugin_platform_included
    $ appbuilder plugin bundle --views view_tab,view_list

`);
};

Command.run = async function (options) {
   for (var o in options) {
      Options[o] = options[o];
   }

   Options.name = Options._.shift();
   Options.pluginDirFlag = Options["plugin-dir"];
   Options.viewFilter = parseViewFilter(Options.views);
   Options.prune = !!Options.prune;

   await checkDependencies();
   await runBundle();
};

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

function parseViewFilter(views) {
   if (!views || typeof views !== "string") {
      return null;
   }
   return views
      .split(",")
      .map((v) => v.trim())
      .filter((v) => v.length);
}

function toPluginKeyFromDir(pluginDirName) {
   return pluginDirName.replace(/^ab_plugin_/, "");
}

function findBundleStateFiles(pluginsDir) {
   var found = [];
   if (!fs.existsSync(pluginsDir)) {
      return found;
   }
   var entries = fs.readdirSync(pluginsDir);
   for (var i = 0; i < entries.length; i++) {
      var entry = entries[i];
      var entryPath = path.join(pluginsDir, entry);
      if (!fs.statSync(entryPath).isDirectory()) {
         continue;
      }
      var statePath = path.join(entryPath, STATE_FILE);
      if (fs.existsSync(statePath)) {
         try {
            var state = JSON.parse(fs.readFileSync(statePath, "utf8"));
            found.push({
               pluginDirName: entry,
               pluginDir: entryPath,
               state: state,
            });
         } catch (e) {
            // ignore invalid state
         }
      }
   }
   return found;
}

async function resolvePluginDir(runtimePaths) {
   var pluginsDir = runtimePaths.pluginsDir;

   if (Options.pluginDirFlag) {
      Options.pluginDirName = Options.pluginDirFlag;
      Options.pluginDir = path.join(pluginsDir, Options.pluginDirName);
      if (!fs.existsSync(Options.pluginDir)) {
         if (!Options.name) {
            throw new Error(
               `Plugin directory developer/plugins/${Options.pluginDirName} does not exist. Provide [name] to create it.`
            );
         }
         return "create";
      }
      loadStateFromDir();
      return "update";
   }

   var bundles = findBundleStateFiles(pluginsDir);
   if (!Options.name && bundles.length === 1) {
      Options.pluginDirName = bundles[0].pluginDirName;
      Options.pluginDir = bundles[0].pluginDir;
      Options.name =
         bundles[0].state.pluginNameDisplay || bundles[0].state.pluginName;
      applyState(bundles[0].state);
      return "update";
   }

   if (!Options.name && bundles.length > 1) {
      var answer = await inquirer.prompt([
         {
            name: "selected",
            type: "list",
            message: "Select bundle plugin to update:",
            choices: bundles.map((b) => ({
               name: `${b.pluginDirName} (${
                  b.state.pluginNameDisplay || b.state.pluginName
               })`,
               value: b.pluginDirName,
            })),
         },
      ]);
      var selected = bundles.find((b) => b.pluginDirName === answer.selected);
      Options.pluginDirName = selected.pluginDirName;
      Options.pluginDir = selected.pluginDir;
      Options.name =
         selected.state.pluginNameDisplay || selected.state.pluginName;
      applyState(selected.state);
      return "update";
   }

   if (!Options.name) {
      Options.name = "Platform Included Views";
   }

   Options.pluginDirName = pluginDirectoryName.resolveBundlePluginDirName(
      Options.name
   );
   Options.pluginDir = path.join(pluginsDir, Options.pluginDirName);

   if (fs.existsSync(Options.pluginDir)) {
      loadStateFromDir();
      return "update";
   }

   return "create";
}

function loadStateFromDir() {
   var statePath = path.join(Options.pluginDir, STATE_FILE);
   if (fs.existsSync(statePath)) {
      var state = JSON.parse(fs.readFileSync(statePath, "utf8"));
      Options._prevViewDirs = state.viewDirs || [];
      applyState(state);
   }
}

function applyState(state) {
   if (state.pluginName) {
      Options.pluginName = state.pluginName;
   }
   if (state.pluginKey) {
      Options.pluginKey = state.pluginKey;
   }
   if (state.pluginNameDisplay) {
      Options.pluginNameDisplay = state.pluginNameDisplay;
   }
}

function prepareTemplateOptions() {
   if (!Options.pluginDirName) {
      Options.pluginDirName = pluginDirectoryName.resolveBundlePluginDirName(
         Options.name
      );
   }

   var nameBase = Options.pluginDirName.replace(/^ab_plugin_/, "");
   Options.pluginName = pluginDirectoryName.toPluginNamePascal(
      nameBase.replace(/_/g, " ")
   );
   Options.pluginKey = toPluginKeyFromDir(Options.pluginDirName);
   Options.bundleOutputPrefix = pluginDirectoryName.bundleOutputPrefix(
      Options.pluginName
   );
   Options.pluginNameDisplay = Options.name;
   Options.description =
      Options.description || "Bundled platform included view plugins";
   Options.author = Options.author || "AppBuilder Developer";
   Options.icon = Options.icon || "fa-puzzle-piece";
}

/**
 * Create plugin directory via pluginNew.createPlugin(), then apply bundle webpack.
 * @param {string} pluginsDir
 * @param {boolean} hasProperties
 * @returns {Promise}
 */
async function scaffoldPlugin(pluginsDir, hasProperties) {
   prepareTemplateOptions();

   console.log("... creating plugin via plugin new");

   var created = await pluginNew.createPlugin({
      name: Options.name,
      pluginDirName: Options.pluginDirName,
      pluginsDir: pluginsDir,
      description: Options.description,
      author: Options.author,
      icon: Options.icon,
      skipQuestions: true,
      pluginName: Options.pluginName,
      pluginKey: Options.pluginKey,
      pluginNameDisplay: Options.pluginNameDisplay,
   });

   Options.pluginDir = created.pluginDir;
   Options.pluginDirName = created.pluginDirName;
   Options.pluginName = created.pluginName;
   Options.pluginKey = created.pluginKey;

   await rewriteWebpackConfigs(hasProperties);
}

function listJsFiles(dir) {
   if (!fs.existsSync(dir)) {
      return [];
   }
   return fs
      .readdirSync(dir)
      .filter(
         (f) => f.endsWith(".js") && fs.statSync(path.join(dir, f)).isFile()
      )
      .sort();
}

/**
 * Pick the main view module for web.js (e.g. FNAbviewcsvimporter.js).
 * Helpers like CSVImporter.js or pdfjs.js are not registered as views.
 *
 * @param {string[]} files
 * @returns {string|null}
 */
function primaryWebFile(files) {
   var fnViews = files.filter(function (f) {
      return /^FN/i.test(f) && f.indexOf("Component") === -1;
   });
   if (fnViews.length) {
      return fnViews[0];
   }

   var nonComponent = files.filter(function (f) {
      return f.indexOf("Component") === -1;
   });
   if (nonComponent.length) {
      return nonComponent[0];
   }

   return files[0] || null;
}

function moduleNameFromFile(file) {
   return file.replace(/\.js$/, "");
}

function regenerateWebJs() {
   var webRoot = path.join(Options.pluginDir, "web");
   var viewDirs = listViewDirsInPlugin(webRoot);
   var lines = [];
   var registrations = [];

   for (var i = 0; i < viewDirs.length; i++) {
      var viewDir = viewDirs[i];
      var dirPath = path.join(webRoot, viewDir);
      var files = listJsFiles(dirPath);
      var primary = primaryWebFile(files);
      if (!primary) {
         continue;
      }
      var mod = moduleNameFromFile(primary);
      lines.push(`import ${mod} from "./web/${viewDir}/${primary}";`);
      registrations.push(`      ${mod}(PluginAPI)`);
   }

   var content =
      lines.join("\n") +
      "\n\nexport default function registerWeb(PluginAPI) {\n   return [\n" +
      registrations.join(",\n") +
      "\n   ].flat();\n}\n";

   fs.writeFileSync(path.join(Options.pluginDir, "web.js"), content, "utf8");
   console.log(`... regenerated web.js (${registrations.length} views)`);
}

function listViewDirsInPlugin(subRoot) {
   if (!fs.existsSync(subRoot)) {
      return [];
   }
   return fs
      .readdirSync(subRoot)
      .filter((name) => {
         return (
            fs.statSync(path.join(subRoot, name)).isDirectory() &&
            !syncPluginFiles.isSharedViewDir(name)
         );
      })
      .sort();
}

function regeneratePropertiesJs() {
   var propsRoot = path.join(Options.pluginDir, "properties");
   var viewDirs = listViewDirsInPlugin(propsRoot);
   var lines = [];
   var registrations = [];

   for (var i = 0; i < viewDirs.length; i++) {
      var viewDir = viewDirs[i];
      var files = listJsFiles(path.join(propsRoot, viewDir));
      for (var f = 0; f < files.length; f++) {
         var file = files[f];
         var mod = moduleNameFromFile(file);
         lines.push(`import ${mod} from "./properties/${viewDir}/${file}";`);
         registrations.push(`      ${mod}(PluginAPI)`);
      }
   }

   var propsPath = path.join(Options.pluginDir, "properties.js");
   if (!registrations.length) {
      if (fs.existsSync(propsPath)) {
         fs.unlinkSync(propsPath);
         console.log("... removed properties.js (no property sources)");
      }
      return false;
   }

   var content =
      lines.join("\n") +
      "\n\nexport default function registerProperties(PluginAPI) {\n   return [\n" +
      registrations.join(",\n") +
      "\n   ];\n}\n";

   fs.writeFileSync(propsPath, content, "utf8");
   console.log(
      `... regenerated properties.js (${registrations.length} modules)`
   );
   return true;
}

function mergeManifest(hasProperties) {
   var manifestPath = path.join(Options.pluginDir, "manifest.json");
   var manifest;

   if (fs.existsSync(manifestPath)) {
      manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
   } else {
      manifest = {
         name: Options.pluginNameDisplay,
         description: Options.description,
         key: Options.pluginKey,
         version: "0.0.0",
         icon: Options.icon,
         plugins: [],
      };
   }

   manifest.name = manifest.name || Options.pluginNameDisplay;
   manifest.key = manifest.key || Options.pluginKey;
   manifest.description = manifest.description || Options.description;
   manifest.icon = manifest.icon || Options.icon;
   if (!manifest.plugins) {
      manifest.plugins = [];
   }

   var webPath = `./${Options.bundleOutputPrefix}_web.mjs`;
   var propsPath = `./${Options.bundleOutputPrefix}_properties.mjs`;

   upsertManifestEntry(manifest.plugins, {
      name: `${Options.pluginNameDisplay} Web`,
      key: `${Options.pluginKey}_web`,
      platform: "web",
      type: "view",
      path: webPath,
   });

   if (hasProperties) {
      upsertManifestEntry(manifest.plugins, {
         name: `${Options.pluginNameDisplay} Properties`,
         key: `${Options.pluginKey}_web`,
         platform: "web",
         type: "properties",
         path: propsPath,
      });
   } else {
      manifest.plugins = manifest.plugins.filter(
         (p) => !(p.platform === "web" && p.type === "properties")
      );
   }

   fs.writeFileSync(
      manifestPath,
      JSON.stringify(manifest, null, 3) + "\n",
      "utf8"
   );
   console.log("... updated manifest.json");
}

function upsertManifestEntry(plugins, entry) {
   var idx = plugins.findIndex(
      (p) => p.platform === entry.platform && p.type === entry.type
   );
   if (idx === -1) {
      plugins.push(entry);
   } else {
      plugins[idx] = Object.assign({}, plugins[idx], entry);
   }
}

function renderBundleTemplate(templateFile) {
   var fileRender = require(path.join(__dirname, "..", "utils", "fileRender"));
   var templatePath = path.join(
      utils.fileTemplatePath(),
      "pluginBundle",
      templateFile
   );
   return fileRender(templatePath, Options);
}

async function rewriteWebpackConfigs(hasProperties) {
   prepareTemplateOptions();
   Options.hasProperties = !!hasProperties;

   var files = ["webpack.common.js", "webpack.dev.js", "webpack.prod.js"];
   for (var i = 0; i < files.length; i++) {
      var webpackPath = path.join(Options.pluginDir, files[i]);
      if (!fs.existsSync(webpackPath)) {
         continue;
      }
      fs.writeFileSync(webpackPath, renderBundleTemplate(files[i]), "utf8");
      console.log(`... updated ${files[i]}`);
   }
}

/**
 * Patch legacy bundle plugins that still output to dev/ or external ab_plugins.
 */
function migrateWebpackOutputPaths() {
   var devPath = path.join(Options.pluginDir, "webpack.dev.js");
   var prodPath = path.join(Options.pluginDir, "webpack.prod.js");
   var changed = false;

   [devPath, prodPath].forEach(function (filePath) {
      if (!fs.existsSync(filePath)) {
         return;
      }
      var contents = fs.readFileSync(filePath, "utf8");
      var updated = contents;

      if (updated.indexOf('"dev"') !== -1 || updated.indexOf("'dev'") !== -1) {
         updated = updated.replace(
            /path\.join\(\s*APP\s*,\s*["']dev["']\s*\)/g,
            'path.join(APP, "dist")'
         );
      }

      if (updated.indexOf("ab_plugins") !== -1) {
         updated = updated.replace(
            /const outPath = path\.join\([\s\S]*?\);/m,
            'const outPath = path.join(APP, "dist");'
         );
      }

      if (updated !== contents) {
         fs.writeFileSync(filePath, updated, "utf8");
         changed = true;
      }
   });

   if (changed) {
      console.log("... migrated webpack output paths to dist/");
   }
}

function writeStateFile(viewDirs) {
   var state = {
      pluginDirName: Options.pluginDirName,
      pluginName: Options.pluginName,
      bundleOutputPrefix: Options.bundleOutputPrefix,
      pluginNameDisplay: Options.pluginNameDisplay,
      pluginKey: Options.pluginKey,
      lastRun: new Date().toISOString(),
      viewDirs: viewDirs,
   };
   fs.writeFileSync(
      path.join(Options.pluginDir, STATE_FILE),
      JSON.stringify(state, null, 3) + "\n",
      "utf8"
   );
}

function pruneOrphanDirs(includedViewDirs) {
   if (!Options.prune) {
      return;
   }

   var includedSet = {};
   for (var i = 0; i < includedViewDirs.length; i++) {
      includedSet[includedViewDirs[i]] = true;
   }

   ["web", "properties"].forEach((sub) => {
      var root = path.join(Options.pluginDir, sub);
      if (!fs.existsSync(root)) {
         return;
      }
      var dirs = fs.readdirSync(root);
      for (var d = 0; d < dirs.length; d++) {
         var name = dirs[d];
         var full = path.join(root, name);
         if (!fs.statSync(full).isDirectory()) {
            continue;
         }
         if (!includedSet[name]) {
            if (syncPluginFiles.isSharedViewDir(name)) {
               continue;
            }
            fs.rmSync(full, { recursive: true, force: true });
            console.log(`... pruned ${sub}/${name}`);
         }
      }
   });
}

async function runBundle() {
   var rootDir = findRuntimeRoot();
   if (!rootDir) {
      throw new Error(
         "Could not find ab_runtime root (need developer/ab_platform_web and developer/plugins). Run from your runtime directory (e.g. ~/Sites/web/ABv2)."
      );
   }

   var runtimePaths = findRuntimeRoot.paths(rootDir);
   if (!fs.existsSync(runtimePaths.includedDir)) {
      throw new Error(
         `Included plugins directory not found: ${runtimePaths.includedDir}`
      );
   }

   if (!fs.existsSync(runtimePaths.designerPluginsDir)) {
      console.log(
         "... warning: ABDesigner src/plugins not found; bundling web views only"
      );
   }

   var mode = await resolvePluginDir(runtimePaths);
   Options.pluginsDir = runtimePaths.pluginsDir;
   prepareTemplateOptions();

   var allIncludedViews = syncPluginFiles.discoverViewDirs(
      runtimePaths.includedDir,
      null
   );
   var viewDirs = syncPluginFiles.discoverViewDirs(
      runtimePaths.includedDir,
      Options.viewFilter
   );

   if (!viewDirs.length) {
      throw new Error("No view_* directories found to bundle.");
   }

   var totals = { added: 0, updated: 0, unchanged: 0 };

   // Pre-scan for properties to scaffold webpack correctly on create
   var hasDesignerSources = false;
   for (var v = 0; v < viewDirs.length; v++) {
      let designerDir = path.join(
         runtimePaths.designerPluginsDir,
         `web_${viewDirs[v]}`
      );
      if (fs.existsSync(designerDir)) {
         hasDesignerSources = true;
         break;
      }
   }

   if (mode === "create") {
      await scaffoldPlugin(runtimePaths.pluginsDir, hasDesignerSources);
   }

   console.log(`... bundling ${viewDirs.length} view(s)`);

   for (var i = 0; i < viewDirs.length; i++) {
      var viewDir = viewDirs[i];
      var webDest = path.join(Options.pluginDir, "web", viewDir);
      var webStats = syncPluginFiles.syncDir(
         path.join(runtimePaths.includedDir, viewDir),
         webDest
      );
      totals.added += webStats.added;
      totals.updated += webStats.updated;
      totals.unchanged += webStats.unchanged;
      logSync(`web/${viewDir}`, webStats);

      let designerDir = path.join(
         runtimePaths.designerPluginsDir,
         `web_${viewDir}`
      );
      if (fs.existsSync(designerDir)) {
         var propDest = path.join(Options.pluginDir, "properties", viewDir);
         var propStats = syncPluginFiles.syncDir(designerDir, propDest);
         totals.added += propStats.added;
         totals.updated += propStats.updated;
         totals.unchanged += propStats.unchanged;
         logSync(`properties/${viewDir}`, propStats);

         var designerResult = pluginBundleIndex.unlinkIndexFile(
            runtimePaths.designerIndex,
            `web_${viewDir}`
         );
         if (designerResult.changed) {
            console.log(
               `... unlinked web_${viewDir} from ABDesigner/src/plugins/index.js`
            );
         }
      } else {
         console.log(
            `... no ABDesigner properties for ${viewDir}, skipping properties`
         );
      }

      var includedResult = pluginBundleIndex.unlinkIndexFile(
         runtimePaths.includedIndex,
         viewDir
      );
      if (includedResult.changed) {
         console.log(`... unlinked ${viewDir} from included/index.js`);
      }
   }

   var sharedViewDirs = syncPluginFiles.discoverSharedViewDirs(
      runtimePaths.includedDir
   );
   for (var s = 0; s < sharedViewDirs.length; s++) {
      var sharedDir = sharedViewDirs[s];
      var sharedDest = path.join(Options.pluginDir, "web", sharedDir);
      var sharedStats = syncPluginFiles.syncDir(
         path.join(runtimePaths.includedDir, sharedDir),
         sharedDest
      );
      totals.added += sharedStats.added;
      totals.updated += sharedStats.updated;
      totals.unchanged += sharedStats.unchanged;
      logSync(`web/${sharedDir} (shared)`, sharedStats);
   }

   pruneOrphanDirs(allIncludedViews);

   regenerateWebJs();
   var hasProperties = regeneratePropertiesJs();
   mergeManifest(hasProperties);

   if (mode === "update") {
      migrateWebpackOutputPaths();
      await rewriteWebpackConfigs(hasProperties);
   }

   writeStateFile(viewDirs);

   var prevViews = Options._prevViewDirs || [];
   var newViews = viewDirs.filter((d) => prevViews.indexOf(d) === -1);

   console.log(`
... sync complete for developer/plugins/${Options.pluginDirName}
    files added: ${totals.added}, updated: ${totals.updated}, unchanged: ${
      totals.unchanged
   }
${newViews.length ? `    new views this run: ${newViews.join(", ")}\n` : ""}
    next steps:
      cd developer/plugins/${Options.pluginDirName}
      npm install
      npm run build:dev   # outputs to ./dist/
      # register tenant plugin path: /${Options.pluginDirName}
      # compiled: dist/${Options.bundleOutputPrefix}_web.mjs
`);
}

function logSync(label, stats) {
   if (stats.added || stats.updated) {
      console.log(
         `... ${label}: +${stats.added} added, ~${stats.updated} updated, ${stats.unchanged} unchanged`
      );
   }
}
