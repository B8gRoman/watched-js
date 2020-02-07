import * as fs from "fs-extra";
import * as inquirer from "inquirer";
import { camelCase } from "lodash";
import * as path from "path";
import { executeProjectTemplate, templateMap } from "./templates";

export const createHandler = async (folderPath: string, cmdObj: any) => {
  const { template, force } = cmdObj;

  const addonPath = path.resolve(process.cwd(), folderPath);
  await fs.ensureDir(addonPath);

  const folderName = path.parse(addonPath).name;
  const folderFiles = await fs.readdir(addonPath);

  // Folder can be empty git repo, so we need to check only visible files
  const nonHiddenFiles = folderFiles.filter(filename => !/^\./.test(filename));

  if (nonHiddenFiles.length > 0) {
    throw new Error("Folder is not empty");
  }

  const defaultName = camelCase(folderName);

  const defaults = {
    template: template || "ts",
    name: defaultName,
    actions: ["directory", "item"],
    itemTypes: ["movie", "series"],
    requestArgs: [],
    lintConfig: true,
    test: true
  };

  const userInput = await inquirer
    .prompt(
      force
        ? []
        : [
            template
              ? null
              : {
                  type: "list",
                  choices: [
                    { name: "TypeScript", value: "ts" },
                    { name: "JavaScript", value: "js" }
                  ],
                  name: "template",
                  default: 0
                },
            {
              name: "name",
              type: "input",
              default: defaultName
            },
            {
              name: "actions",
              type: "checkbox",
              choices: ["directory", "item", "source", "subtitle", "resolve"],
              default: defaults.actions
            },
            {
              name: "itemTypes",
              type: "checkbox",
              choices: [
                // "directory",
                "movie",
                "series",
                "channel",
                "iptv"
              ],
              default: defaults.itemTypes
            },
            {
              name: "requestArgs",
              type: "checkbox",
              choices: ["imdb_id", "tmdb_id", "tvdb_id", "tvrage_id"],
              default: defaults.requestArgs,
              when: ({ actions }) => {
                for (const action of actions) {
                  if (["item", "source", "subtitle"].includes(action)) {
                    return true;
                  }
                }
                return false;
              }
            },
            {
              name: "lintConfig",
              type: "confirm",
              message: "Install linting libraries and git hooks?",
              default: defaults.lintConfig
            },
            {
              name: "test",
              type: "confirm",
              message: "Setup automatic addon tests using jest?",
              default: defaults.test
            }
          ]
    )
    .then(responses => ({ ...defaults, ...responses }));

  const projectTemplate = templateMap[userInput.template];
  if (!projectTemplate) {
    throw new Error(`${userInput.template} template not supported`);
  }

  await executeProjectTemplate(projectTemplate, addonPath, userInput);

  if (!force) console.log();
  console.log("Your addon is set up. Change to it's directory now and run");
  console.log("npm install");
  console.log("to install all needed modules.");
};
