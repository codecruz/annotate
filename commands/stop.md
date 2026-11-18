---
description: Close the annotation session
---

# annotate stop

Stop the annotation proxy you started in this session (the background
`server.mjs` process). Leave the site's own server running and keep
`.annotations.json`: open notes stay there for the next session.

The background `wait.mjs` ends by itself when the proxy stops: ignore its
exit.

If no proxy is running, say so.
