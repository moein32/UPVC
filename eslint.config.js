import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";

export default [
  {
    ignores: ["dist/**", "vendor/**"],
  },
  {files: ["**/*.{js,mjs,cjs,ts,tsx}"], languageOptions: { globals: globals.browser, parserOptions: { ecmaVersion: "latest", sourceType: "module" } }},
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["electron-main.js"],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.commonjs,
      },
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "no-undef": "off",
    },
  },
];
