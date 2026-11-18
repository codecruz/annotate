---
description: Open an annotation session on your locally running site
argument-hint: "[url or port of the local site]"
---

# annotate start

Open an annotation session by following section 1 ("Open a session") of the
`annotate` skill.

The proxy script is `"${CLAUDE_PLUGIN_ROOT}/skills/annotate/server.mjs"`.

Site to annotate: `$ARGUMENTS`

- A port (`4321`) means `http://localhost:4321`.
- Empty: find the local server this project is already running, or start it
  the way the project does. If you cannot tell which one it is, ask.

End by giving the user the address to open and the short how-to, then wait.
