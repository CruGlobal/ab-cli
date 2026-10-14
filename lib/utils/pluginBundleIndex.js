/**
 * Idempotently unlink plugin imports from an index.js file.
 */
var fs = require("fs");

/**
 * @param {string} content
 * @param {string} pathFragment
 * @returns {{ content: string, identifiers: string[] }}
 */
function commentImportsForPath(content, pathFragment) {
   var escaped = pathFragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
   var identifiers = [];
   var lines = content.split("\n");
   var changed = false;

   for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (line.trim().indexOf("//") === 0) {
         continue;
      }
      var importMatch = line.match(
         new RegExp(
            `^import\\s+(\\w+)\\s+from\\s+["'][^"']*${escaped}[^"']*["']\\s*;\\s*$`
         )
      );
      if (importMatch) {
         identifiers.push(importMatch[1]);
         lines[i] = "// " + line;
         changed = true;
      }
   }

   return {
      content: changed ? lines.join("\n") : content,
      identifiers: identifiers,
   };
}

/**
 * @param {string} content
 * @param {string[]} identifiers
 * @returns {string}
 */
function removeFromAllPluginsArray(content, identifiers) {
   if (!identifiers.length) {
      return content;
   }

   var arrayMatch = content.match(
      /(const\s+AllPlugins\s*=\s*\[)([\s\S]*?)(\];)/
   );
   if (!arrayMatch) {
      return content;
   }

   var body = arrayMatch[2];
   for (var i = 0; i < identifiers.length; i++) {
      var id = identifiers[i];
      body = body.replace(new RegExp("\\s*" + id + "\\s*,", "g"), "");
      body = body.replace(new RegExp(",\\s*" + id + "\\b", "g"), "");
      body = body.replace(new RegExp("^\\s*" + id + "\\s*,?", "gm"), "");
   }

   return content.replace(arrayMatch[0], arrayMatch[1] + body + arrayMatch[3]);
}

/**
 * @param {string} indexPath
 * @param {string} pathFragment
 * @returns {{ changed: boolean, identifiers: string[] }}
 */
function unlinkIndexFile(indexPath, pathFragment) {
   if (!fs.existsSync(indexPath)) {
      return { changed: false, identifiers: [] };
   }

   var original = fs.readFileSync(indexPath, "utf8");
   var result = commentImportsForPath(original, pathFragment);
   result.content = removeFromAllPluginsArray(
      result.content,
      result.identifiers
   );

   var changed = result.content !== original;
   if (changed) {
      fs.writeFileSync(indexPath, result.content, "utf8");
   }

   return { changed: changed, identifiers: result.identifiers };
}

module.exports = {
   unlinkIndexFile: unlinkIndexFile,
};
