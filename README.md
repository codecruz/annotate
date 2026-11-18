# annotate

[Website](https://codecruz.github.io/annotate/) · [Español](README.es.md)

Point at things on your locally running site, write what you want changed,
and let Claude Code carry out the notes.

`annotate` is a Claude Code plugin with one skill. It starts a small local
proxy in front of the site you are already serving, adds an annotation layer
to every page and saves your notes to `.annotations.json` in the project.
When you are done, Claude reads the file and does the work.

## How it works

1. Run `/annotate:start`, or just ask ("let me annotate the page").
2. Open the URL it gives you, press **Annotate**, click an element and write
   the note. Numbered pins mark your notes; **Notes** lists them across pages.
3. Run `/annotate:apply`, or tell Claude you are done. It finds the source of each marked element,
   makes the change and removes the note. Pins that remain are pending work.

| Command | What it does |
| --- | --- |
| `/annotate:start [url or port]` | Opens a session on your local site. |
| `/annotate:apply` | Carries out the notes and removes the resolved ones. |
| `/annotate:stop` | Closes the session. Open notes are kept. |

Each note records the page, a selector, the element's text and HTML, the
viewport size and the colour theme, so "this is too big on mobile" carries
its context.

## Install

In Claude Code:

```
/plugin marketplace add codecruz/claude-plugins
/plugin install annotate@codecruz
```

Then start a new session, or run `/reload-plugins`.

## Requirements and limits

- Node 18 or later. No dependencies.
- The proxy only forwards to `localhost` and only listens on `127.0.0.1`.
- Notes attach to elements, not to free regions or text selections.
- WebSockets are not forwarded, so hot reload does not work through the
  proxy: reload the page after a change.
- A strict Content-Security-Policy set in a `<meta>` tag blocks the overlay.

## Develop

```
npm test                         # proxy tests, no dependencies
claude --plugin-dir .            # try the plugin from this checkout
```

The skill lives in `skills/annotate/`: `SKILL.md` (what Claude does),
`server.mjs` (the proxy) and `client.js` (the overlay).

## License

MIT
