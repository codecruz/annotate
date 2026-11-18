#!/usr/bin/env node
// Annotation proxy: serves a local site through itself, injects the overlay
// (client.js) into every HTML page and stores the notes in a JSON file.
// usage: node server.mjs --proxy http://localhost:4321 [--port 4400] [--out .annotations.json] [--open]
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith("--") ? [...acc, [a.slice(2), all[i + 1]]] : acc), []),
);
const upstream = (args.proxy ?? "").replace(/\/$/, "");
if (!/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(upstream)) {
  console.error("usage: node server.mjs --proxy http://localhost:<port> [--port 4400] [--out .annotations.json] [--open]");
  process.exit(1);
}
const port = Number(args.port ?? 4400);
const out = resolve(args.out ?? ".annotations.json");
const client = new URL("./client.js", import.meta.url);
const MAX_BODY = 1_000_000;
// "Send to Claude": wait.mjs holds a request open here until the button is pressed.
const waiters = new Set();
let queued = false; // pressed while nothing was waiting: the next wait returns at once
const apply = (res) => res.writeHead(200, { "content-type": "text/plain; charset=utf-8" }).end("apply\n");

const readNotes = async () => {
  try {
    return JSON.parse(await readFile(out, "utf8")).notes ?? [];
  } catch {
    return [];
  }
};

const body = async (req) => {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) throw new Error("body too large");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
};

// Notes become instructions for an AI, so only this page may write them: a
// request must name this server as its host (blocks DNS rebinding) and a
// write must come from a page it served (blocks other sites posting notes).
const hosts = new Set([`localhost:${port}`, `127.0.0.1:${port}`]);
const trusted = (req) =>
  hosts.has(req.headers.host) && (req.method !== "POST" || req.headers.origin === `http://${req.headers.host}`);

createServer(async (req, res) => {
  try {
    if (!trusted(req)) {
      res.writeHead(403, { "content-type": "text/plain; charset=utf-8" });
      return res.end("annotate: request refused");
    }
    if (req.url === "/__annotate/client.js") {
      res.writeHead(200, { "content-type": "text/javascript; charset=utf-8", "cache-control": "no-store" });
      return res.end(await readFile(client));
    }
    if (req.url === "/__annotate/notes") {
      if (req.method === "POST") {
        const notes = JSON.parse((await body(req)).toString("utf8"));
        if (!Array.isArray(notes)) throw new Error("expected an array of notes");
        await writeFile(out, JSON.stringify({ site: upstream, notes }, null, 2) + "\n");
      }
      res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" });
      return res.end(JSON.stringify(await readNotes()));
    }
    if (req.url === "/__annotate/wait") {
      if (queued) return (queued = false), apply(res);
      waiters.add(res);
      return res.once("close", () => waiters.delete(res));
    }
    if (req.url === "/__annotate/send" && req.method === "POST") {
      const listening = waiters.size > 0;
      queued = !listening;
      waiters.forEach(apply);
      res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" });
      return res.end(JSON.stringify({ listening }));
    }

    const headers = { ...req.headers, host: new URL(upstream).host, "accept-encoding": "identity" };
    delete headers.connection;
    const hasBody = !["GET", "HEAD"].includes(req.method);
    const up = await fetch(upstream + req.url, {
      method: req.method,
      headers,
      body: hasBody ? await body(req) : undefined,
      redirect: "manual",
    });
    const type = up.headers.get("content-type") ?? "";
    const outHeaders = { "cache-control": "no-store" };
    if (type) outHeaders["content-type"] = type;
    const location = up.headers.get("location");
    if (location) outHeaders.location = location.replace(upstream, "");
    let payload = Buffer.from(await up.arrayBuffer());
    if (type.includes("text/html")) {
      const tag = '<script src="/__annotate/client.js" defer></script>';
      const html = payload.toString("utf8");
      payload = Buffer.from(html.includes("</body>") ? html.replace("</body>", `${tag}</body>`) : html + tag);
    }
    res.writeHead(up.status, outHeaders);
    res.end(payload);
  } catch (error) {
    res.writeHead(502, { "content-type": "text/plain; charset=utf-8" });
    res.end(`annotate: ${error.message}`);
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`annotate: http://localhost:${port} -> ${upstream}`);
  console.log(`notes: ${out}`);
  if ("open" in args) {
    // The OS opener, not a browser binary: it is what raises the browser window to the foreground.
    const [cmd, ...pre] = { darwin: ["open"], win32: ["cmd", "/c", "start", ""] }[process.platform] ?? ["xdg-open"];
    spawn(cmd, [...pre, `http://localhost:${port}/`], { stdio: "ignore", detached: true })
      .on("error", () => {}) // no opener (headless, SSH): the URL is printed above
      .unref();
  }
});
