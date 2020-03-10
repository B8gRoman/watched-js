import {
  AddonRequest,
  createApp,
  DirectoryRequest,
  ItemRequest,
  SourceRequest
} from "@watchedcom/sdk";
import * as request from "supertest";
import {
  EXAMPLE_ITEMS,
  EXAMPLE_SOURCES,
  EXAMPLE_SUBTITLES
} from "./exampleData";
import { addonWorkerExample } from "./workerExample";

const requestEnd = (done: (err?: Error) => void, log: boolean = false) => (
  err: Error,
  res?: request.Response
) => {
  if (log) console.warn(res?.status, res?.header, res?.text);
  done(err);
};

const defaults = {
  sig: "mock",
  language: "en",
  region: "UK"
};

const itemDefaults = {
  ...defaults,
  type: "movie",
  ids: {
    id: "elephant",
    "watched-worker-example": "elephant"
  },
  name: "Elephants Dream",
  episode: {}
};

const app = request(createApp([addonWorkerExample]));

test("action addon", async done => {
  app
    .post(`/${addonWorkerExample.getId()}/addon.watched`)
    .send(<AddonRequest>{ ...defaults })
    .expect(200, addonWorkerExample.getProps())
    .end(requestEnd(done));
});

test("action directory", async done => {
  app
    .post(`/${addonWorkerExample.getId()}/directory.watched`)
    .send(<DirectoryRequest>{
      ...defaults,
      id: ""
    })
    .expect(200, { items: EXAMPLE_ITEMS, hasMore: false })
    .end(requestEnd(done));
});

test("action item", async done => {
  app
    .post(`/${addonWorkerExample.getId()}/item.watched`)
    .send(<ItemRequest>itemDefaults)
    .expect(
      200,
      EXAMPLE_ITEMS.find(i => i.ids["watched-worker-example"] === "elephant")
    )
    .end(requestEnd(done));
});

test("action source", async done => {
  app
    .post(`/${addonWorkerExample.getId()}/source.watched`)
    .send(<SourceRequest>itemDefaults)
    .expect(200, EXAMPLE_SOURCES.elephant)
    .end(requestEnd(done));
});

test("action subtitle", async done => {
  app
    .post(`/${addonWorkerExample.getId()}/subtitle.watched`)
    .send(<SourceRequest>itemDefaults)
    .expect(200, EXAMPLE_SUBTITLES.elephant)
    .end(requestEnd(done));
});

test("action subtitle (cached response)", async done => {
  app
    .post(`/${addonWorkerExample.getId()}/subtitle.watched`)
    .send(<SourceRequest>itemDefaults)
    .expect(200, EXAMPLE_SUBTITLES.elephant)
    .end(requestEnd(done));
});
