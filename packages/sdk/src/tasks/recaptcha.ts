import {
  TaskRecaptchaRequest,
  TaskRecaptchaResponse,
} from "@watchedcom/schema";
import { CacheHandler } from "../cache";
import { IServeAddonsOptions } from "../interfaces";
import { Responder, sendTask } from "./utils";

export type RecaptchaFn = (
  data: Omit<TaskRecaptchaRequest, "type">,
  timeout?: number
) => Promise<string>;

const defaults: Partial<TaskRecaptchaRequest> = {
  version: 2,
  action: "",
};

export const createTaskRecaptcha = (
  opts: IServeAddonsOptions,
  responder: Responder,
  cache: CacheHandler
) => {
  const recaptcha: RecaptchaFn = async (data, timeout = 60 * 1000) => {
    const task = <TaskRecaptchaRequest>{
      ...defaults,
      ...data,
      type: "recaptcha",
    };
    const res = <TaskRecaptchaResponse>(
      await sendTask(opts, responder, cache, task, timeout)
    );
    return res.token;
  };
  return recaptcha;
};
