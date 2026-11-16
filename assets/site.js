// Live demos for the Tether site. Each card runs a small loop of the real
// extension's behaviour, drawn in plain DOM. Motion follows Bencho's
// micro-interactions: springs for anything that settles, blur crossfades
// for anything that changes, and a press that gives a little.
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const sleep = (ms) => new Promise((r) => setTimeout(r, reduce ? Math.min(ms, 60) : ms));
  const css = getComputedStyle(document.documentElement);
  const ISLAND = css.getPropertyValue("--island").trim();
  const POP = css.getPropertyValue("--pop").trim();
  // Sounds (Bencho's, see sounds.js) play only for things you do, never for
  // the demos running on their own. The speaker button in the header mutes them.
  let soundOn = localStorage.getItem("tether-sound") !== "off";
  const sound = (name, opts) => { if (soundOn && !reduce) globalThis.tetherSound?.play(name, opts); };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

  // Run a demo only while its card is on screen.
  function whenVisible(el, start) {
    let running = null;
    new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !running) running = start();
      else if (!e.isIntersecting && running) { running.stop?.(); running = null; }
    }, { threshold: 0.25 }).observe(el);
  }

  // A loop that can be stopped and restarted.
  function loop(fn) {
    let alive = true, token = 0;
    const run = async () => { const t = ++token; while (alive && t === token) { await fn(() => alive && t === token); await sleep(30); } };
    run();
    return { stop() { alive = false; }, restart() { token++; alive = true; run(); } };
  }

  // Measure, change, then spring the box from the old size to the new one.
  function morph(el, change) {
    const a = el.getBoundingClientRect();
    const ra = getComputedStyle(el).borderTopLeftRadius;
    change();
    if (reduce) return;
    const b = el.getBoundingClientRect();
    const rb = getComputedStyle(el).borderTopLeftRadius;
    if (Math.abs(a.width - b.width) < 1 && Math.abs(a.height - b.height) < 1 && ra === rb) return;
    el.animate([{ width: `${a.width}px`, height: `${a.height}px`, borderRadius: ra }, { width: `${b.width}px`, height: `${b.height}px`, borderRadius: rb }], { duration: 560, easing: ISLAND });
  }

  // ------------------------------------------------------------ hero words
  for (const h of $$("[data-words]")) {
    h.innerHTML = h.textContent.trim().split(/\s+/).map((w, i) => `<span class="w" style="--i:${i}">${esc(w)}</span>`).join(" ");
  }

  // ------------------------------------------------------------ dot field
  // Every dot is its own spring: pulled toward the pointer, falling off with
  // distance, never past it, and back with a little give when it leaves.
  (() => {
    const cv = $("#dots");
    if (!cv) return;
    const ctx = cv.getContext("2d");
    let dots = [], w = 0, h = 0, dpr = 1, px = -1e4, py = -1e4, raf = 0;
    const GAP = 26, R = 150;
    function size() {
      dpr = Math.min(2, devicePixelRatio || 1);
      w = cv.clientWidth; h = cv.clientHeight;
      cv.width = w * dpr; cv.height = h * dpr;
      dots = [];
      for (let y = GAP / 2; y < h; y += GAP) for (let x = GAP / 2; x < w; x += GAP) dots.push({ x, y, ox: 0, oy: 0, vx: 0, vy: 0 });
      kick();
    }
    function frame() {
      raf = 0;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      let moving = false;
      for (const d of dots) {
        const dx = px - d.x, dy = py - d.y, dist = Math.hypot(dx, dy);
        const f = dist < R ? (1 - dist / R) ** 2 : 0;
        const tx = dx * f * 0.32, ty = dy * f * 0.32;
        d.vx = (d.vx + (tx - d.ox) * 0.09) * 0.8;
        d.vy = (d.vy + (ty - d.oy) * 0.09) * 0.8;
        d.ox += d.vx; d.oy += d.vy;
        if (Math.abs(d.vx) + Math.abs(d.vy) > 0.01 || Math.abs(tx - d.ox) > 0.05) moving = true;
        const near = Math.max(0, 1 - Math.hypot(px - d.x - d.ox, py - d.y - d.oy) / R);
        ctx.fillStyle = near > 0.02 ? `rgba(212,175,55,${0.18 + near * 0.6})` : "rgba(255,251,240,0.13)";
        ctx.beginPath();
        ctx.arc(d.x + d.ox, d.y + d.oy, 1.1 + near * 1.3, 0, Math.PI * 2);
        ctx.fill();
      }
      if (moving) kick();
    }
    const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };
    const hero = cv.parentElement;
    hero.addEventListener("pointermove", (e) => { const r = cv.getBoundingClientRect(); px = e.clientX - r.left; py = e.clientY - r.top; if (!reduce) kick(); });
    hero.addEventListener("pointerleave", () => { px = py = -1e4; kick(); });
    addEventListener("resize", size);
    size();
  })();

  // ------------------------------------------------------------ chips filter
  (() => {
    const chips = $$(".chip");
    const cards = $$(".card");
    for (const c of chips) c.addEventListener("click", () => {
      const f = c.dataset.filter;
      sound("tick", { pitch: 1.4, volume: 0.8 });
      for (const x of chips) x.setAttribute("aria-pressed", String(x === c));
      // FLIP: remember where each card was, filter, then spring them home.
      const before = new Map(cards.map((k) => [k, k.getBoundingClientRect()]));
      for (const k of cards) k.classList.toggle("hidden", f !== "all" && !k.dataset.cat.split(" ").includes(f));
      if (reduce) return;
      for (const k of cards) {
        if (k.classList.contains("hidden")) continue;
        const a = before.get(k), b = k.getBoundingClientRect();
        if (!a.width) { k.animate([{ opacity: 0, scale: 0.94, filter: "blur(8px)" }, { opacity: 1, scale: 1, filter: "blur(0)" }], { duration: 520, easing: ISLAND }); continue; }
        const dx = a.left - b.left, dy = a.top - b.top;
        if (Math.abs(dx) + Math.abs(dy) < 1) continue;
        k.animate([{ transform: `translate(${dx}px, ${dy}px) scale(${a.width / b.width}, ${a.height / b.height})` }, { transform: "none" }], { duration: 600, easing: ISLAND });
      }
    });
  })();

  const demos = {};
  // The demos only exist on the home page.
  if ($("#demos")) {
  // ------------------------------------------------------------ 1 · share
  (() => {
    const el = $("#share");
    const page = `<div class="page"><span class="fav">L</span><div><div class="t">Quarterly invoices</div><div class="s">ledgerly.app</div></div></div>`;
    const acts = ["opened “Invoices”", "typed “March”", "clicked “Export CSV”", "read the network log", "clicked “New invoice”"];
    let i = 0, state = "idle", timer = 0;
    function render() {
      morph(el, () => {
        if (state === "idle") {
          el.innerHTML = `${page}<button class="btn amber go press">Share this tab</button><div class="s">Your agent can use this tab and any tab it opens, until you stop.</div>`;
          $(".go", el).addEventListener("click", (e) => { if (e.isTrusted) sound("landed"); state = "shared"; render(); tick(); });
        } else {
          el.innerHTML = `${page}<div class="live swap-in"><div class="head"><span class="dot beat"></span>Claude Code can use this tab</div><div class="what" id="what">Waiting for its first step</div></div><div class="row swap-in" style="animation-delay:.05s"><button class="btn press" id="pz">Pause</button><button class="btn press" id="stop">Stop sharing</button></div>`;
          $("#stop", el).addEventListener("click", () => { sound("hush"); clearInterval(timer); state = "idle"; render(); });
          $("#pz", el).addEventListener("click", (e) => {
            const p = e.target.textContent === "Pause";
            sound(p ? "drape" : "float");
            e.target.textContent = p ? "Resume" : "Pause";
            setWhat(p ? "Paused. Claude Code waits for you." : "Back to work");
          });
        }
      });
    }
    function setWhat(t) {
      const w = $("#what", el);
      if (!w) return;
      w.innerHTML = `<span class="word-in" style="display:inline-block">${esc(t)}</span>`;
    }
    function tick() {
      clearInterval(timer);
      setTimeout(() => setWhat(`Claude Code ${acts[i++ % acts.length]}`), 700);
      timer = setInterval(() => { if ($("#pz", el)?.textContent === "Pause") setWhat(`Claude Code ${acts[i++ % acts.length]}`); }, 2200);
    }
    render();
    demos.share = () => { clearInterval(timer); state = "idle"; render(); setTimeout(() => $(".go", el)?.click(), 700); };
    // Press it once on its own so the card shows both states.
    whenVisible(el, () => { const t = setTimeout(() => state === "idle" && $(".go", el)?.click(), 1400); return { stop() { clearTimeout(t); } }; });
  })();

  // ------------------------------------------------------------ 2 · island
  // The real panel's states, with working buttons. The shape and the content
  // are separate: the content is laid out at its final size at once and the
  // shape springs around it, so nothing wraps while it moves.
  (() => {
    const el = $("#island");
    el.innerHTML = `<div class="in"></div>`;
    const inner = $(".in", el);
    const acts = ["clicked “Continue”", "typed your email", "opened “Billing”", "read the network log", "pressed “Verify”"];
    let mode = "shared", k = 0, steps = 0, quietUntil = 0;
    function view() {
      if (mode === "ask") return { t: "Claude Code needs you", s: "Please type the 6-digit code from your phone, then press Done.", btns: [["done", "Done", "amber"], ["stop", "Stop"]], ask: true };
      if (mode === "paused") return { t: "Paused", s: "Claude Code will wait until you resume", btns: [["resume", "Resume"], ["stop", "Stop"]] };
      if (mode === "stopped") return { t: "Not shared", s: "The agent can't use this tab", btns: [["share", "Share again", "amber"]], dot: "grey" };
      return { t: "Shared with Claude Code", s: k ? acts[(k - 1) % acts.length] : "Waiting for its first step", btns: [["pause", "Pause"], ["stop", "Stop"]] };
    }
    function render(first) {
      const v = view();
      const html = `<span class="dot ${v.dot || "beat"}"></span><span class="lines"><div class="t">${esc(v.t)}</div><div class="s">${esc(v.s)}</div></span><span class="btns">${v.btns.map(([a, label, c]) => `<button type="button" class="btn press ${c || ""}" data-a="${a}">${label}</button>`).join("")}</span>`;
      const sameShape = !first && !!v.ask === el.classList.contains("ask") && $(".t", inner)?.textContent === v.t && $(".btns", inner)?.textContent === v.btns.map((b) => b[1]).join("");
      const a = el.getBoundingClientRect();
      const ra = getComputedStyle(el).borderTopLeftRadius;
      el.classList.toggle("ask", !!v.ask);
      inner.innerHTML = html;
      if (reduce || first) return;
      if (sameShape) {
        $(".lines", inner).animate([{ opacity: 0, transform: "translateY(5px)", filter: "blur(4px)" }, { opacity: 1, transform: "none", filter: "blur(0)" }], { duration: 320, easing: "cubic-bezier(.22,1,.36,1)" });
        el.animate([{ scale: 1 }, { scale: 1.04 }, { scale: 1 }], { duration: 440, easing: POP });
        return;
      }
      const b = el.getBoundingClientRect();
      const rb = getComputedStyle(el).borderTopLeftRadius;
      inner.style.width = `${b.width}px`;
      inner.style.height = `${b.height}px`;
      const run = el.animate([{ width: `${a.width}px`, height: `${a.height}px`, borderRadius: ra }, { width: `${b.width}px`, height: `${b.height}px`, borderRadius: rb }], { duration: 560, easing: ISLAND });
      inner.animate([{ opacity: 0, filter: "blur(6px)" }, { opacity: 1, filter: "blur(0)" }], { duration: 300, delay: 40, easing: "ease-out", fill: "backwards" });
      run.finished.then(() => { inner.style.width = ""; inner.style.height = ""; }, () => {});
    }
    inner.addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      quietUntil = Date.now() + 7000;
      const a = b.dataset.a;
      if (a === "pause") { mode = "paused"; sound("drape"); }
      if (a === "resume") { mode = "shared"; sound("float"); }
      if (a === "done") { mode = "shared"; k++; sound("paid"); }
      if (a === "stop") { mode = "stopped"; sound("hush"); }
      if (a === "share") { mode = "shared"; k = 0; sound("landed"); }
      render();
    });
    render(true);
    // On its own: the agent works, and every few steps asks for you.
    function tick() {
      if (Date.now() < quietUntil || mode === "paused" || mode === "stopped") return;
      if (mode === "ask") return;
      steps++;
      if (steps % 4 === 0) { mode = "ask"; render(); return; }
      k++; render();
    }
    demos.island = () => { quietUntil = 0; if (mode === "ask") { mode = "shared"; k++; } tick(); };
    whenVisible(el, () => { const t = setInterval(tick, 2300); return { stop() { clearInterval(t); } }; });
    // An answered ask returns to work after a moment if nobody presses Done.
    setInterval(() => { if (mode === "ask" && Date.now() > quietUntil + 5000) { mode = "shared"; k++; render(); } }, 6000);
  })();

  // ------------------------------------------------------------ 3 · cursor
  (() => {
    const desk = $("#desk");
    const cur = document.createElement("div");
    cur.className = "agent-cur";
    cur.innerHTML = `<div class="body"><svg width="18" height="22" viewBox="0 0 18 22"><path d="M1.5 1.5 L1.5 17.5 L5.8 13.6 L8.9 20.5 L11.8 19.2 L8.8 12.5 L14.6 12.5 Z" fill="#d4af37" stroke="#1a1a1a" stroke-width="1.4" stroke-linejoin="round"/></svg><span class="tag">Claude Code</span></div>`;
    desk.appendChild(cur);
    const fields = $$(".field", desk);
    const send = $(".send", desk);
    const at = (el, dx = 0.35) => { const d = desk.getBoundingClientRect(), r = el.getBoundingClientRect(); return [r.left - d.left + r.width * dx, r.top - d.top + r.height / 2]; };
    const go = ([x, y]) => { cur.style.transform = `translate(${x}px, ${y}px)`; };
    function click([x, y]) {
      const ring = document.createElement("span");
      ring.className = "ring"; ring.style.left = `${x}px`; ring.style.top = `${y}px`;
      desk.appendChild(ring); setTimeout(() => ring.remove(), 600);
      if (!reduce) $(".body", cur).animate([{ scale: 1 }, { scale: 0.82, offset: 0.22 }, { scale: 1.1, offset: 0.55 }, { scale: 1 }], { duration: 380 });
    }
    async function type(field, text, alive) {
      field.classList.add("hl");
      for (let k = 1; k <= text.length && alive(); k++) { field.innerHTML = `${esc(text.slice(0, k))}<span class="caret"></span>`; await sleep(45); }
      field.textContent = text;
      setTimeout(() => field.classList.remove("hl"), 500);
    }
    let lp;
    const run = () => loop(async (alive) => {
      fields.forEach((f, k) => (f.textContent = k ? "Company" : "Work email"));
      fields.forEach((f) => (f.style.color = "#878580"));
      go([300, 210]); await sleep(700);
      for (const [k, text] of [[0, "uday@kurolabs.in"], [1, "Kuro Labs"]]) {
        if (!alive()) return;
        const p = at(fields[k]); go(p); await sleep(760); click(p);
        fields[k].style.color = ""; await type(fields[k], text, alive); await sleep(250);
      }
      if (!alive()) return;
      const p = at(send, 0.5); go(p); await sleep(760); click(p);
      send.classList.add("down"); await sleep(120); send.classList.remove("down");
      send.textContent = "Sent"; await sleep(1800); send.textContent = "Send";
    });
    demos.cursor = () => { lp?.stop(); lp = run(); };
    whenVisible(desk, () => { lp = run(); return { stop() { lp.stop(); } }; });
  })();

  // ------------------------------------------------------------ 4 · hub
  (() => {
    const hub = $("#hub");
    const left = ["Claude Code", "Codex", "Cursor", "Gemini CLI"];
    const right = ["Chrome", "Zen", "Brave", "Firefox"];
    hub.innerHTML = `<svg class="lines"></svg><span class="node core"><svg><use href="#logo"/></svg>Tether host</span>`;
    const svg = $("svg.lines", hub);
    const core = $(".core", hub);
    const nodes = [];
    function layout() {
      const w = hub.clientWidth, h = hub.clientHeight, cx = w / 2, cy = h / 2;
      core.style.left = `${cx}px`; core.style.top = `${cy}px`;
      svg.innerHTML = "";
      const coreHalf = core.offsetWidth / 2;
      nodes.forEach((n) => {
        const list = n.side < 0 ? left : right, j = list.indexOf(n.name);
        const x = cx + n.side * Math.min(w * 0.38, 240), y = cy + (j - (list.length - 1) / 2) * 56;
        n.el.style.left = `${x}px`; n.el.style.top = `${y}px`;
        // From the node's inner edge to the hub's edge, easing in flat at both ends.
        const x1 = x - n.side * (n.el.offsetWidth / 2 + 6), x2 = cx + n.side * (coreHalf + 6), mid = (x1 + x2) / 2;
        const line = document.createElementNS("http://www.w3.org/2000/svg", "path");
        line.setAttribute("d", `M${x1},${y} C${mid},${y} ${mid},${cy} ${x2},${cy}`);
        line.setAttribute("class", "spoke"); line.setAttribute("fill", "none");
        svg.appendChild(line); n.line = line;
      });
    }
    for (const [names, side] of [[left, -1], [right, 1]]) for (const name of names) {
      const el = document.createElement("span");
      el.className = "node"; el.innerHTML = `<span class="dot ${side < 0 ? "" : "grey"}"></span>${esc(name)}`;
      hub.appendChild(el);
      const n = { name, side, el };
      nodes.push(n);
      el.addEventListener("pointerenter", () => { hub.classList.add("picking"); el.classList.add("hot"); n.line.classList.add("hot"); packet(n); });
      el.addEventListener("pointerleave", () => { hub.classList.remove("picking"); el.classList.remove("hot"); n.line.classList.remove("hot"); });
    }
    function packet(n) {
      if (reduce) return;
      const len = n.line.getTotalLength();
      const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
      p.setAttribute("d", n.line.getAttribute("d")); p.setAttribute("class", "packet");
      p.style.strokeDasharray = `18 ${len}`;
      svg.appendChild(p);
      const toHub = n.side < 0;
      p.animate([{ strokeDashoffset: toHub ? 18 : -len }, { strokeDashoffset: toHub ? -len : 18 }], { duration: 900, easing: "cubic-bezier(.45,0,.2,1)" }).finished.then(() => { p.remove(); core.classList.remove("nudge"); void core.offsetWidth; core.classList.add("nudge"); });
    }
    layout();
    document.fonts?.ready.then(layout);
    addEventListener("resize", layout);
    let last = -1;
    whenVisible(hub, () => {
      const t = setInterval(() => {
        if (hub.classList.contains("picking")) return;
        let k; do k = Math.floor(Math.random() * nodes.length); while (k === last);
        last = k; packet(nodes[k]);
      }, 1100);
      return { stop() { clearInterval(t); } };
    });
  })();

  // ------------------------------------------------------------ 5 · prompt
  (() => {
    const el = $("#prompt");
    function ask() {
      morph(el, () => {
        el.innerHTML = `<div class="who swap-in"><span class="badge">C<span class="dot beat"></span></span><div class="t">Codex wants its own window</div></div><div class="reason swap-in" style="animation-delay:.05s">“Compare this order across your three supplier sites”</div><div class="row swap-in" style="animation-delay:.1s"><button class="btn press" data-a="no">Not now</button><button class="btn amber press" data-a="yes">Open window</button></div>`;
      });
      for (const b of $$("button", el)) b.addEventListener("click", () => { sound(b.dataset.a === "yes" ? "landed" : "hush"); answer(b.dataset.a === "yes"); });
    }
    function answer(yes) {
      morph(el, () => {
        el.innerHTML = yes
          ? `<div class="done"><span class="check"><svg width="16" height="16" viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span><span class="swap-in">Window opened for Codex</span></div><div class="s swap-in" style="animation-delay:.08s">Your own tabs stay private.</div>`
          : `<div class="done swap-in"><span class="dot grey"></span>Codex was told no</div><div class="s swap-in" style="animation-delay:.08s">It will ask you to share a tab instead.</div>`;
      });
      clearTimeout(answer.t);
      answer.t = setTimeout(ask, 3200);
    }
    ask();
    demos.prompt = ask;
  })();

  // ------------------------------------------------------------ 6 · switches
  for (const row of $$("#toggles .toggle-row")) {
    const sw = $(".switch", row);
    const flip = () => {
      sw.classList.toggle("on");
      sound("latch", { pitch: sw.classList.contains("on") ? 1.12 : 0.89 });
      if (!reduce) sw.animate([{ scale: "1 1" }, { scale: "1.3 0.78", offset: 0.28 }, { scale: "0.95 1.05", offset: 0.62 }, { scale: "1 1" }], { duration: 560, easing: "ease-out", pseudoElement: "::after" });
    };
    row.addEventListener("click", flip);
    row.setAttribute("role", "switch");
    const sync = () => row.setAttribute("aria-checked", String(sw.classList.contains("on")));
    row.addEventListener("click", sync); sync();
  }

  // ------------------------------------------------------------ 7 · network
  (() => {
    const net = $("#net");
    const reqs = [["GET", "/api/invoices?month=3", 200], ["POST", "/api/session/refresh", 200], ["GET", "/api/customers/482", 200], ["PUT", "/api/invoices/1180", 422], ["GET", "/static/app.js", 200], ["POST", "/api/invoices/1180/send", 200], ["GET", "/api/notifications", 304]];
    let k = 0;
    function add() {
      const [m, u, c] = reqs[k++ % reqs.length];
      const row = document.createElement("div");
      row.className = "req";
      row.innerHTML = `<span class="m">${m}</span><span class="u">${esc(u)}</span><span class="c ${c >= 400 ? "bad" : ""}">${c}</span>`;
      net.appendChild(row);
      while (net.children.length > 7) net.firstElementChild.remove();
    }
    for (let j = 0; j < 4; j++) add();
    whenVisible(net, () => { const t = setInterval(add, 1300); return { stop() { clearInterval(t); } }; });
  })();

  // ------------------------------------------------------------ 8 · recording
  (() => {
    const el = $("#rec");
    el.innerHTML = `<div class="top-row"><span class="dot coral beat"></span><span class="t">Recording this visit</span><span class="count" aria-label="events"></span></div><div class="events"></div>`;
    const count = $(".count", el), evs = $(".events", el);
    let n = 0;
    function setCount(v) {
      const s = String(v).padStart(2, "0");
      if (count.children.length !== s.length) count.innerHTML = [...s].map(() => `<span class="col">${"0123456789".split("").map((d) => `<span>${d}</span>`).join("")}</span>`).join("");
      [...s].forEach((d, i) => { count.children[i].style.transition = "transform .55s var(--settle)"; count.children[i].style.transform = `translateY(${-30 * Number(d)}px)`; });
    }
    const steps = [["click", "<b>Invoices</b> in the sidebar"], ["page", "/invoices?month=3"], ["type", "Search: <b>Acme</b>"], ["type", 'Password: <span class="mask">••••••</span>'], ["api", "GET /api/invoices 200"], ["click", "<b>Export CSV</b>"]];
    let i = 0;
    function add() {
      const [k, t] = steps[i++ % steps.length];
      const ev = document.createElement("div");
      ev.className = "ev"; ev.innerHTML = `<span class="k">${k}</span><span>${t}</span>`;
      evs.prepend(ev);
      while (evs.children.length > 4) evs.lastElementChild.remove();
      setCount(++n % 100);
    }
    for (let j = 0; j < 3; j++) add();
    whenVisible(el, () => { const t = setInterval(add, 1600); return { stop() { clearInterval(t); } }; });
  })();

  // ------------------------------------------------------------ 9 · compare
  (() => {
    const c = $("#compare");
    let x = 50, dragging = false, auto = true;
    const set = (v) => { x = Math.max(0, Math.min(100, v)); c.style.setProperty("--x", `${x}%`); c.setAttribute("aria-valuenow", String(Math.round(x))); };
    const fromEvent = (e) => { const r = c.getBoundingClientRect(); set(((e.clientX - r.left) / r.width) * 100); };
    c.addEventListener("pointerdown", (e) => { sound("tick", { volume: 0.7 }); dragging = true; auto = false; c.setPointerCapture(e.pointerId); fromEvent(e); });
    c.addEventListener("pointermove", (e) => dragging && fromEvent(e));
    c.addEventListener("pointerup", () => (dragging = false));
    c.addEventListener("keydown", (e) => { if (e.key === "ArrowLeft") set(x - 5); if (e.key === "ArrowRight") set(x + 5); auto = false; });
    set(50);
    whenVisible(c, () => {
      let t0 = performance.now(), raf;
      const step = (t) => { if (auto && !reduce) set(50 + Math.sin((t - t0) / 1400) * 30); raf = requestAnimationFrame(step); };
      raf = requestAnimationFrame(step);
      return { stop() { cancelAnimationFrame(raf); } };
    });
  })();

  // ------------------------------------------------------------ 10 · watchers
  // Bencho's toast stack: the newest in front, two tucked behind; point at it
  // and it fans out into a list.
  (() => {
    const box = $("#toasts");
    const stack = globalThis.createToastStack(box, { keep: true });
    const alerts = [
      { kind: "bell", title: "Price dropped to ₹1,940", body: "Sony WH-1000XM6 on your watchlist", action: "Open" },
      { kind: "success", title: "Results are posted", body: "Semester 5 grades on the portal" },
      { kind: "bell", title: "Slot opened", body: "Passport appointment, 21 Nov, 10:30", action: "Book" },
      { kind: "warning", title: "Login expired", body: "The watcher needs you to sign in again" },
      { kind: "info", title: "No change", body: "Checked the order page at 14:20" },
    ];
    let k = 0;
    const push = (user) => {
      const a = alerts[k++ % alerts.length];
      if (user) sound("perk");
      stack.show({ ...a, onAction: (t, h) => { sound("landed"); h.update({ kind: "success", title: a.action === "Book" ? "Booked for 21 Nov" : "Opened in a new tab", body: "Tether used your session", action: null }); } });
    };
    box.addEventListener("click", (e) => { if (e.target.closest(".tst-x")) sound("hush", { volume: 0.7 }); });
    push(); push(); push();
    demos.toasts = () => push(true);
    whenVisible(box, () => { const t = setInterval(() => { if (!box.matches(":hover")) push(); }, 3200); return { stop() { clearInterval(t); } }; });
  })();

  }

  // replay buttons
  for (const b of $$("[data-replay]")) b.addEventListener("click", () => { if (b.dataset.replay !== "toasts") sound("tick", { pitch: 1.2 }); demos[b.dataset.replay]?.(); });

  // header mute switch
  (() => {
    const b = $("#mute");
    if (!b) return;
    const show = () => { b.setAttribute("aria-pressed", String(!soundOn)); b.setAttribute("aria-label", soundOn ? "Mute sounds" : "Turn sounds on"); b.classList.toggle("off", !soundOn); };
    b.addEventListener("click", () => {
      soundOn = !soundOn;
      localStorage.setItem("tether-sound", soundOn ? "on" : "off");
      show();
      const body = $(".body", b);
      body.classList.remove("bump"); void body.getBoundingClientRect(); body.classList.add("bump");
      sound("latch", { pitch: 1.12 });
    });
    show();
  })();

  // ------------------------------------------------------------ setup player
  // Jelly tabs with a sliding pill; the active tab fills like a segment timer
  // and the player moves on by itself until you pick a step. Each step is a
  // small live scene: a terminal, an agent picker, a popup pairing itself,
  // and a doctor checklist that ticks through.
  (() => {
    const player = $("#player");
    if (!player) return;
    const stage = $("#pstage");
    const tabs = $$('[role="tab"]', player);
    const jelly = $(".jelly", player);
    const STEP_MS = 9000;
    let step = 0, auto = true, run = 0, timer = 0;

    function moveJelly(prevIdx) {
      const t = tabs[step], r = t.getBoundingClientRect(), pr = t.parentElement.getBoundingClientRect();
      const from = jelly.getBoundingClientRect();
      jelly.style.width = `${r.width}px`;
      jelly.style.transform = `translateX(${r.left - pr.left - 6}px)`;
      // Stretch toward the move, then settle: the jelly.
      if (!reduce && prevIdx != null && prevIdx !== step) jelly.animate([{ scale: "1 1" }, { scale: "1.08 0.9", offset: 0.35 }, { scale: "0.98 1.03", offset: 0.7 }, { scale: "1 1" }], { duration: 520, easing: "ease-out" });
      void from;
    }

    const CMDS = {
      "Claude Code": { file: "Terminal", lines: ["claude mcp add --scope user tether -- node /path/to/tether/host/cli.js"] },
      Codex: { file: "~/.codex/config.toml", lines: ["[mcp_servers.tether]", "command = 'node'", "args = ['/path/to/tether/host/cli.js']"] },
      Cursor: { file: ".cursor/mcp.json", lines: ['{ "mcpServers": { "tether": {', '  "command": "node",', '  "args": ["/path/to/tether/host/cli.js"] } } }'] },
      "Gemini CLI": { file: "~/.gemini/settings.json", lines: ['{ "mcpServers": { "tether": {', '  "command": "node",', '  "args": ["/path/to/tether/host/cli.js"] } } }'] },
    };
    let agent = "Claude Code", browser = "Chrome";

    const copyBtn = `<button class="pcopy press" aria-label="Copy"><svg class="cp"><use href="#i-copy"/></svg><svg class="ok"><use href="#i-check"/></svg></button>`;

    async function typeLines(box, lines, alive, { out = [] } = {}) {
      box.innerHTML = "";
      for (const line of lines) {
        const row = document.createElement("div");
        row.className = "tl";
        row.innerHTML = `<span class="pr">›</span><span class="tx"></span><span class="caret"></span>`;
        box.appendChild(row);
        const tx = $(".tx", row);
        for (let i = 1; i <= line.length && alive(); i++) { tx.textContent = line.slice(0, i); await sleep(i % 3 ? 16 : 28); }
        tx.textContent = line;
        $(".caret", row).remove();
        await sleep(260);
      }
      for (const [cls, text] of out) {
        if (!alive()) return;
        const row = document.createElement("div");
        row.className = `tl out ${cls}`;
        row.innerHTML = text;
        box.appendChild(row);
        await sleep(380);
      }
    }

    const scenes = [
      // 1 · install
      (alive) => {
        stage.innerHTML = `<div class="scene sc-term"><div class="term"><div class="tbar"><span>Terminal</span>${copyBtn}</div><div class="tbody" id="tb"></div></div><p class="pnote"><b>setup</b> prints your pairing key and the lines for your agents, and registers the bridge Firefox uses.</p></div>`;
        $(".pcopy", stage).dataset.copy = "git clone https://github.com/udaysinh-git/tether.git\ncd tether && npm install && npm run build\nnode host/cli.js setup";
        typeLines($("#tb"), ["git clone https://github.com/udaysinh-git/tether.git", "cd tether && npm install && npm run build", "node host/cli.js setup"], alive, {
          out: [["ok", "built dist/chrome and dist/firefox"], ["ok", "Firefox bridge registered"], ["key", 'Pairing key <span class="k">k7qm-3vxa-p9dw-r2tn</span>']],
        });
      },
      // 2 · agent
      () => {
        const draw = (first) => {
          const c = CMDS[agent];
          const box = $(".cfg", stage);
          box.innerHTML = `<div class="tbar"><span>${esc(c.file)}</span>${copyBtn}</div><div class="tbody">${c.lines.map((l) => `<div class="tl"><span class="tx">${esc(l)}</span></div>`).join("")}</div>`;
          $(".pcopy", box).dataset.copy = c.lines.join("\n");
          if (!first && !reduce) $(".tbody", box).animate([{ opacity: 0, transform: "translateY(8px)", filter: "blur(5px)" }, { opacity: 1, transform: "none", filter: "blur(0)" }], { duration: 420, easing: "cubic-bezier(.22,1,.36,1)" });
        };
        stage.innerHTML = `<div class="scene sc-agent"><div class="seg" role="radiogroup" aria-label="Agent">${Object.keys(CMDS).map((a) => `<button role="radio" aria-checked="${a === agent}" class="press">${esc(a)}</button>`).join("")}</div><div class="term cfg"></div><p class="pnote">Any other MCP client runs the same command as a stdio server.</p></div>`;
        draw(true);
        for (const b of $$(".seg button", stage)) b.addEventListener("click", () => {
          agent = b.textContent; auto = false; sound("tick", { pitch: 1.3 });
          for (const x of $$(".seg button", stage)) x.setAttribute("aria-checked", String(x === b));
          draw();
        });
      },
      // 3 · extension
      (alive) => {
        const draw = async () => {
          const box = $(".popup", stage);
          if (browser === "Chrome") {
            box.innerHTML = `<div class="ph"><span class="pmark"></span><b>Tether</b><span class="pst"><span class="dot grey"></span>Not paired</span></div><div class="pcard"><div class="t">Pair with your agent</div><div class="s">Paste the key that setup printed.</div><div class="prow"><span class="pin"></span><span class="btn amber">Pair</span></div></div>`;
            const pin = $(".pin", box);
            await sleep(500);
            const key = "k7qm-3vxa-p9dw-r2tn";
            for (let i = 1; i <= key.length && alive(); i++) { pin.textContent = key.slice(0, i); await sleep(45); }
            if (!alive()) return;
            await sleep(350);
            $(".prow .btn", box).classList.add("down"); await sleep(140); $(".prow .btn", box).classList.remove("down");
            await sleep(120);
          }
          if (!alive()) return;
          morph(box, () => {
            box.innerHTML = `<div class="ph"><span class="pmark"></span><b>Tether</b><span class="pst"><span class="dot beat"></span>Ready</span></div><div class="pcard"><div class="t">${browser === "Chrome" ? "Paired" : "Signed add-on installed"}</div><div class="s">${browser === "Chrome" ? "Share a tab, or let your agent ask for one." : "No key needed. The bridge supplies it."}</div><span class="btn amber full">Share this tab</span></div>`;
          });
        };
        stage.innerHTML = `<div class="scene sc-ext"><div class="seg" role="radiogroup" aria-label="Browser">${["Chrome", "Firefox"].map((b) => `<button role="radio" aria-checked="${b === browser}" class="press">${b === "Chrome" ? "Chrome, Brave, Edge" : "Firefox, Zen"}</button>`).join("")}</div><div class="popup"></div><p class="pnote">${browser === "Chrome" ? "Open chrome://extensions, turn on Developer mode, load dist/chrome." : "Install the signed .xpi from Add-ons, then Install Add-on From File."}</p></div>`;
        for (const b of $$(".seg button", stage)) b.addEventListener("click", () => {
          browser = b.textContent.startsWith("Chrome") ? "Chrome" : "Firefox"; auto = false; sound("tick", { pitch: 1.3 });
          go(2, true);
        });
        draw();
      },
      // 4 · doctor
      async (alive) => {
        const checks = ["Node 22 found", "Host listening on 127.0.0.1:47821", "Pairing key in ~/.tether/config.json", "Claude Code has Tether", "Chrome extension connected", "Firefox bridge registered"];
        stage.innerHTML = `<div class="scene sc-doc"><div class="term"><div class="tbar"><span>Terminal</span>${copyBtn}</div><div class="tbody"><div class="tl"><span class="pr">›</span><span class="tx">node host/cli.js doctor</span></div><div class="checks"></div></div></div><p class="pnote done-note">Then ask your agent to do something in the browser.</p></div>`;
        $(".pcopy", stage).dataset.copy = "node host/cli.js doctor";
        const list = $(".checks", stage);
        for (const c of checks) {
          if (!alive()) return;
          const row = document.createElement("div");
          row.className = "chk";
          row.innerHTML = `<span class="tick"><svg viewBox="0 0 24 24"><path d="m6 12.5 4 4L18 8.5"/></svg></span><span>${esc(c)}</span>`;
          list.appendChild(row);
          await sleep(520);
        }
        if (!alive()) return;
        const all = document.createElement("div");
        all.className = "chk all";
        all.innerHTML = `<span class="dot beat"></span><b>All set.</b>`;
        list.appendChild(all);
      },
    ];

    function go(i, keep) {
      const prev = step;
      step = i;
      run++;
      const my = run;
      const alive = () => my === run;
      for (const [k, t] of tabs.entries()) {
        t.setAttribute("aria-selected", String(k === step));
        const f = $(".fill", t);
        f.getAnimations().forEach((a) => a.cancel());
        f.style.transform = k < step && auto ? "scaleX(1)" : "scaleX(0)";
      }
      moveJelly(prev);
      morph(stage, () => scenes[step](alive));
      if (!reduce) stage.firstElementChild?.animate([{ opacity: 0, filter: "blur(6px)", transform: "translateY(6px)" }, { opacity: 1, filter: "blur(0)", transform: "none" }], { duration: 460, easing: "cubic-bezier(.22,1,.36,1)" });
      clearTimeout(timer);
      if (auto && !keep) {
        $(".fill", tabs[step]).animate([{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }], { duration: STEP_MS, easing: "linear", fill: "forwards" });
        timer = setTimeout(() => { if (auto) go((step + 1) % tabs.length); }, STEP_MS);
      }
    }

    for (const [k, t] of tabs.entries()) t.addEventListener("click", () => { auto = false; sound("tick", { pitch: 1.2 }); go(k); });
    player.addEventListener("pointerenter", () => { if (auto) { clearTimeout(timer); $(".fill", tabs[step]).getAnimations().forEach((a) => a.pause()); } });
    player.addEventListener("pointerleave", () => {
      if (!auto) return;
      const a = $(".fill", tabs[step]).getAnimations()[0];
      if (!a) return;
      a.play();
      timer = setTimeout(() => { if (auto) go((step + 1) % tabs.length); }, Math.max(0, STEP_MS - (a.currentTime || 0)));
    });
    stage.addEventListener("click", async (e) => {
      const b = e.target.closest(".pcopy");
      if (!b) return;
      try { await navigator.clipboard.writeText(b.dataset.copy || ""); } catch {}
      b.classList.add("done"); sound("plop");
      setTimeout(() => b.classList.remove("done"), 1600);
    });
    addEventListener("resize", () => moveJelly());
    let started = false;
    new IntersectionObserver(([e]) => { if (e.isIntersecting && !started) { started = true; go(0); } }, { threshold: 0.3 }).observe(player);
    stage.innerHTML = '<div class="scene"></div>';
    requestAnimationFrame(() => moveJelly());
  })();

  // ------------------------------------------------------------ safety accordion
  // After Bencho's image accordion: the pane you point at springs open.
  (() => {
    const acc = $("#acc");
    if (!acc) return;
    const panes = $$(".pane", acc);
    const open = (p) => { if (p.classList.contains("open")) return; for (const x of panes) { x.classList.toggle("open", x === p); x.setAttribute("aria-expanded", String(x === p)); } sound("wisp", { volume: 0.6 }); };
    for (const p of panes) {
      p.setAttribute("aria-expanded", String(p.classList.contains("open")));
      p.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") open(p); });
      p.addEventListener("click", () => open(p));
      p.addEventListener("focus", () => open(p));
    }
  })();

  // ------------------------------------------------------------ questions
  // A list on the left with a sliding highlight; on the right the answer and
  // a small live picture of it. Answers come from the hidden FAQ list, which
  // also stays in the page for search engines.
  (() => {
    const qa = $("#qa");
    if (!qa) return;
    const list = $("#qlist"), panel = $("#qpanel"), jelly = $(".qjelly", list);
    const data = $$("#faqData dt").map((dt) => ({ q: dt.textContent.trim(), a: dt.nextElementSibling.innerHTML.trim() }));
    const lock = '<svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="9" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
    const tick = '<span class="tick"><svg viewBox="0 0 24 24"><path d="m6 12.5 4 4L18 8.5"/></svg></span>';
    let votes = 0, voted = false;

    // One picture per question, in the same order as the FAQ.
    const PICS = [
      () => `<div class="qv two">
          <div class="qwin dim"><div class="qbar"><i></i><span>Headless browser</span></div><div class="qbody"><b>Sign in</b><span class="qin"></span><span class="qin"></span><span class="qbtn">Continue</span></div></div>
          <div class="qwin"><div class="qbar"><i class="on"></i><span>Your browser</span></div><div class="qbody"><div class="qme"><span class="qav">U</span><span><b>Invoices</b><br><small>Signed in as you</small></span></div><span class="qrow"></span><span class="qrow s"></span><span class="qrow"></span></div></div>
        </div>`,
      () => `<div class="qv tabs">${["Inbox", "Invoices", "Bank", "Docs", "Chat"].map((t, i) => `<span class="qtab ${i === 1 ? "on" : ""}" style="--i:${i}">${i === 1 ? '<span class="dot"></span>' : lock}${t}</span>`).join("")}<p class="qcap">Only the tab you share is visible to the agent.</p></div>`,
      () => `<div class="qv chips">${["Chrome", "Brave", "Edge", "Firefox", "Zen", "LibreWolf", "Floorp", "Waterfox"].map((b, i) => `<span class="qchip" style="--i:${i}">${tick}${b}</span>`).join("")}</div>`,
      () => `<div class="qv files">${[["dark-dashboard.user.css", "Stylus"], ["fill-timesheet.user.js", "Tampermonkey"], ["hide-banners.user.js", "Violentmonkey"]].map(([f, m], i) => `<div class="qfile" style="--i:${i}"><span class="fn">${f}</span><span class="arrow"></span><span class="mgr">${m}</span></div>`).join("")}</div>`,
      () => `<div class="qv flow"><span class="qnode">Claude Code</span><span class="qline"><i></i></span><span class="qnode core">Tether host</span><span class="qline"><i></i></span><span class="qnode">Your browser</span></div>`,
      () => `<div class="qv vote"><button class="qup press" type="button" aria-pressed="${voted}"><svg viewBox="0 0 24 24"><path d="M12 19V5M6 11l6-6 6 6"/></svg><span class="qcount">${votes}</span></button><div class="qidea"><b>Your idea goes here</b><small>The most upvoted ideas in the Discord get built first</small></div></div>`,
      () => `<div class="qv ticket"><div class="qticket"><span class="tk-l"><small>Early access</small><b>Tether</b><span>Ask in the Discord</span></span><span class="tk-r"><a class="pill-btn gold press" href="https://discord.gg/UcB8z8u4JP" rel="noopener">Join</a></span></div></div>`,
    ];

    list.insertAdjacentHTML("beforeend", data.map((d, i) => `<button role="tab" aria-selected="${i === 0}" class="qitem"><span class="qn">${String(i + 1).padStart(2, "0")}</span><span>${esc(d.q)}</span></button>`).join(""));
    const items = $$(".qitem", list);
    let cur = -1;

    function place() {
      const b = items[cur];
      jelly.style.height = `${b.offsetHeight}px`;
      jelly.style.transform = `translateY(${b.offsetTop}px)`;
    }
    function show(i) {
      if (i === cur) return;
      const prev = cur;
      cur = i;
      items.forEach((b, k) => b.setAttribute("aria-selected", String(k === i)));
      place();
      if (!reduce && prev >= 0) jelly.animate([{ scale: "1 1" }, { scale: "0.97 1.08", offset: 0.4 }, { scale: "1 1" }], { duration: 480, easing: "ease-out" });
      panel.innerHTML = `<div class="qans"><p class="qq">${esc(data[i].q)}</p><p class="qa-text">${data[i].a}</p></div>${PICS[i] ? PICS[i]() : ""}`;
      if (!reduce) panel.animate([{ opacity: 0, transform: "translateY(8px)", filter: "blur(6px)" }, { opacity: 1, transform: "none", filter: "blur(0)" }], { duration: 460, easing: "cubic-bezier(.22,1,.36,1)" });
      const up = $(".qup", panel);
      if (up) up.addEventListener("click", () => {
        voted = !voted; votes += voted ? 1 : -1;
        up.setAttribute("aria-pressed", String(voted));
        const c = $(".qcount", up);
        c.textContent = votes;
        sound(voted ? "landed" : "hush", { volume: 0.7 });
        if (!reduce) c.animate([{ transform: `translateY(${voted ? 10 : -10}px)`, opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 380, easing: "cubic-bezier(.22,1,.36,1)" });
      });
    }
    items.forEach((b, i) => {
      b.addEventListener("click", () => { if (i !== cur) sound("tick", { pitch: 1.3, volume: 0.8 }); show(i); });
      b.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") show(i); });
    });
    list.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      e.preventDefault();
      const n = (cur + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
      items[n].focus(); show(n);
    });
    addEventListener("resize", place);
    show(0);
    document.fonts?.ready.then(place);
  })();

  // ------------------------------------------------------------ copy fields
  for (const b of $$(".copy button")) {
    b.addEventListener("click", async () => {
      try { await navigator.clipboard.writeText($("pre", b.parentElement).textContent); } catch {}
      b.classList.add("done");
      sound("plop");
      setTimeout(() => b.classList.remove("done"), 1600);
    });
  }

  // ------------------------------------------------------------ FAQ frames
  (() => {
    const faq = $(".faq");
    if (!faq) return;
    for (const q of $$(".q", faq)) {
      $("button", q).addEventListener("click", () => {
        const open = !q.classList.contains("open");
        sound(open ? "wisp" : "hush", { volume: 0.8 });
        for (const o of $$(".q", faq)) { o.classList.remove("open"); $("button", o).setAttribute("aria-expanded", "false"); }
        q.classList.toggle("open", open);
        $("button", q).setAttribute("aria-expanded", String(open));
        faq.classList.toggle("has-open", open);
      });
    }
  })();

  // back to top
  $("#totop")?.addEventListener("click", () => { sound("whisk", { pitch: 1.4 }); scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" }); });

  // ------------------------------------------------------------ no copying
  // Selection is off in CSS; this also stops copy, cut, drag and the context
  // menu. The Copy buttons write to the clipboard directly, so they still work.
  for (const ev of ["copy", "cut", "dragstart", "contextmenu", "selectstart"]) document.addEventListener(ev, (e) => e.preventDefault());
  document.addEventListener("keydown", (e) => {
    if (e.target.closest?.("input")) return;
    if ((e.ctrlKey || e.metaKey) && ["c", "x", "a", "s", "u"].includes(e.key.toLowerCase())) e.preventDefault();
  });

  // ------------------------------------------------------------ in view
  const io = new IntersectionObserver((es) => { for (const e of es) if (e.isIntersecting) { e.target.classList.add("seen"); io.unobserve(e.target); } }, { threshold: 0.15 });
  for (const el of $$(".inview")) io.observe(el);
})();
