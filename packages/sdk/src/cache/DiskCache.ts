import { createHash } from "crypto";
import { promises as fsPromises } from "fs";
import * as path from "path";
import { BasicCache } from "./BasicCache";

export class DiskCache extends BasicCache {
  constructor(
    public readonly rootPath: string,
    public readonly pathSegments: number = 1,
    public readonly segmentLength: number = 2
  ) {
    super();
  }

  private getPath(key: string) {
    let p = this.rootPath;
    key = key.substring(1);
    for (let i = 0; i < this.pathSegments; i++) {
      p = path.join(
        p,
        key.substring(i * this.segmentLength, this.segmentLength)
      );
    }
    return path.join(p, key);
  }

  public async exists(key: string) {
    return (await this.get(key)) !== undefined;
  }

  public async get(key: string) {
    let data: Buffer;
    try {
      data = await fsPromises.readFile(this.getPath(key));
    } catch (error) {
      if (error.message.indexOf("ENOENT:") === -1) throw error;
      return undefined;
    }
    const d = JSON.parse(data.toString());
    if (
      !Array.isArray(d) ||
      d.length !== 2 ||
      (d[0] !== -1 && d[0] < Date.now())
    ) {
      await this.delete(key);
      return undefined;
    }
    return d[1];
  }

  public async set(key: string, value: any, ttl: number) {
    const d = [ttl === Infinity ? -1 : Date.now() + ttl, value];
    const p = this.getPath(key);
    await fsPromises.mkdir(path.dirname(p), { recursive: true });
    await fsPromises.writeFile(p, JSON.stringify(d));
  }

  public async delete(key: string) {
    try {
      await fsPromises.unlink(this.getPath(key));
    } catch (error) {
      if (error.message.indexOf("ENOENT:") === -1) throw error;
    }
  }

  public async cleanup() {
    throw new Error("Cleanup is not yet implemented");
  }
}
