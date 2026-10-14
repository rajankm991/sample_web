//alert("Hello");
//document.write("Hello");

/* ============================================================
   Chat assistant
   Collects name, email, number and message in a short chat, then
   sends them through the "Get in Touch" form's own endpoint and
   access key, so the message reaches the owner like a normal
   form submission.
   ============================================================ */
(function () {
  "use strict";

  const root = document.getElementById("rmChat");
  const form = document.querySelector("#contact form");
  if (!root) return;

  const $ = s => root.querySelector(s);
  const launch = $(".rm-launch"), panel = $(".rm-panel"), log = $(".rm-log"),
        chipBox = $(".rm-chips"), box = $(".rm-input"), sendBtn = $(".rm-send");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const wait = ms => new Promise(r => setTimeout(r, reduce ? 0 : ms));

  const FIELDS = [
    { key: "name", label: "Name", ph: "Your name",
      attrs: { inputmode: "text", autocomplete: "name" },
      ask: () => "What's your name?",
      clean: v => { v = v.replace(/\s+/g, " ").trim(); return v.length >= 2 && v.length <= 60 ? v : null; },
      err: "Please enter your name (2 to 60 characters)." },
    { key: "email", label: "Email", ph: "you@example.com",
      attrs: { inputmode: "email", autocomplete: "email" },
      ask: d => "Nice to meet you, " + d.name.split(" ")[0] + ". What's your email address?",
      clean: v => { v = v.trim(); return v.length <= 120 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? v : null; },
      err: "That email doesn't look right. It should look like name@example.com." },
    { key: "number", label: "Number", ph: "Phone number",
      attrs: { inputmode: "tel", autocomplete: "tel" },
      ask: () => "And your phone number? Include the country code if it's outside India.",
      clean: v => { const d = v.replace(/\D/g, ""); return d.length >= 7 && d.length <= 15 ? d : null; },
      err: "Please enter a phone number with 7 to 15 digits." },
    { key: "message", label: "Message", ph: "Type your message",
      attrs: { inputmode: "text", autocomplete: "off" },
      ask: () => "What would you like to tell Aryan?",
      clean: v => { v = v.trim(); return v.length >= 5 && v.length <= 1500 ? v : null; },
      err: "Please write a message between 5 and 1500 characters." }
  ];

  let mode = "idle";          // idle | ask | review | sending
  let step = 0, editing = false, busy = false, started = false, run = 0;
  let data = {};

  /* ---------- rendering ---------- */
  function bubble(who, content, extra) {
    const d = document.createElement("div");
    d.className = "rm-msg " + who + (extra ? " " + extra : "");
    if (typeof content === "string") d.textContent = content; else d.append(content);
    log.append(d); log.scrollTop = log.scrollHeight;
    return d;
  }
  function typing() {
    const d = document.createElement("div");
    d.className = "rm-typing"; d.innerHTML = "<i></i><i></i><i></i>";
    log.append(d); log.scrollTop = log.scrollHeight;
    return d;
  }
  // Bot speaks one or more lines. Returns false if the chat was reset meanwhile.
  async function say(...lines) {
    const my = run; busy = true; setChips([]);
    for (const t of lines) {
      const dots = typing();
      await wait(typeof t === "string" ? Math.min(250 + t.length * 12, 900) : 600);
      dots.remove();
      if (my !== run) return false;
      bubble("bot", t, typeof t === "string" ? "" : "rm-card");
    }
    busy = false; return true;
  }
  function setChips(items) {
    chipBox.replaceChildren();
    items.forEach(([label, fn, primary], i) => {
      const b = document.createElement("button"); b.style.setProperty("--i", i);
      b.type = "button"; b.className = "rm-chip" + (primary ? " primary" : ""); b.textContent = label;
      b.onclick = () => { if (busy) return; bubble("user", label); setChips([]); fn(); };
      chipBox.append(b);
    });
    log.scrollTop = log.scrollHeight;   // keep the latest message visible as the chips take space
  }
  function tune(f) {
    Object.entries(f.attrs).forEach(([k, v]) => box.setAttribute(k, v));
    box.placeholder = f.ph; box.focus();
  }
  function grow() { box.style.height = "auto"; box.style.height = Math.min(box.scrollHeight, 96) + "px"; }

  /* ---------- conversation ---------- */
  const menu = () => setChips([
    ["Message Aryan", beginForm, true],
    ["Where he's worked", showWorked],
    ["Resume", showResume],
    ["Photo album", () => jump("album", "Here are some photos of Aryan.")]
  ]);

  /* ---------- organizations (read from the Organizations section of the page) ---------- */
  function readOrgs() {
    return [...document.querySelectorAll("#organizations .org")].map(a => {
      const txt = s => { const e = a.querySelector(s); return e ? e.textContent.trim() : ""; };
      const img = a.querySelector(".org-logo img");
      return { name: txt("h3"), role: txt(".org-role"), period: txt(".org-period"),
               current: !!a.querySelector(".org-badge") || a.classList.contains("current"),
               logo: img ? img.getAttribute("src") : "" };
    }).filter(o => o.name);
  }
  async function showWorked() {
    const orgs = readOrgs();
    if (!orgs.length) { if (await say("I don't have the list of organizations right now. You can find it in the Organizations section.")) menu(); return; }
    const card = document.createElement("div");
    const p = document.createElement("p");
    p.textContent = "Aryan has worked with " + orgs.length + " organizations:";
    const list = document.createElement("div"); list.className = "rm-orgs";
    orgs.forEach(o => {
      const row = document.createElement("div"); row.className = "rm-org" + (o.current ? " current" : "");
      if (o.logo) {
        const box = document.createElement("div"); box.className = "rm-org-logo";
        const im = document.createElement("img"); im.src = o.logo; im.alt = ""; im.loading = "lazy";
        im.onerror = () => box.remove(); box.append(im); row.append(box);
      }
      const t = document.createElement("div"); t.className = "rm-org-text";
      const b = document.createElement("b"); b.textContent = o.name; t.append(b);
      const detail = [o.role, o.period].filter(Boolean).join(", ");
      if (detail) { const sp = document.createElement("span"); sp.textContent = detail; t.append(sp); }
      row.append(t);
      if (o.current) { const tag = document.createElement("span"); tag.className = "rm-org-tag"; tag.textContent = "Current"; row.append(tag); }
      list.append(row);
    });
    card.append(p, list);
    if (await say(card)) setChips([
      ["Show on the page", () => jump("organizations", "Taking you to the Organizations section.")],
      ["Resume", showResume],
      ["Message Aryan", beginForm, true]
    ]);
  }

  /* ---------- resume: real links so the browser opens / downloads them directly ---------- */
  async function showResume() {
    const open = document.querySelector(".pdf-actions a[target=_blank]") || document.querySelector(".pdf-actions a");
    const dl = document.querySelector(".pdf-actions a[download]");
    const stage = document.getElementById("pdfStage");            // the on-page resume viewer
    const stageSrc = stage && stage.dataset.src ? stage.dataset.src.split("#")[0] : "";
    const href = (open && open.getAttribute("href")) || stageSrc || "image/Resume.pdf";
    let fname = (dl && dl.getAttribute("download")) || "Aryan Mishra";
    if (!/\.pdf$/i.test(fname)) fname += ".pdf";

    const card = document.createElement("div");
    const p = document.createElement("p");
    p.textContent = "Here's Aryan's resume. Open it full screen in a new tab, or download a copy.";
    const links = document.createElement("div"); links.className = "rm-links";
    const a1 = document.createElement("a");
    a1.className = "rm-chip primary"; a1.href = href; a1.target = "_blank"; a1.rel = "noopener"; a1.textContent = "Open full resume";
    const a2 = document.createElement("a");
    a2.className = "rm-chip"; a2.href = (dl && dl.getAttribute("href")) || href; a2.setAttribute("download", fname); a2.textContent = "Download PDF";
    links.append(a1, a2); card.append(p, links);
    if (await say(card)) setChips([
      ["Show on the page", () => jump("resume", "Taking you to the resume section.")],
      ["Where he's worked", showWorked],
      ["Message Aryan", beginForm, true]
    ]);
  }

  async function greet() {
    mode = "idle";
    if (await say("Hi, I'm Aryan's assistant.", "I can pass a message to Aryan, tell you where he has worked, or share his resume. What would you like to do?")) menu();
  }

  async function beginForm() {
    data = {}; step = 0; editing = false; mode = "ask";
    if (await say("Sure. I'll ask for a few details and send them to Aryan through the Get in Touch form. He'll only use them to reply to you. Type \"cancel\" at any point to stop.")) askStep();
  }
  async function askStep() {
    const f = FIELDS[step];
    if (await say(f.ask(data))) tune(f);
  }

  async function review() {
    mode = "review";
    const card = document.createElement("div");
    const p = document.createElement("p"); p.textContent = "Here's what I'll send to Aryan:";
    const dl = document.createElement("dl");
    FIELDS.forEach(f => {
      const dt = document.createElement("dt"), dd = document.createElement("dd");
      dt.textContent = f.label; dd.textContent = data[f.key]; dl.append(dt, dd);
    });
    card.append(p, dl);
    if (await say(card)) reviewChips();
  }
  function reviewChips() {
    box.placeholder = 'Type "send" or pick an option';
    setChips([
      ["Send message", send, true],
      ...FIELDS.map(f => ["Edit " + f.label.toLowerCase(), () => edit(f.key)]),
      ["Cancel", cancel]
    ]);
  }
  async function edit(key) {
    step = FIELDS.findIndex(f => f.key === key); editing = true; mode = "ask";
    if (await say("Okay. What's the correct " + FIELDS[step].label.toLowerCase() + "?")) tune(FIELDS[step]);
  }

  async function cancel() {
    run++; data = {}; mode = "idle"; editing = false;
    if (await say("No problem. Nothing was sent.")) menu();
  }

  async function send() {
    mode = "sending";
    if (!(await say("Sending your message to Aryan…"))) return;
    busy = true; const my = run;
    const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 15000);
    try {
      if (!form) throw new Error("no form");
      const fd = new FormData(form);                       // includes the form's access key
      FIELDS.forEach(f => fd.set(f.key, data[f.key]));
      fd.set("subject", "New message from " + data.name + " (portfolio chatbot)");
      fd.set("source", "Chatbot on portfolio site");
      const res = await fetch(form.action, { method: "POST", headers: { Accept: "application/json" }, body: fd, signal: ctl.signal });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.success === false) throw new Error(json.message || res.status);
      if (my !== run) return;
      const email = data.email; data = {}; mode = "idle";
      if (await say("Done. Your message is on its way to Aryan.", "He'll reply to " + email + ".")) {
        setChips([["Send another message", beginForm, true], ["Close chat", close]]);
      }
    } catch (e) {
      if (my !== run) return;
      mode = "review";
      prefill();
      if (await say("I couldn't send that just now. I've filled in the Get in Touch form with your details, so you can also press Submit there.")) {
        setChips([["Try again", send, true], ["Open the form", () => jump("contact", "Your details are in the form below.")]]);
      }
    } finally { clearTimeout(timer); busy = false; }
  }
  function prefill() {
    if (!form) return;
    FIELDS.forEach(f => { const el = form.elements[f.key]; if (el) el.value = data[f.key] || ""; });
  }

  async function jump(id, msg) {
    const ok = await say(msg);
    const target = document.getElementById(id);
    if (target) target.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
    if (matchMedia("(max-width:600px)").matches) close();
    if (ok) menu();
  }

  /* ---------- input handling ---------- */
  const FAQ = [
    [/organi[sz]ation|compan|employer|worked|previous/, showWorked],
    [/resume|\bcv\b|experience|download|pdf/, showResume],
    [/photo|album|picture/, () => jump("album", "Here are some photos of Aryan.")],
    [/contact|reach|email|message|hire|touch|talk|call/, beginForm],
    [/who|about|work|skill|goal|cognizant/, async () => {
      const cur = readOrgs().find(o => o.current);
      const now = cur ? "Aryan currently works at " + cur.name + (cur.role ? " as " + cur.role : "") + ". " : "";
      if (await say(now + "He's looking for a team with clear communication and enjoys challenging projects.")) menu();
    }]
  ];

  async function handle(text) {
    const low = text.toLowerCase().trim();
    if (mode === "ask") {
      if (/^(cancel|stop|quit|exit)$/.test(low)) return cancel();
      const f = FIELDS[step], v = f.clean(text);
      if (v === null) { if (await say(f.err)) tune(f); return; }
      data[f.key] = v;
      if (editing) { editing = false; return review(); }
      if (++step < FIELDS.length) return askStep();
      return review();
    }
    if (mode === "review") {
      if (/^(yes|y|send|ok|okay|confirm|submit)$/.test(low)) return send();
      if (/^(no|cancel|stop)$/.test(low)) return cancel();
      const m = /(name|email|number|phone|message)/.exec(low);
      if (m && /edit|change|wrong|fix/.test(low)) return edit(m[1] === "phone" ? "number" : m[1]);
      if (await say('Please pick an option below, or type "send" to submit.')) reviewChips();
      return;
    }
    if (mode === "sending") return;
    const hit = FAQ.find(([re]) => re.test(low));
    if (hit) return hit[1]();
    if (await say("I can pass a message to Aryan, show where he has worked, or share his resume.")) menu();
  }

  function submit() {
    const text = box.value.trim();
    if (!text || busy) return;
    box.value = ""; grow();
    bubble("user", text);
    handle(text);
  }

  /* ---------- open / close ---------- */
  // On wide screens the chat docks to the left and the page shifts right (see .rm-docked in style.css).
  // Below this width it floats over the page instead.
  const DOCK_MIN = 1440;
  function syncDock() {
    const want = !panel.hidden && window.innerWidth >= DOCK_MIN;
    const html = document.documentElement;
    if (html.classList.contains("rm-docked") === want) return;
    const apply = () => html.classList.toggle("rm-docked", want);
    if (typeof keepScroll === "function") keepScroll(apply); else apply();   // keep the reader's place
  }
  window.addEventListener("resize", syncDock);

  function open() {
    panel.hidden = false; launch.setAttribute("aria-expanded", "true"); syncDock();
    if (!started) { started = true; greet(); }
    box.focus();
  }
  function close() { panel.hidden = true; launch.setAttribute("aria-expanded", "false"); syncDock(); launch.focus(); }
  function restart() {
    run++; busy = false; data = {}; mode = "idle"; editing = false;
    log.replaceChildren(); setChips([]); box.value = ""; grow(); greet();
  }

  launch.onclick = () => panel.hidden ? open() : close();
  $(".rm-close").onclick = close;
  $(".rm-restart").onclick = restart;
  sendBtn.onclick = submit;
  box.addEventListener("input", grow);
  box.addEventListener("keydown", e => {
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); submit(); }
  });
  panel.addEventListener("keydown", e => { if (e.key === "Escape") close(); });
})();
