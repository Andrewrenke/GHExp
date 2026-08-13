const {compilerOptions} = require('./tsconfig.json');

// Single source of truth for module aliases: tsconfig.json `paths`.
//
// The alias used to be spelled out independently in tsconfig.json,
// babel.config.js and jest.config.js. Three hand-maintained copies means
// adding a second alias silently works in the editor, fails at runtime, or
// fails only in tests — depending on which copy you forgot. Both consumers now
// derive their own format from the TypeScript declaration.
const entries = Object.entries(compilerOptions.paths ?? {});

const stripGlob = value => value.replace(/\/\*$/, '').replace(/^\.\//, '');

// '@/*': ['./src/*']  ->  {'@': './src'}   (babel-plugin-module-resolver)
const babelAlias = Object.fromEntries(
  entries.map(([alias, [target]]) => [alias.replace(/\/\*$/, ''), `./${stripGlob(target)}`]),
);

// '@/*': ['./src/*']  ->  {'^@/(.*)$': '<rootDir>/src/$1'}   (jest)
const jestModuleNameMapper = Object.fromEntries(
  entries.map(([alias, [target]]) => [
    `^${alias.replace(/\/\*$/, '')}/(.*)$`,
    `<rootDir>/${stripGlob(target)}/$1`,
  ]),
);

module.exports = {babelAlias, jestModuleNameMapper};
