import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, test } from "node:test";

const PORT = 4471;
const base = `http://localhost:${PORT}`;
let upstream, proxy, out;

before(async () => {
  upstream = createServer((req, res) => {
    if (req.url === "/data.json") return res.writeHead(200, { "content-type": "application/json" }).end('{"ok":true}');
    res.writeHead(200, { "content-type": "text/html" }).end("<html><body><h1>Hi</h1></body></html>");
  });
  await new Promise((done) => upstream.listen(0, "127.0.0.1", done));
  out = join(await mkdtemp(join(tmpdir(), "annotate-")), "notes.json");
  proxy = spawn("node", [
    new URL("../skills/annotate/server.mjs", import.meta.url).pathname,
    "--proxy", `http://localhost:${upstream.address().port}`, "--port", String(PORT), "--out", out,
  ]);
  await new Promise((done) => proxy.stdout.once("data", done));
});

after(() => {
  proxy.kill();
  upstream.close();
});

test("injects the overlay into HTML and leaves other responses alone", async () => {
  assert.match(await (await fetch(`${base}/`)).text(), /<script src="\/__annotate\/client\.js" defer><\/script><\/body>/);
  assert.equal(await (await fetch(`${base}/data.json`)).text(), '{"ok":true}');
  assert.equal((await fetch(`${base}/__annotate/client.js`)).status, 200);
});

test("stores the notes it is sent and serves them back", async () => {
  const notes = [{ id: "a", path: "/", selector: "body > h1", note: "bigger" }];
  await fetch(`${base}/__annotate/notes`, { method: "POST", body: JSON.stringify(notes) });
  assert.deepEqual(await (await fetch(`${base}/__annotate/notes`)).json(), notes);
  assert.deepEqual(JSON.parse(await readFile(out, "utf8")).notes, notes);
});

test("refuses to proxy anything that is not localhost", async () => {
  const child = spawn("node", [new URL("../skills/annotate/server.mjs", import.meta.url).pathname, "--proxy", "https://example.com"]);
  assert.equal(await new Promise((done) => child.once("exit", done)), 1);
});
