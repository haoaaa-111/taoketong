// eslint-disable-next-line @typescript-eslint/no-require-imports
const jestDom = require('@testing-library/jest-dom');
Object.keys(jestDom).forEach(key => {
    Object.defineProperty(expect, key, { value: jestDom[key] });
});
