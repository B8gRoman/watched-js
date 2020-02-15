const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");

const flatten = s => {
  if (Array.isArray(s)) return s.map(flatten);
  if (!s) return s;
  if (typeof s === "object") {
    const r = {};
    for (const k of Object.keys(s)) {
      let v = s[k];
      if (k === "$ref") v = v.replace(/^[a-z0-9]+\.yaml#/, "#");

      r[k] = flatten(v);
    }
    return r;
  }
  return s;
};

const load = () => {
  let data = {};
  const p = path.join(__dirname, "..", "schema");
  const dir = fs.opendirSync(p);
  for (;;) {
    const e = dir.readSync();
    if (e === null) break;
    if (!/\.yaml$/.test(e.name)) continue;
    const n = yaml.safeLoad(fs.readFileSync(path.join(p, e.name)));
    data = {
      ...data,
      ...n,
      definitions: {
        ...data.definitions,
        ...n.definitions
      }
    };
  }
  dir.closeSync();
  return flatten(data);
};

module.exports = load();