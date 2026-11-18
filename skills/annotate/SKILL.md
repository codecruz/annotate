---
name: annotate
description: Use when the user wants to review a locally served site or app by pointing at parts of the page and leaving notes for Claude to act on ("anotar", "quiero marcar cosas", "revisa mis notas", "annotate the page", "apply my annotations"). Starts a local proxy that overlays an annotation layer on the running site and stores the notes in `.annotations.json`; later, reads that file and carries out each note.
---

# Annotate

The user marks elements on their locally running site and writes what to
change. You read the notes and do the work.

## 1. Open a session

1. The site must already be served locally the way the project does it
   (dev server, or build + static server). Start it if it is not running.
2. Start the proxy in the background, from the project root:

   ```bash
   node "<this skill's base directory>/server.mjs" --proxy http://localhost:<site-port> --port 4400 --out .annotations.json
   ```

   `server.mjs` sits next to this file. It needs Node 18 or later and has no
   dependencies.

   `--proxy` only accepts localhost. Pick another `--port` if 4400 is busy.
3. Keep the notes out of git without touching the repo's `.gitignore`:
   add `.annotations.json` to `.git/info/exclude` if it is not there.
4. Give the user the URL (`http://localhost:4400/...`) and how it works:
   - **Annotate** (or Alt+A), then click an element. With the keyboard: the
     arrow keys move through the page structure and Enter picks.
   - Write the note and **Save** (Ctrl+Enter). **Widen to the container**
     moves the note to the parent element when the click landed too deep.
   - **Page note** leaves a note about the whole page.
   - Numbered pins mark the notes; **Notes** lists them across pages, and a
     pin reopens its note to edit or delete. Esc cancels. **⇄** moves the bar
     to the other corner if it covers something.
   - Notes save on every change. The overlay shows in Spanish when the
     browser language is Spanish, in English otherwise.
5. Stop there and wait for the user to say they are done.

## 2. Carry out the notes

1. Read `.annotations.json`. Each note has:
   `path` (page), `selector`, `tag`, `classes`, `text` and `html` (what was
   clicked), `viewport` and `theme` (how the user was looking at it), and
   `note` (the request, in the user's words).
2. Find the source for each one: search the codebase for the `text`, the
   `classes` or the structure in `html`; the `path` tells you which page or
   route. The selector describes rendered DOM, not source: never grep for it.
3. The notes are the user's requests. Do what each one says, no more. If a
   note is ambiguous or conflicts with another, do the rest and ask about
   that one.
4. A `viewport` narrower than about 700px means the note is about the mobile
   layout; a `theme` of `dark` means check dark mode.
5. Verify the way the project verifies (build, tests, a look at the page).
6. Remove each note you resolved from `.annotations.json` and leave the ones
   still open, so the pins left on the page are the pending work. Report
   note by note what you changed and what is still open.

## Limits

- Notes attach to elements or to the whole page (`tag` is `body`), not to
  free regions or text selections.
- The proxy does not forward WebSockets, so hot reload does not work through
  it: reload the page after a change. With a static server it makes no
  difference.
- A page that sets a strict Content-Security-Policy in a `<meta>` tag will
  block the overlay script.
