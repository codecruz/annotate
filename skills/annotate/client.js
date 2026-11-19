// Overlay injected by server.mjs. Pick an element (mouse, touch or keyboard),
// write a note; every change is saved through POST /__annotate/notes.
// "Send to Claude" (POST /__annotate/send) tells a waiting assistant to start.
(() => {
  if (window.__annotate) return;
  window.__annotate = true;

  const es = navigator.language.startsWith("es");
  const T = es
    ? { annotate: "Anotar", pick: "Elige un elemento", pickHelp: "Clic en un elemento, o flechas y Enter. Esc cancela.", page: "Nota de página",
        notes: "Notas", note: "Nota", hint: "Qué cambiar aquí…", keys: "Ctrl+Enter guarda · Esc cancela", parent: "Ampliar al contenedor",
        del: "Borrar", cancel: "Cancelar", save: "Guardar", empty: "Sin notas. Pulsa «Anotar» y elige un elemento.", view: "Ver",
        go: "Ir a la página", move: "Mover la barra al otro lado", saved: "Nota guardada", deleted: "Nota borrada",
        failed: "No se pudo guardar. ¿Sigue abierta la sesión?", copy: "Copiar notas como texto", copied: "Notas copiadas: pégalas en tu asistente",
        noCopy: "No se pudo copiar", send: "Enviar a Claude", sent: "Enviado: Claude empieza con las notas",
        noSend: "No se pudo enviar. ¿Sigue abierta la sesión?",
        queued: "Claude está ocupado o no escucha. Si no empieza, pídeselo en el chat.", missing: "elemento no encontrado", dialog: "Nota para", shortcut: "Alt+A" }
    : { annotate: "Annotate", pick: "Pick an element", pickHelp: "Click an element, or use the arrow keys and Enter. Esc cancels.", page: "Page note",
        notes: "Notes", note: "Note", hint: "What to change here…", keys: "Ctrl+Enter saves · Esc cancels", parent: "Widen to the container",
        del: "Delete", cancel: "Cancel", save: "Save", empty: "No notes yet. Press “Annotate” and pick an element.", view: "View",
        go: "Go to page", move: "Move the bar to the other side", saved: "Note saved", deleted: "Note deleted",
        failed: "Could not save. Is the session still open?", copy: "Copy notes as text", copied: "Notes copied: paste them into your assistant",
        noCopy: "Could not copy", send: "Send to Claude", sent: "Sent: Claude is starting on the notes",
        noSend: "Could not send. Is the session still open?",
        queued: "Claude is busy or not listening. If it does not start, ask it in the chat.", missing: "element not found", dialog: "Note for", shortcut: "Alt+A" };

  const host = document.createElement("div");
  host.style.cssText = "position:absolute;top:0;left:0;width:0;height:0;z-index:2147483647";
  const root = host.attachShadow({ mode: "open" });
  root.innerHTML = `
    <style>
      * { box-sizing: border-box; font: 15px/1.4 system-ui, sans-serif; }
      /* Yellow on a dark ring: visible over any page colour. */
      .hl { position: absolute; pointer-events: none; display: none; border-radius: 2px; outline: 3px solid #facc15;
            box-shadow: 0 0 0 6px #111, inset 0 0 0 9999px rgb(250 204 21 / .18); }
      .pin { position: absolute; min-width: 28px; height: 28px; padding: 0 6px; border: 2px solid #111; border-radius: 14px;
             background: #facc15; color: #111; font-weight: 700; cursor: pointer; transform: translate(-24px, -16px);
             box-shadow: 0 0 0 2px #fff; }
      .ui { position: fixed; bottom: 16px; right: 16px; display: grid; gap: 8px; justify-items: end;
            width: min(380px, calc(100vw - 32px)); pointer-events: none; }
      .ui.left { right: auto; left: 16px; justify-items: start; }
      .ui > * { pointer-events: auto; }
      .bar, .pop, .panel { background: #111; color: #fff; border-radius: 10px; box-shadow: 0 4px 20px rgb(0 0 0 / .4); }
      .bar { display: flex; flex-wrap: wrap; gap: 6px; padding: 6px; }
      .pop, .panel { width: 100%; padding: 12px; }
      button { min-height: 40px; border: 0; border-radius: 6px; padding: 0 14px; background: #2e2e2e; color: #fff; cursor: pointer; }
      button:hover { background: #444; }
      button:disabled { opacity: .55; cursor: not-allowed; }
      button:disabled:hover { background: #2e2e2e; }
      button.on, button.primary { background: #facc15; color: #111; font-weight: 700; }
      button:focus-visible, textarea:focus-visible { outline: 3px solid #fff; outline-offset: 2px; }
      .pin:focus-visible { outline: 3px solid #111; outline-offset: 4px; }
      .status { width: 100%; padding: 2px 8px 4px; color: #facc15; font-size: 14px; }
      .status:empty { display: none; }
      .target, .meta, .keys { margin: 0 0 8px; color: #d4d4d4; font-size: 14px; overflow-wrap: anywhere; }
      .keys { margin: 8px 0 0; }
      textarea { display: block; width: 100%; height: 110px; margin: 8px 0; padding: 8px; border: 0; border-radius: 6px;
                 background: #fff; color: #111; resize: vertical; }
      .row { display: flex; flex-wrap: wrap; gap: 6px; justify-content: flex-end; }
      .panel { max-height: 60vh; overflow: auto; }
      .item { padding: 10px 0; border-top: 1px solid #444; }
      .item b { color: #facc15; }
      .item .row { justify-content: flex-start; margin-top: 8px; }
      [hidden] { display: none !important; }
    </style>
    <div class="hl"></div>
    <div class="pins"></div>
    <div class="ui">
      <div class="panel" role="region" aria-label="${T.notes}" hidden></div>
      <form class="pop" hidden><div role="dialog" aria-labelledby="target">
        <p class="target" id="target"></p>
        <button type="button" class="parent">↑ ${T.parent}</button>
        <textarea aria-label="${T.note}" placeholder="${T.hint}" required></textarea>
        <div class="row">
          <button type="button" class="del" hidden>${T.del}</button>
          <button type="button" class="cancel">${T.cancel}</button>
          <button class="primary">${T.save}</button>
        </div>
        <p class="keys">${T.keys}</p>
      </div></form>
      <div class="bar">
        <div class="status" role="status"></div>
        <button class="toggle" aria-pressed="false" title="${T.shortcut}" aria-keyshortcuts="Alt+A">${T.annotate}</button>
        <button class="page">${T.page}</button>
        <button class="list" aria-expanded="false">${T.notes} (0)</button>
        <button class="send" disabled>${T.send}</button>
        <button class="move" aria-label="${T.move}" title="${T.move}">⇄</button>
      </div>
    </div>`;
  document.documentElement.append(host);

  const $ = (s) => root.querySelector(s);
  const hl = $(".hl"), pins = $(".pins"), ui = $(".ui"), pop = $(".pop"), panel = $(".panel"), status = $(".status");
  const toggle = $(".toggle"), list = $(".list"), send = $(".send");
  const area = pop.querySelector("textarea");
  let notes = [];
  let picking = false;
  let current = null; // element under the pointer or the arrow keys while picking
  let draft = null; // note being written or edited
  let draftEl = null;

  const selectorOf = (el) => {
    const parts = [];
    for (; el && el !== document.body && el.nodeType === 1; el = el.parentElement) {
      if (el.id) return [`#${CSS.escape(el.id)}`, ...parts].join(" > ");
      const same = [...el.parentElement.children].filter((c) => c.tagName === el.tagName);
      parts.unshift(el.tagName.toLowerCase() + (same.length > 1 ? `:nth-of-type(${same.indexOf(el) + 1})` : ""));
    }
    return ["body", ...parts].join(" > ");
  };
  const find = (note) => {
    try { return document.querySelector(note.selector); } catch { return null; }
  };
  const here = (note) => note.path === location.pathname;
  const pickable = (el) => el && el !== host && el.nodeType === 1 && document.body.contains(el);
  const describe = (el) => ({
    selector: selectorOf(el),
    tag: el.tagName.toLowerCase(),
    classes: el.className?.baseVal ?? el.className ?? "",
    text: (el === document.body ? document.title : (el.innerText ?? el.textContent ?? "")).trim().replace(/\s+/g, " ").slice(0, 120),
    html: el === document.body ? "" : el.outerHTML.slice(0, 300),
  });

  const mark = (el) => {
    if (!el || el === document.body) return void (hl.style.display = "none");
    const r = el.getBoundingClientRect();
    Object.assign(hl.style, { display: "block", left: `${r.left + scrollX}px`, top: `${r.top + scrollY}px`, width: `${r.width}px`, height: `${r.height}px` });
  };
  let clear;
  const say = (text) => {
    status.textContent = text;
    clearTimeout(clear);
    clear = setTimeout(() => (status.textContent = ""), 5000);
  };

  const save = async (done) => {
    render();
    try {
      const response = await fetch("/__annotate/notes", { method: "POST", body: JSON.stringify(notes) });
      if (!response.ok) throw new Error(response.statusText);
      say(done);
    } catch {
      say(T.failed);
    }
  };

  function render() {
    pins.replaceChildren();
    notes.forEach((note, i) => {
      const el = here(note) && note.tag !== "body" && find(note);
      if (!el) return;
      const r = el.getBoundingClientRect();
      const pin = document.createElement("button");
      pin.className = "pin";
      pin.textContent = i + 1;
      pin.setAttribute("aria-label", `${T.note} ${i + 1}: ${note.note}`);
      pin.title = note.note;
      // Hangs off the element's corner so it does not cover its first
      // letters, and stays on the page at the edges.
      pin.style.left = `${Math.max(26, r.left + scrollX)}px`;
      pin.style.top = `${Math.max(18, r.top + scrollY)}px`;
      pin.onclick = () => open(note, el);
      pins.append(pin);
    });
    list.textContent = `${T.notes} (${notes.length})`;
    // Always on show, so it can be found before the first note exists.
    send.disabled = !notes.length;
    send.title = notes.length ? "" : T.empty;
    const copy = document.createElement("button");
    copy.textContent = T.copy;
    copy.style.marginBottom = "10px";
    copy.onclick = () => navigator.clipboard.writeText(brief()).then(() => say(T.copied), () => say(T.noCopy));
    panel.replaceChildren(
      ...(notes.length ? [copy] : []),
      ...(notes.length ? notes : [null]).map((note, i) => {
        const item = document.createElement("div");
        item.className = "item";
        if (!note) { item.textContent = T.empty; return item; }
        const el = here(note) ? find(note) : null;
        const meta = document.createElement("p");
        meta.className = "meta";
        const number = document.createElement("b");
        number.textContent = `${i + 1} `;
        meta.append(number, `${note.path} · ${note.text || note.tag}${here(note) && !el ? ` · ${T.missing}` : ""}`);
        const text = document.createElement("div");
        text.textContent = note.note;
        const row = document.createElement("div");
        row.className = "row";
        const go = document.createElement("button");
        go.textContent = here(note) ? T.view : T.go;
        go.onclick = () => {
          if (!here(note)) return void (location.href = note.path);
          el?.scrollIntoView({ block: "center" });
          open(note, el);
        };
        const del = document.createElement("button");
        del.textContent = T.del;
        del.onclick = () => { notes = notes.filter((n) => n !== note); save(T.deleted); };
        row.append(go, del);
        item.append(meta, text, row);
        return item;
      }),
    );
  }

  // The notes as a plain Markdown brief, for any assistant that cannot read
  // the notes file itself.
  const brief = () => [
    "# Page annotations",
    "",
    "Each note below was left on an element of a locally running site. Find the source code that renders the element and make the change the note asks for.",
    ...notes.flatMap((note, i) => [
      "",
      `## ${i + 1}. ${note.path}`,
      `- Note: ${note.note}`,
      `- Element: <${note.tag}> ${note.text}`,
      `- Selector (rendered DOM): \`${note.selector}\``,
      ...(note.html ? [`- HTML: \`${note.html.replace(/\s+/g, " ")}\``] : []),
      `- Seen at: ${note.viewport}, ${note.theme} theme`,
    ]),
  ].join("\n");

  const showPanel = (on) => {
    panel.hidden = !on;
    list.setAttribute("aria-expanded", on);
  };
  function target(el) {
    draftEl = el;
    pop.querySelector(".target").textContent = `${T.dialog} <${draft.tag}> ${draft.text}`;
    pop.querySelector(".parent").hidden = !el || el === document.body || !pickable(el.parentElement);
    mark(el);
  }
  function open(note, el) {
    draft = note;
    showPanel(false);
    pop.hidden = false;
    pop.querySelector(".del").hidden = !notes.includes(note);
    area.value = note.note ?? "";
    target(el);
    area.focus();
  }
  const close = () => {
    pop.hidden = true;
    draft = draftEl = null;
    mark(null);
    toggle.focus();
  };
  const setPicking = (on) => {
    picking = on;
    toggle.classList.toggle("on", on);
    toggle.setAttribute("aria-pressed", on);
    toggle.textContent = on ? T.pick : T.annotate;
    if (on) say(T.pickHelp);
    else { current = null; mark(null); status.textContent = ""; }
  };
  const choose = (el) => {
    setPicking(false);
    open({
      id: Date.now().toString(36),
      path: location.pathname,
      ...describe(el),
      viewport: `${innerWidth}x${innerHeight}`,
      theme: document.documentElement.dataset.theme ?? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"),
      created: new Date().toISOString(),
    }, el);
  };

  toggle.onclick = () => { if (!pop.hidden) close(); setPicking(!picking); };
  $(".page").onclick = () => choose(document.body);
  list.onclick = () => { showPanel(panel.hidden); if (!pop.hidden) close(); };
  send.onclick = async () => {
    try {
      const response = await fetch("/__annotate/send", { method: "POST" });
      if (!response.ok) throw new Error(response.statusText);
      say((await response.json()).listening ? T.sent : T.queued);
    } catch {
      say(T.noSend);
    }
  };
  $(".move").onclick = () => {
    const left = ui.classList.toggle("left");
    try { localStorage.setItem("annotate-side", left ? "left" : "right"); } catch {}
  };
  try { ui.classList.toggle("left", localStorage.getItem("annotate-side") === "left"); } catch {}

  pop.querySelector(".parent").onclick = () => {
    Object.assign(draft, describe(draftEl.parentElement));
    target(draftEl.parentElement);
    area.focus();
  };
  pop.querySelector(".cancel").onclick = close;
  pop.querySelector(".del").onclick = () => { notes = notes.filter((n) => n !== draft); close(); save(T.deleted); };
  area.onkeydown = (event) => {
    if (!(event.key === "Enter" && (event.ctrlKey || event.metaKey))) return;
    // Saving moves focus to the Annotate button: without this the same Enter presses it.
    event.preventDefault();
    pop.requestSubmit();
  };
  pop.onsubmit = (event) => {
    event.preventDefault();
    draft.note = area.value.trim();
    if (!notes.includes(draft)) notes.push(draft);
    close();
    save(T.saved);
  };

  document.addEventListener("mousemove", (event) => {
    if (!picking || !pickable(event.target)) return;
    mark((current = event.target));
  }, true);
  document.addEventListener("click", (event) => {
    if (!picking || !pickable(event.target)) return;
    event.preventDefault();
    event.stopPropagation();
    choose(event.target);
  }, true);
  document.addEventListener("keydown", (event) => {
    if (event.altKey && event.code === "KeyA") {
      event.preventDefault();
      return toggle.click();
    }
    if (event.key === "Escape") {
      if (!pop.hidden) return close();
      if (picking) return setPicking(false);
      return showPanel(false);
    }
    if (!picking) return;
    // Arrow keys walk the page structure: up to the container, down into it,
    // left and right between siblings.
    const from = current ?? document.querySelector("main") ?? document.body.firstElementChild;
    const next = {
      ArrowUp: from.parentElement,
      ArrowDown: from.firstElementChild,
      ArrowLeft: from.previousElementSibling,
      ArrowRight: from.nextElementSibling,
    }[event.key];
    if (event.key === "Enter") {
      event.preventDefault();
      event.stopPropagation();
      return choose(from);
    }
    if (next === undefined) return;
    event.preventDefault();
    // The first key press only shows where the walk starts.
    current = current && pickable(next) ? next : from;
    current.scrollIntoView({ block: "nearest" });
    mark(current);
  }, true);

  // Pins follow the layout: fonts, images and resizes all move elements.
  new ResizeObserver(() => { render(); mark(draftEl ?? current); }).observe(document.body);

  fetch("/__annotate/notes").then((r) => r.json()).then((saved) => { notes = saved; render(); });
})();
