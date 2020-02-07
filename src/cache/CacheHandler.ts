import { createHash } from "crypto";
import {
  CacheOptions,
  CacheOptionsParam,
  defaultCacheOptions,
  InlineCacheContext
} from "../interfaces";
import { BasicCache } from "./BasicCache";

// Internal error which will be raised when the `inline` function had a hit
export class CacheFoundError {
  constructor(public result: any, public error: null | Error) {}
}

const handleOptions = (options?: CacheOptionsParam) => {
  if (typeof options === "number") {
    return { ttl: options, errorTtl: options / 2 };
  }
  return options;
};

export class CacheHandler {
  public options: CacheOptions;

  constructor(private engine: BasicCache, options?: CacheOptionsParam) {
    this.options = {
      ...defaultCacheOptions,
      ...handleOptions(options)
    };
  }

  public clone(options?: CacheOptionsParam) {
    return new CacheHandler(this.engine, {
      ...this.options,
      ...handleOptions(options)
    });
  }

  public setOptions(options: CacheOptionsParam) {
    this.options = {
      ...this.options,
      ...handleOptions(options)
    };
  }

  public createKey(key: any) {
    if (typeof key === "string" && key.indexOf(":") === 0) return key;
    const data = this.options.prefix ? [this.options.prefix, key] : key;

    const str = typeof data === "string" ? data : JSON.stringify(data);
    if (str.length < 70) return str;
    const hash = createHash("sha256");
    hash.update(str);
    return ":" + hash.digest().toString("hex");
  }

  public async get(key: any): Promise<any> {
    key = this.createKey(key);
    return await this.engine.get(key);
  }

  public async set(
    key: any,
    value: any,
    ttl: CacheOptions["ttl"] | null = null
  ) {
    key = this.createKey(key);
    await this.engine.set(key, value, ttl ?? this.options.ttl);
  }

  public async setError(
    key: any,
    value: any,
    errorTtl: CacheOptions["errorTtl"] | null = null
  ) {
    if (this.options.cacheErrors) {
      key = this.createKey(key);
      await this.engine.set(key, value, errorTtl ?? this.options.errorTtl);
    }
  }

  public async delete(key: any) {
    key = this.createKey(key);
    await this.engine.delete(key);
  }

  public async cleanup() {
    await this.engine.cleanup();
  }

  // Function which will cache an async function call.
  // Depending on the options, it also will cache exceptions.
  public async call(key: any, fn: () => Promise<any>) {
    if (key === null) return await fn();

    key = this.createKey(key);

    const data = await this.get(key);
    if (data) {
      if (data.error && this.options.cacheErrors) {
        throw new Error(data.error);
      } else if (data.result) {
        return data.result;
      }
    }

    try {
      const result = await fn();
      await this.set(key, { result });
      return result;
    } catch (error) {
      await this.setError(key, { error: error.message || error });
      throw error;
    }
  }

  // This function will abort the current action handler function
  // if there is a cache hit
  public async inline(key: any) {
    key = this.createKey(key);

    const data = await this.get(key);
    if (data) {
      if (data.error && this.options.cacheErrors) {
        throw new CacheFoundError(null, new Error(data.error));
      } else if (data.result) {
        throw new CacheFoundError(data.result, null);
      }
    }

    return <InlineCacheContext>{
      set: async (result, ttl: CacheOptions["ttl"] | null = null) => {
        await this.set(key, { result }, ttl);
      },
      setError: async (
        error,
        errorTtl: CacheOptions["errorTtl"] | null = null
      ) => {
        await this.setError(key, { error: error?.message || error }, errorTtl);
      }
    };
  }

  public async waitKey(key: any, timeout = 30 * 1000, del = true, sleep = 200) {
    key = this.createKey(key);
    const t = Date.now();
    while (true) {
      const result = await this.get(key);
      if (result) {
        if (del) await this.delete(key);
        return result;
      }
      if (Date.now() - t > timeout) {
        throw new Error("Remote request timed out");
      }
      await new Promise(resolve => setTimeout(resolve, sleep));
    }
  }
}
