const path = require("path");

module.exports = {
  preset: "node",
  testEnvironment: "node",
  setupFilesAfterEnv: [path.join(__dirname, "setup-ts.js")]
};
