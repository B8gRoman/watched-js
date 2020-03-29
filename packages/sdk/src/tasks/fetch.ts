import { TaskFetchRequest, TaskFetchResponse } from "@watchedcom/schema";
import { CacheHandler } from "../cache";
import { Responder, sendTask } from "./utils";

export type FetchFn = (
  url: TaskFetchRequest["url"],
  params?: TaskFetchRequest["params"],
  timeout?: number
) => Promise<TunnelResponse>;

class TunnelResponse {
  constructor(private r: TaskFetchResponse) {}

  get error() {
    return this.r.error;
  }

  get status() {
    return this.r.status;
  }

  get url() {
    return this.r.url;
  }

  get ok() {
    const status = this.r.status;
    return status >= 200 && status < 300;
  }

  get headers() {
    return this.r.headers;
  }

  async json<T = any>(): Promise<T> {
    if (this.r.json) return <T>this.r.json; // LEGACY
    try {
      const parsedData = JSON.parse(await this.text());
      return parsedData;
    } catch (err) {
      throw new Error(
        `Invalid response body while trying to fetch ${this.url}: ${err.message}`
      );
    }
  }

  async text(): Promise<string> {
    if (this.r.text) return this.r.text;
    if (this.r.data) return Buffer.from(this.r.data, "base64").toString();
    throw new Error("No text or data in task response");
  }

  async data() {
    if (this.r.data) return Buffer.from(this.r.data, "base64");
    return Buffer.from(<string>this.r.text, "ascii");
  }
}

// export const dummyFetch: FetchFn = async (url, params) => {
//     const response: TaskFetchResponse = {
//         type: "fetchResponse",
//         id: "",
//         status: 0
//     };
//     try {
//         const res = await fetch(url, params);
//         response.status = res.status;
//         response.url = res.url;
//         response.headers = res.headers;

//         const ct = String(res.headers.get("content-type")).toLowerCase();
//         if (ct.indexOf("application/json") >= 0) {
//             response.json = await res.json();
//         } else if (ct.indexOf("text/") === 0) {
//             response.text = await res.text();
//         } else {
//             throw new Error(
//                 "Dummy fetch return values with binary type is not implemented"
//             );
//         }
//     } catch (error) {
//         response.error = error.message;
//     }
//     return new TunnelResponse(response);
// };

export const createTaskFetch = (responder: Responder, cache: CacheHandler) => {
  const fetch: FetchFn = async (url, params, timeout = 30 * 1000) => {
    const task: TaskFetchRequest = {
      type: "fetch",
      url,
      params
    };
    const response = <TaskFetchResponse>(
      await sendTask(responder, cache, task, timeout)
    );

    // Return fetch response
    const res = new TunnelResponse(response);
    if (res.status === 0) throw new Error(res.error);
    return res;
  };
  return fetch;
};
