import { replayRequests } from "@watchedcom/sdk";
import { testAddon } from "@watchedcom/test";
import { addonRepoExample } from "./repoExample";
import { addonWorkerExample } from "./workerExample";

test(`Test addon "${addonWorkerExample.getId()}"`, done => {
  testAddon(addonWorkerExample)
    .then(done)
    .catch(done);
});

test(`Test addon "${addonRepoExample.getId()}"`, done => {
  testAddon(addonRepoExample)
    .then(done)
    .catch(done);
});

test(`Replay recorded actions`, done => {
  replayRequests([addonRepoExample, addonWorkerExample], "src/index")
    .then(done)
    .catch(done);
});
