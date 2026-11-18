// Overlay injected by server.mjs. Pick an element, write a note; every
// change is saved to the notes file through POST /__annotate/notes.
(() => {
  if (window.__annotate) return;
  window.__annotate = true;

  const es = navigator.language.startsWith("es");
  const T = es
    ? { annotate: "Anotar", pick: "Elige un elemento (Esc)", notes: "Notas", note: "Nota", hint: "Qué cambiar aquí…", del: "Borrar",
        cancel: "Cancelar", save: "Guardar", empty: "Sin notas. Pulsa «Anotar» y haz clic en un elemento.", view: "Ver", go: "Ir a la página" }
    : { annotate: "Annotate", pick: "Pick an element (Esc)", notes: "Notes", note: "Note", hint: "What to change here…", del: "Delete",
        cancel: "Cancel", save: "Save", empty: "No notes yet. Press “Annotate” and click an element.", view: "View", go: "Go to page" };

  const host = document.createElement("div");
  host.style.cssText = "position:absolute;top:0;left:0;width:0;height:0;z-index:2147483647";
  const root = host.attachShadow({ mode: "open" });
  root.innerHTML = `
    <style>
      * { box-sizing: border-box; font: 13px/1.4 system-ui, sans-serif; }
      .hl { position: absolute; pointer-events: none; outline: 2px solid #e11d48; background: rgb(225 29 72 / .12); display: none; }
      .pin { position: absolute; min-width: 22px; height: 22px; padding: 0 5px; border: 2px solid #fff; border-radius: 11px;
             background: #e11d48; color: #fff; font-weight: 700; cursor: pointer; transform: translate(-8px, -8px); }
      .bar { position: fixed; right: 16px; bottom: 16px; display: flex; gap: 6px; padding: 6px; background: #111; border-radius: 8px;
             box-shadow: 0 4px 16px rgb(0 0 0 / .35); }
      button { border: 0; border-radius: 5px; padding: 6px 10px; background: #333; color: #fff; cursor: pointer; }
      button:focus-visible, textarea:focus-visible { outline: 2px solid #fda4af; outline-offset: 1px; }
      button.on, button.primary { background: #e11d48; }
      .pop, .panel { position: fixed; right: 16px; bottom: 64px; width: min(340px, calc(100vw - 32px)); padding: 10px;
                     background: #111; color: #fff; border-radius: 8px; box-shadow: 0 4px 16px rgb(0 0 0 / .35); }
      .pop p, .panel p { margin: 0 0 6px; color: #bbb; font-size: 12px; overflow-wrap: anywhere; }
      textarea { display: block; width: 100%; height: 96px; margin-bottom: 8px; padding: 6px; border: 0; border-radius: 5px; resize: vertical; }
      .row { display: flex; gap: 6px; justify-content: flex-end; }
      .panel { max-height: 60vh; overflow: auto; }
      .item { padding: 8px 0; border-top: 1px solid #333; }
      .item b { color: #fda4af; }
      [hidden] { display: none !important; }
    </style>
    <div class="hl"></div>
    <div class="pins"></div>
    <form class="pop" hidden>
      <p class="target"></p>
      <textarea aria-label="${T.note}" placeholder="${T.hint}" required></textarea>
      <div class="row">
        <button type="button" class="del" hidden>${T.del}</button>
        <button type="button" class="cancel">${T.cancel}</button>
        <button class="primary">${T.save}</button>
      </div>
    </form>
    <div class="panel" hidden></div>
    <div class="bar">
      <button class="toggle" aria-pressed="false">${T.annotate}</button>
      <button class="list">${T.notes} (0)</button>
    </div>`;
  document.documentElement.append(host);

  const $ = (s) => root.querySelector(s);
  const hl = $(".hl"), pins = $(".pins"), pop = $(".pop"), panel = $(".panel"), toggle = $(".toggle"), list = $(".list");
  const area = pop.querySelector("textarea");
  let notes = [];
  let picking = false;
  let draft = null; // note being written or edited

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
  const box = (el) => {
    const r = el.getBoundingClientRect();
    return { left: r.left + scrollX, top: r.top + scrollY, width: r.width, height: r.height };
  };

  const save = async () => {
    await fetch("/__annotate/notes", { method: "POST", body: JSON.stringify(notes) });
    render();
  };

  function render() {
    pins.replaceChildren();
    notes.forEach((note, i) => {
      const el = here(note) && find(note);
      if (!el) return;
      const b = box(el);
      const pin = document.createElement("button");
      pin.className = "pin";
      pin.textContent = i + 1;
      pin.title = note.note;
      pin.style.left = `${b.left}px`;
      pin.style.top = `${b.top}px`;
      pin.onclick = () => open(note);
      pins.append(pin);
    });
    list.textContent = `${T.notes} (${notes.length})`;
    panel.replaceChildren(
      ...(notes.length ? notes : [null]).map((note, i) => {
        const item = document.createElement("div");
        item.className = "item";
        if (!note) { item.textContent = T.empty; return item; }
        const head = document.createElement("p");
        head.innerHTML = `<b>${i + 1}</b> `;
        head.append(`${note.path} · ${note.text || note.tag}`);
        const text = document.createElement("div");
        text.textContent = note.note;
        const go = document.createElement("button");
        go.textContent = here(note) ? T.view : T.go;
        go.style.marginTop = "6px";
        go.onclick = () => {
          if (!here(note)) return void (location.href = note.path);
          find(note)?.scrollIntoView({ block: "center" });
          open(note);
        };
        item.append(head, text, go);
        return item;
      }),
    );
  }

  function open(note) {
    draft = note;
    panel.hidden = true;
    pop.hidden = false;
    pop.querySelector(".target").textContent = `<${note.tag}> ${note.text}`;
    pop.querySelector(".del").hidden = !notes.includes(note);
    area.value = note.note ?? "";
    area.focus();
  }
  const close = () => { pop.hidden = true; draft = null; };
  const setPicking = (on) => {
    picking = on;
    toggle.classList.toggle("on", on);
    toggle.setAttribute("aria-pressed", on);
    toggle.textContent = on ? T.pick : T.annotate;
    if (!on) hl.style.display = "none";
  };

  toggle.onclick = () => setPicking(!picking);
  list.onclick = () => { panel.hidden = !panel.hidden; pop.hidden = true; };
  pop.querySelector(".cancel").onclick = close;
  pop.querySelector(".del").onclick = () => { notes = notes.filter((n) => n !== draft); close(); save(); };
  pop.onsubmit = (event) => {
    event.preventDefault();
    draft.note = area.value.trim();
    if (!notes.includes(draft)) notes.push(draft);
    close();
    save();
  };

  document.addEventListener("mousemove", (event) => {
    if (!picking || event.target === host) return;
    const b = box(event.target);
    Object.assign(hl.style, { display: "block", left: `${b.left}px`, top: `${b.top}px`, width: `${b.width}px`, height: `${b.height}px` });
  }, true);
  document.addEventListener("click", (event) => {
    if (!picking || event.target === host) return;
    event.preventDefault();
    event.stopPropagation();
    const el = event.target;
    setPicking(false);
    open({
      id: Date.now().toString(36),
      path: location.pathname,
      selector: selectorOf(el),
      tag: el.tagName.toLowerCase(),
      classes: el.className?.baseVal ?? el.className ?? "",
      text: (el.innerText ?? el.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 120),
      html: el.outerHTML.slice(0, 300),
      viewport: `${innerWidth}x${innerHeight}`,
      theme: document.documentElement.dataset.theme ?? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"),
      created: new Date().toISOString(),
    });
  }, true);
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    setPicking(false);
    close();
    panel.hidden = true;
  });
  addEventListener("resize", render);
  addEventListener("load", render);

  fetch("/__annotate/notes").then((r) => r.json()).then((saved) => { notes = saved; render(); });
})();
