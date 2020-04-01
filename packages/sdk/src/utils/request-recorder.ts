import { createWriteStream, WriteStream } from "fs";
import _ = require("lodash");
import * as path from "path";
import * as util from "util";
import { BasicAddonClass } from "../addons";
import { createApp } from "../server";

export type RecordData = {
  id: number;
  addon: string;
  action: string;
  input: any;
  statusCode: number;
  output: any;
};

const inspect = data =>
  util.inspect(data, {
    compact: false,
    depth: null
  });

const getFile = (recordPath: string) => {
  if (!/\.record\.js$/.test(recordPath)) recordPath += ".record.js";
  else if (!/\.js$/.test(recordPath)) recordPath += ".js";
  return recordPath;
};

const getPath = (recordPath: string) => {
  return path.resolve(getFile(recordPath));
};

const log = (prefix: string, id: number, data: RecordData) => {
  console.warn(
    `${prefix}: id=${id}, addon=${data.addon}, action=${data.action}, statusCode=${data.statusCode}`
  );
};

export class RequestRecorder {
  public readonly path: string;
  private readonly stream: WriteStream;
  private w: (data: string) => Promise<unknown>;
  private currentId: number;

  constructor(recordPath: string) {
    this.path = getFile(recordPath);
    this.stream = createWriteStream(getPath(this.path), { flags: "w" });
    this.w = async (data: string) =>
      new Promise((resolve, reject) =>
        this.stream.write(data, (error?: Error) =>
          error ? reject(error) : resolve()
        )
      );

    this.currentId = 1;
  }

  public async write(data: RecordData) {
    const id = this.currentId++;
    let text = "";
    if (id === 1) {
      text += `module.exports = [];
module.exports.version = 1;

var currentId = 1;
function addRecord(record) {
  record.id = currentId++;
  module.exports.push(record);
};
`;
    }
    text += `
// Record ID ${id}
addRecord(${inspect(data)});
`;
    await this.w(text);
    log("Record", id, data);
  }

  public close() {
    this.stream.close();
  }
}

export const replayRequests = async (
  addons: BasicAddonClass[],
  recordPath: string,
  ids: null | number[] = null,
  silent: boolean = false
) => {
  const request = await import("supertest");
  const recordData: RecordData[] = await import(getPath(recordPath));

  const app = request(createApp(addons));
  for (const data of recordData) {
    const id = data.id ?? (<any>data).i; // LEGACY: Remove data.i
    if (ids && !ids.includes(id)) continue;
    if (!silent) log("Replay", id, data);
    await app
      .post(`/${data.addon}/${data.action}.watched`)
      .send(data.input)
      .expect(data.statusCode)
      .expect(res => {
        // Comparing of string-only JSON responses is buggy in supertest
        if (typeof data.output === "function") {
          data.output(res);
        } else if (!_.isEqual(res.body, data.output)) {
          throw new Error(
            `Expected: ${inspect(data.output)} response body, got ${inspect(
              res.body
            )}`
          );
        }
      });
  }
};
