//   ╔═╗╔═╗╦  ╦╔╗╔╔╦╗┬─┐┌─┐
//   ║╣ ╚═╗║  ║║║║ ║ ├┬┘│
//  o╚═╝╚═╝╩═╝╩╝╚╝ ╩ ┴└─└─┘
// A set of basic code conventions designed to encourage quality and consistency
// across your app's code base.  These rules are checked against automatically
// any time you run `npm test`.
//
// > Note: If you're using mocha, you'll want to add an extra override file to your
// > `test/` folder so that eslint will tolerate mocha-specific globals like `before`
// > and `describe`.
// Designed for ESLint v4.
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
module.exports = {
   env: {
      node: true,
      es6: true,
   },

   globals: {
      // io: true,
      $$: true,
      webix: true,
      window: true,
   },

   parserOptions: {
      ecmaVersion: 2020,
      sourceType: "module",
   },

   root: true,

   // extending recommended config and config derived from eslint-config-prettier
   extends: ["eslint:recommended", "prettier"],

   // activating eslint-plugin-prettier (--fix stuff)
   plugins: ["prettier"],

   rules: {
      // customizing prettier rules (unfortunately not many of them are customizable)
      "prettier/prettier": [
         "error",
         {
            arrowParens: "always",
            endOfLine: "lf",
            printWidth: 80,
            tabWidth: 3,
         },
      ],

      // eslint rule customization here:
      "no-console": 0, // allow console.log() in our services
   },
};
