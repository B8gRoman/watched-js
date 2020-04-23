import * as path from "path";

/**
 * now.sh -> vercel.com
 */
const handler = `const { createApp } = require("@watchedcom/sdk");

const supportedCacheTypes = ['MONGO_CACHE', 'REDIS_CACHE'];

if (!supportedCacheTypes.some(_ => process.env[_])) {
    throw new Error(\`Cache is not configured. Supported cache types: $\{supportedCacheTypes.join(', ')\}\`)
}

module.exports = createApp(Object.values(require("./")));
`;

export const templateMap = {
  "package.json": async () => {
    const packageJson = require(path.resolve(process.cwd(), "package.json"));

    packageJson.scripts = packageJson.scripts || {};

    Object.assign(packageJson.scripts, {
      "now-build": "npm run build",
    });

    return JSON.stringify(packageJson, null, 2);
  },
  ".nowignore": ["dist"].join("\n"),
  ".now.js": handler,
  "now.json": JSON.stringify(
    {
      builds: [
        {
          src: ".now.js",
          use: "@now/node",
        },
      ],
      routes: [
        {
          src: ".*",
          dest: ".now.js",
        },
      ],
    },
    null,
    2
  ),
};
