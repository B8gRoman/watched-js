import { createHash } from "crypto";
import { CacheOptions } from "../interfaces";

export class BasicCache {
  public async exists(key: any): Promise<any> {
    throw new Error(`Not implemented`);
  }

  public async get(key: any): Promise<any> {
    throw new Error(`Not implemented`);
  }

  public async set(key: any, value: any, ttl: number) {
    throw new Error(`Not implemented`);
  }

  public async delete(key: any) {
    throw new Error(`Not implemented`);
  }

  public async cleanup() {}

  /**
   * Add cache prefixes and prevent too long cache keys.
   */
  public createKey(prefix: CacheOptions["prefix"], key: any) {
    if (typeof key === "string" && key.indexOf(":") === 0) return key;
    const str = typeof key === "string" ? key : JSON.stringify(key);
    prefix = prefix === null ? "" : `${prefix}:`;
    const hash = createHash("sha256");
    hash.update(str);
    return ":" + prefix + hash.digest().toString("base64");
  }
}
