import {
  AddonRequest,
  AddonResponse,
  DirectoryRequest,
  DirectoryResponse,
  ItemRequest,
  SourceRequest,
  SubtitleRequest,
} from "@watchedcom/schema";
import { BasicAddonClass } from "./addons";
import { ActionHandlerContext } from "./interfaces";

const sdkVersion: string = require("../package.json").version;

export type MigrationContext = {
  addon: BasicAddonClass;
  data: any;
  sig: ActionHandlerContext["sig"];
  validator: {
    request: (obj: any) => any;
    response: (obj: any) => any;
  };
};

export const migrations = {
  addon: {
    response(
      ctx: MigrationContext,
      input: AddonRequest,
      output: AddonResponse
    ) {
      output.sdkVersion = sdkVersion;
      return ctx.validator.response(output);
    },
  },
  directory: {
    request(ctx: MigrationContext, input: DirectoryRequest) {
      if (input.page !== undefined && input.cursor === undefined) {
        console.warn("Upgrading directory request from page to cursor system");
        ctx.data.update = 1;
        input.cursor = input.page === 1 ? null : input.page;
      }
      return ctx.validator.request(input);
    },
    response(
      ctx: MigrationContext,
      input: DirectoryRequest,
      output: DirectoryResponse
    ) {
      if (ctx.data.update === 1) {
        const o = <DirectoryResponse>output;
        o.hasMore = o.nextCursor !== null;
      }
      return ctx.validator.response(output);
    },
  },
  item: {
    request(ctx: MigrationContext, input: ItemRequest) {
      if (input.nameTranslations === undefined) {
        input.nameTranslations = input.translatedNames ?? {};
      }
      return ctx.validator.request(input);
    },
  },
  source: {
    request(ctx: MigrationContext, input: SourceRequest) {
      if (input.nameTranslations === undefined) {
        input.nameTranslations = input.translatedNames ?? {};
      }
      return ctx.validator.request(input);
    },
  },
  subtitle: {
    request(ctx: MigrationContext, input: SubtitleRequest) {
      if (input.nameTranslations === undefined) {
        input.nameTranslations = input.translatedNames ?? {};
      }
      return ctx.validator.request(input);
    },
  },
};
