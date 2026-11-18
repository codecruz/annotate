#!/usr/bin/env node
// Blocks until "Send to Claude" is pressed on the annotated page, then prints
// "apply". An assistant runs it in the background and is woken by its exit.
// usage: node wait.mjs [proxy port, 4400 by default]
import { get } from "node:http";

// node:http, not fetch: fetch gives up after five minutes without a response.
get(`http://127.0.0.1:${process.argv[2] ?? 4400}/__annotate/wait`, (res) => {
  process.exitCode = res.statusCode === 200 ? 0 : 1;
  res.pipe(process.stdout);
}).once("error", (error) => {
  // Also how it ends when the session is closed: the proxy drops the wait.
  console.error(`annotate: ${error.message}`);
  process.exitCode = 1;
});
