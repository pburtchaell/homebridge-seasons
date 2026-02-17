const eslint = require("@eslint/js");

module.exports = [
  { ignores: ["dist/**", "node_modules/**"] },
  eslint.configs.recommended,
  {
    languageOptions: { ecmaVersion: 2022, sourceType: "commonjs" },
    rules: {
      quotes: ["error", "double"],
      indent: ["error", 2, { SwitchCase: 1 }],
      "linebreak-style": ["error", "unix"],
      semi: ["error", "always"],
      "comma-dangle": ["error", "always-multiline"],
      curly: ["error", "all"],
      eqeqeq: ["error", "smart"],
      "dot-notation": "error",
      "prefer-arrow-callback": "warn",
      "max-len": ["warn", 120],
      "no-unused-vars": ["error", { caughtErrors: "none" }],
    },
  },
  {
    files: ["test/**/*.js"],
    languageOptions: {
      globals: {
        describe: "readonly",
        it: "readonly",
        expect: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
        vi: "readonly",
      },
    },
  },
];
