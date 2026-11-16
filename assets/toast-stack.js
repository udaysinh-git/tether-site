// A stack of toasts after Bencho's toast stack (bencho.dev, MIT): the newest
// in front, up to two older ones tucked behind it with a sliver of each
// showing above, a step smaller and with their words hidden. Point at the
// stack and it fans out into a list; move away and it gathers up again.
// Every move is one spring to a computed place. Dismissed toasts slide out
// to the right; new ones rise in from below the front.
//
// Plain script: it sets globalThis.createToastStack, so the extension's
// modules and the website can both load it.
(() => {
  const H = 60, PEEK = 12, GAP = 8, SHOWN = 3;
  const SPRING = "linear(0, 0.051, 0.15, 0.264, 0.375, 0.464, 0.553, 0.63, 0.695, 0.742, 0.788, 0.826, 0.857, 0.883, 0.901, 0.919, 0.934, 0.946, 0.954, 0.963, 0.969, 0.975, 0.979, 0.983, 0.986, 0.988, 0.99, 0.992, 0.993, 0.995, 0.996, 0.996, 0.997, 0.998, 0.998, 0.998, 0.999, 0.999, 0.999, 0.999, 1)";
  const ICONS = {
    success: '<circle cx="12" cy="12" r="9"/><path d="m8.5 12.5 2.5 2.5 4.5-5"/>',
    error: '<circle cx="12" cy="12" r="9"/><path d="m9 9 6 6M15 9l-6 6"/>',
    warning: '<path d="M10.3 3.9 2.4 17.6A2 2 0 0 0 4.1 20.6h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
  };
  const CSS = `
    .tst { position: relative; width: 100%; font: inherit; color: #ece8e1; pointer-events: auto; }
    .tst-toast {
      position: absolute; left: 0; right: 0; bottom: 0; height: ${H}px; box-sizing: border-box;
      display: flex; align-items: center; gap: 12px; padding: 0 10px 0 14px;
      border-radius: 20px; background: #262421;
      box-shadow: 0 0 0 1px rgb(236 232 225 / .07), 0 12px 30px rgb(0 0 0 / .35);
      transform-origin: 50% 0;
      transition: transform .52s ${SPRING}, opacity .3s ease, background-color .22s ease;
    }
    .tst:not(.open) .tst-toast:not(.front) { background: #2d2b28; }
    .tst-toast > * { transition: opacity .22s ease; }
    .tst:not(.open) .tst-toast:not(.front) > * { opacity: 0; }
    .tst-toast.out { transition: transform .22s cubic-bezier(.4, 0, 1, 1), opacity .22s ease; }
    .tst-icon { flex: none; display: grid; place-items: center; color: #a9a49b; }
    .tst-icon svg { width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
    .tst-toast[data-kind="success"] .tst-icon { color: #7fbf8e; }
    .tst-toast[data-kind="error"] .tst-icon { color: #e0806b; }
    .tst-toast[data-kind="warning"] .tst-icon, .tst-toast[data-kind="bell"] .tst-icon { color: #e8a33d; }
    .tst-text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; text-align: left; }
    .tst-text b { font-size: 13.5px; font-weight: 600; line-height: 18px; letter-spacing: -0.01em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .tst-text span { font-size: 12.5px; line-height: 17px; color: #a9a49b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .tst-text span:empty { display: none; }
    .tst button { font: inherit; color: inherit; border: 0; cursor: pointer; }
    .tst-act { flex: none; height: 28px; padding: 0 12px; border-radius: 999px; background: rgb(236 232 225 / .08); font-size: 13px; font-weight: 500; transition: scale .16s cubic-bezier(.22, 1, .36, 1), background-color .15s; }
    .tst-act:hover { background: rgb(236 232 225 / .13); }
    .tst-act:active { scale: .96; }
    .tst-x { flex: none; width: 28px; height: 28px; display: grid; place-items: center; border-radius: 999px; background: none; color: #8a857c; transition: background-color .16s, color .16s; }
    .tst-x:hover { background: rgb(236 232 225 / .08); color: #ece8e1; }
    .tst-x svg { width: 14px; height: 14px; fill: none; stroke: currentColor; stroke-width: 2.2; stroke-linecap: round; }
    .tst button:focus-visible { outline: 2px solid #e8a33d; outline-offset: 1px; }
    @media (prefers-reduced-motion: reduce) { .tst-toast, .tst-toast > * { transition: none !important; } }
  `;
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

  function createToastStack(host, { duration = 4200, keep = false } = {}) {
    if (!document.getElementById("tst-style")) {
      const st = document.createElement("style");
      st.id = "tst-style";
      st.textContent = CSS;
      document.head.appendChild(st);
    }
    const root = document.createElement("div");
    root.className = "tst";
    root.setAttribute("role", "region");
    root.setAttribute("aria-label", "Notifications");
    host.appendChild(root);
    let items = []; // front first
    let open = false;

    function place() {
      root.classList.toggle("open", open);
      const stack = H + (Math.min(items.length, SHOWN) - 1) * PEEK;
      root.style.height = `${open ? Math.min(items.length, SHOWN) * (H + GAP) - GAP : Math.max(H, stack)}px`;
      items.forEach((t, k) => {
        const d = Math.min(k, SHOWN - 1);
        const y = open ? -k * (H + GAP) : -d * PEEK;
        const sc = open ? 1 : 1 - d * 0.05;
        t.el.style.zIndex = String(SHOWN - k + 1);
        t.el.classList.toggle("front", k === 0);
        t.el.style.opacity = k >= SHOWN ? "0" : t.leaving ? "0" : "1";
        // Tucked ones hang from their top edge, so shrink about the top.
        t.el.style.transform = t.leaving ? `translate(60px, ${y}px)` : `translateY(${y}px) scale(${sc})`;
        t.el.inert = !open && k > 0;
      });
    }

    function remove(t) {
      if (t.leaving) return;
      t.leaving = true;
      clearTimeout(t.timer);
      t.el.classList.add("out");
      place();
      setTimeout(() => { t.el.remove(); items = items.filter((x) => x !== t); place(); }, 230);
    }

    function show({ kind = "info", title = "", body = "", action, onAction } = {}) {
      const el = document.createElement("div");
      el.className = "tst-toast";
      el.dataset.kind = kind;
      el.innerHTML = `<span class="tst-icon"><svg viewBox="0 0 24 24">${ICONS[kind] || ICONS.info}</svg></span><span class="tst-text"><b>${esc(title)}</b><span>${esc(body)}</span></span>${action ? `<button type="button" class="tst-act">${esc(action)}</button>` : ""}<button type="button" class="tst-x" aria-label="Dismiss"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button>`;
      const t = { el, leaving: false, timer: 0 };
      // Rise in from below the front, then spring to place.
      el.style.transition = "none";
      el.style.opacity = "0";
      el.style.transform = "translateY(24px)";
      root.appendChild(el);
      items.unshift(t);
      void el.offsetWidth;
      el.style.transition = "";
      place();
      el.querySelector(".tst-x").addEventListener("click", () => remove(t));
      if (action) el.querySelector(".tst-act").addEventListener("click", () => onAction?.(t, { update: (o) => update(t, o), dismiss: () => remove(t) }));
      while (items.filter((x) => !x.leaving).length > SHOWN) remove(items.filter((x) => !x.leaving).at(-1));
      if (!keep) t.timer = setTimeout(() => (open ? (t.wait = true) : remove(t)), duration);
      return t;
    }

    function update(t, { kind, title, body, action } = {}) {
      if (kind) t.el.dataset.kind = kind;
      if (kind) t.el.querySelector(".tst-icon").innerHTML = `<svg viewBox="0 0 24 24">${ICONS[kind] || ICONS.info}</svg>`;
      if (title != null) t.el.querySelector(".tst-text b").textContent = title;
      if (body != null) t.el.querySelector(".tst-text span").textContent = body;
      if (action === null) t.el.querySelector(".tst-act")?.remove();
    }

    root.addEventListener("pointerover", () => { open = true; place(); });
    root.addEventListener("pointerout", (e) => {
      if (e.relatedTarget && root.contains(e.relatedTarget)) return;
      open = false;
      place();
      for (const t of items) if (t.wait) { t.wait = false; t.timer = setTimeout(() => remove(t), 1200); }
    });
    root.addEventListener("focusin", () => { open = true; place(); });
    root.addEventListener("focusout", (e) => { if (!root.contains(e.relatedTarget)) { open = false; place(); } });
    return { show, remove, root };
  }

  globalThis.createToastStack = createToastStack;
})();
