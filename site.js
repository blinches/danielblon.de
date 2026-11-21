/* Stay With Me landing page. Plain JS, no libraries, no cookies, no storage, no tracking.
   Everything a visitor needs is already in the HTML. This file adds: the other three loops and the
   glitch between them, the menu arrow and the pick flash, the email step, and the "out" mode. */
(function () {
  "use strict";

  var cfg = window.SWM_CONFIG || {};
  var mode = cfg.mode === "out" ? "out" : "pre";
  var byId = function (id) { return document.getElementById(id); };
  var ART = "assets/art/";
  var calm = false;
  var touch = false;
  try { calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { calm = false; }
  try { touch = window.matchMedia("(pointer: coarse)").matches; } catch (e) { touch = false; }

  function webUrl(u) {
    return typeof u === "string" && /^https?:\/\//i.test(u.trim()) ? u.trim() : "";
  }

  // ?s=ig, ?s=tt ... letters, digits and dash only, 20 characters at most.
  function readSource() {
    var s = "";
    try { s = new URLSearchParams(window.location.search).get("s") || ""; } catch (e) { s = ""; }
    s = s.replace(/[^A-Za-z0-9-]/g, "").slice(0, 20);
    return s || "direct";
  }

  function setLink(id, url) {
    var a = byId(id);
    var u = webUrl(url);
    if (a && u) { a.href = u; }
  }

  setLink("ig-link", cfg.instagramUrl);
  setLink("tt-link", cfg.tiktokUrl);

  var stage = byId("stage");
  var menu = byId("menu");
  var openBtn = byId("email-open");
  var backBtn = byId("email-back");
  var form = byId("signup");
  var field = byId("field");
  var email = byId("email");
  var trap = byId("hp-field");
  var button = byId("signup-btn");
  var say = byId("say");
  var busy = false; // true while a picked button is flashing: nothing else is picked and the picture does not switch

  /* A line in a box. The four lines the kit drew are art; anything else is the empty box with real text
     (two short lines), set in a heavy sans in the film's white. Screen readers get the words either way. */
  var LINES = {
    hello: { art: "line_1_in_box", text: "stay with me. new song, december 11." },
    note: { art: "line_2_in_box", text: "one email on december 11. nothing else." },
    ok: { art: "line_3_in_box", text: "you're in. see you december 11." },
    soon: { art: "line_4_in_box", text: "signup opens soon. nothing was sent." },
    noteNext: { rows: ["one email for the next song.", "nothing else."] },
    okNext: { rows: ["you're in. you'll hear", "about the next one."] },
    badEmail: { rows: ["that email doesn't look right.", "try again."] },
    busy: { rows: ["too many tries.", "give it a few minutes."] },
    failed: { rows: ["that didn't go through.", "try again in a moment."] },
    offline: { rows: ["that didn't go through.", "check your connection."] }
  };
  function setBox(box, key, quiet) {
    var line = LINES[key];
    var img = box.querySelector("img");
    var p = box.querySelector(".box-text");
    var words = line.text || line.rows.join(" ");
    img.src = ART + (line.art || "box_empty") + ".png";
    img.alt = line.art ? words : "";
    p.textContent = "";
    if (line.rows) {
      line.rows.forEach(function (row, i) {
        if (i) { p.appendChild(document.createElement("br")); }
        p.appendChild(document.createTextNode(row));
      });
    }
    p.hidden = !line.rows;
    if (!quiet) { say.textContent = words; }
  }

  // ---------------------------------------------------------------- the picture: four loops, a glitch between them
  (function film() {
    var holder = byId("film");
    var first = byId("loop");
    if (!holder || !first) { return; }
    if (calm) { // the still only: no video, no transitions, nothing fetched
      try { first.pause(); } catch (e) { /* not playing */ }
      holder.removeChild(first);
      return;
    }
    var saver = false;
    try { saver = !!(navigator.connection && navigator.connection.saveData); } catch (e) { saver = false; }

    var LOOPS = ["loop_1_asleep", "loop_2_house", "loop_3_bedroom", "loop_4_street"];
    var DIR = "assets/loops/";
    var cur = first, at = 0, passes = 0, last = 0, next = null, trans = null, switching = false;

    function make() {
      var v = document.createElement("video");
      v.className = "pic";
      v.muted = true; v.defaultMuted = true; v.playsInline = true; v.preload = "auto";
      v.setAttribute("muted", ""); v.setAttribute("playsinline", ""); v.setAttribute("webkit-playsinline", "");
      v.setAttribute("disablepictureinpicture", ""); v.setAttribute("disableremoteplayback", "");
      v.setAttribute("tabindex", "-1"); v.width = 360; v.height = 640;
      holder.insertBefore(v, byId("poster").nextSibling); // above the still, under whatever is showing
      return v;
    }
    function play(v, onFail) {
      var p;
      try { p = v.play(); } catch (e) { if (onFail) { onFail(); } return; }
      if (p && typeof p.catch === "function") { p.catch(function () { if (onFail) { onFail(); } }); }
    }
    // Fetch a clip and get its first frame decoded while it sits under the showing one, then hold it at frame 0.
    function prime(v, file) {
      v.primed = false;
      var held = function () {
        v.removeEventListener("playing", held);
        try { v.pause(); v.currentTime = 0; } catch (e) { /* stays where it is */ }
        v.primed = true;
      };
      v.addEventListener("playing", held);
      v.src = DIR + file + ".mp4";
      try { v.load(); } catch (e) { /* src alone is enough */ }
      play(v);
    }
    function ready(v) { return !!v && v.primed === true && v.readyState >= 3 && !v.seeking; }
    function drop(v) {
      if (!v) { return; }
      try { v.pause(); } catch (e) { /* already stopped */ }
      v.removeAttribute("src");
      while (v.firstChild) { v.removeChild(v.firstChild); }
      try { v.load(); } catch (e) { /* nothing loaded */ }
      if (v.parentNode) { v.parentNode.removeChild(v); }
    }
    function raise(v) {
      Array.prototype.forEach.call(holder.querySelectorAll("video"), function (x) {
        if (x === v) { x.classList.add("is-top"); } else { x.classList.remove("is-top"); }
      });
    }
    // Run fn once v has put a frame on screen. The frame before it stays visible until then: no black flash.
    function onFrame(v, fn) {
      var done = false;
      var go = function () { if (!done) { done = true; fn(); } };
      if (typeof v.requestVideoFrameCallback === "function") { v.requestVideoFrameCallback(go); }
      var tick = function () { if (v.currentTime > 0) { v.removeEventListener("timeupdate", tick); go(); } };
      v.addEventListener("timeupdate", tick);
    }
    // The next loop and its transition are fetched only while the current loop plays (after its first pass).
    function fetchNext() {
      if (saver || next) { return; }
      next = make(); prime(next, LOOPS[(at + 1) % 4]);
      trans = make(); prime(trans, "transition_" + (at + 1) + "_to_" + ((at + 1) % 4 + 1));
    }
    function again() { // one more pass of the same loop; try the switch at its next end
      passes += 1; last = 0; cur.loop = true;
      try { cur.currentTime = 0; } catch (e) { /* plays on from where it is */ }
      play(cur);
      fetchNext();
    }
    function land(old, used) { // loop N+1 from frame 0
      next.loop = true;
      onFrame(next, function () {
        raise(next); drop(old); drop(used); if (trans !== used) { drop(trans); }
        cur = next; next = null; trans = null; at = (at + 1) % 4; passes = 0; last = 0; switching = false;
        watch(cur);
      });
      play(next, function () { drop(next); drop(trans); next = null; trans = null; switching = false; again(); });
    }
    function change() { // loop N has reached its end
      if (switching) { return; }
      if (!ready(next) || busy || document.hidden) { again(); return; }
      switching = true;
      var old = cur;
      if (!ready(trans)) { land(old, null); return; }
      var t = trans;
      var over = function () { t.removeEventListener("ended", over); land(old, t); };
      t.addEventListener("ended", over);
      onFrame(t, function () { raise(t); });
      play(t, over);
    }
    function watch(v) {
      v.addEventListener("timeupdate", function () {
        if (v !== cur || switching) { return; }
        var t = v.currentTime;
        if (t < last - 1) { passes += 1; if (passes === 1) { fetchNext(); } }
        last = t;
        // from the second pass on, stop looping as soon as the next loop is ready, so this pass runs to its end
        if (v.loop && passes >= 1 && ready(next) && !busy) { v.loop = false; }
      });
      v.addEventListener("ended", function () { if (v === cur) { change(); } });
    }
    watch(cur);
  })();

  // ---------------------------------------------------------------- the menu arrow
  function setPlace(el, x, y, w, h) {
    el.style.setProperty("--x", String(x)); el.style.setProperty("--y", String(y));
    if (w) { el.style.setProperty("--w", String(w)); el.style.setProperty("--h", String(h)); }
  }
  function place(el, name) { return Number(el.style.getPropertyValue(name)) || 0; }
  function holderOf(el) { return el && el.closest ? el.closest(".menu, .signup") : null; }
  function items(holder) {
    return Array.prototype.filter.call(holder.querySelectorAll(".choice"), function (el) { return !el.hidden; });
  }
  function setCursor(el) {
    var holder = holderOf(el);
    if (!holder) { return; }
    var arrow = holder.querySelector(".arrow");
    items(holder).forEach(function (it) { if (it === el) { it.classList.add("is-cursor"); } else { it.classList.remove("is-cursor"); } });
    setPlace(arrow, place(el, "--x") - 18, place(el, "--y") + 17);
    arrow.hidden = false;
  }
  function cursorIndex(list) {
    for (var i = 0; i < list.length; i++) { if (list[i].classList.contains("is-cursor")) { return i; } }
    return 0;
  }
  function resetCursor(holder) {
    var list = items(holder);
    var arrow = holder.querySelector(".arrow");
    if (list.length) { setCursor(list[0]); } else if (arrow) { arrow.hidden = true; }
  }

  // The pick: the button flashes cream and ink every 2 film frames (83 ms) for half a second, stays cream, then the page acts.
  function flash(el, then) {
    if (calm) { el.classList.add("is-on"); if (then) { then(); } return; }
    busy = true;
    var n = 0;
    el.classList.add("is-on");
    var timer = setInterval(function () {
      n += 1;
      if (n % 2) { el.classList.remove("is-on"); } else { el.classList.add("is-on"); }
      if (n >= 6) { clearInterval(timer); busy = false; if (then) { then(); } }
    }, 83);
  }
  function unpick() {
    Array.prototype.forEach.call(stage.querySelectorAll(".btn.is-on"), function (el) { el.classList.remove("is-on"); });
  }

  // ---------------------------------------------------------------- "out" mode: OUT NOW, the listen buttons, no line
  var lineBox = byId("line");
  var eline = byId("eline");
  var showLine = mode === "pre";
  var noteKey = mode === "pre" ? "note" : "noteNext";
  var done = false;

  function artButton(el, name, label) {
    el.innerHTML = "";
    [["n", "_normal", label.toUpperCase()], ["s", "_selected", ""]].forEach(function (k) {
      var img = document.createElement("img");
      img.className = k[0]; img.src = ART + name + k[1] + ".png"; img.alt = k[2];
      if (!k[2]) { img.setAttribute("aria-hidden", "true"); }
      el.appendChild(img);
    });
    el.setAttribute("aria-label", label);
  }

  // The main button. The HTML ships it as PRE-SAVE ON SPOTIFY. With no pre-save link in config, or in "out"
  // mode, it goes back to FOLLOW ON SPOTIFY and the artist page.
  var mainLink = byId("follow-link");
  var presave = mode === "pre" ? webUrl(cfg.presaveUrl) : "";
  if (presave) {
    mainLink.href = presave;
  } else {
    artButton(mainLink, "follow_spotify", "Follow on Spotify");
    setLink("follow-link", cfg.spotifyArtistUrl);
  }
  // No signup address yet: the email choice would only say "signup opens soon", so it is put away.
  if (mode === "pre" && !webUrl(cfg.signupEndpoint)) { openBtn.hidden = true; }

  if (mode === "out") {
    document.documentElement.setAttribute("data-mode", "out");
    byId("tag-art").src = ART + "tag_outnow.png";
    byId("tag-art").alt = "OUT NOW";
    setPlace(byId("tag"), 245, 14, 103, 27);
    byId("sr-when").textContent = "Out now.";
    say.textContent = "";
    artButton(openBtn, "email_next_1line", "Email me the next one");

    var stores = [["spotify", "spotify", "Spotify"], ["apple", "apple_music", "Apple Music"], ["youtube", "youtube", "YouTube"], ["bandcamp", "bandcamp", "Bandcamp"]];
    var links = cfg.listen || {};
    var made = [];
    stores.forEach(function (s) {
      var u = webUrl(links[s[0]]);
      if (!u) { return; }
      var a = document.createElement("a");
      a.className = "p btn choice";
      a.href = u; a.rel = "noopener";
      artButton(a, s[1], s[2]);
      a.querySelector(".n").alt = s[2].toUpperCase();
      a.setAttribute("aria-label", "Listen on " + s[2]);
      made.push(a);
    });
    // With no listen links filled in yet, the follow button stays so the page always has a main action.
    if (made.length > 0) {
      menu.removeChild(byId("follow-link"));
      made.forEach(function (a) { menu.insertBefore(a, openBtn); });
      // Kit README: stack from y 404, 58 apart. A fifth button does not fit under 404, so five start higher.
      var all = made.concat([openBtn]);
      var y = Math.min(404, 636 - 58 * all.length);
      all.forEach(function (el, i) {
        if (el === openBtn) { setPlace(el, 20, y + 58 * i, 320, 58); } else { setPlace(el, 62, y + 58 * i, 236, 58); }
      });
    }
  }
  lineBox.hidden = !showLine;
  resetCursor(menu);
  resetCursor(form);

  // ---------------------------------------------------------------- moving the arrow: hover, focus, touch, up / down
  [menu, form].forEach(function (holder) {
    holder.addEventListener("focusin", function (ev) {
      var el = ev.target.closest ? ev.target.closest(".choice") : null;
      if (el) { setCursor(el); }
    });
    holder.addEventListener("pointerover", function (ev) {
      var el = ev.target.closest ? ev.target.closest(".choice") : null;
      if (el && ev.pointerType === "mouse") { setCursor(el); }
    });
    holder.addEventListener("pointerdown", function (ev) {
      var el = ev.target.closest ? ev.target.closest(".choice") : null;
      if (el) { setCursor(el); }
    });
  });

  document.addEventListener("keydown", function (ev) {
    if (ev.altKey || ev.ctrlKey || ev.metaKey) { return; }
    var inForm = !form.hidden;
    if (inForm && ev.key === "Escape") { ev.preventDefault(); if (!busy && !sending) { closeForm(true); } return; }
    if (document.activeElement === email) { return; } // the field keeps its own keys
    var list = items(inForm ? form : menu);
    if (!list.length) { return; }
    var i = cursorIndex(list);
    if (ev.key === "ArrowDown" || ev.key === "ArrowUp") {
      ev.preventDefault();
      i = (i + (ev.key === "ArrowDown" ? 1 : list.length - 1)) % list.length;
      setCursor(list[i]);
      list[i].focus();
    } else if (ev.key === "Enter") {
      var on = document.activeElement;
      if (on && on !== document.body && on !== document.documentElement) { return; } // the focused control handles it
      ev.preventDefault();
      list[i].click();
    }
  });

  // A link is picked the moment it is pressed: it flashes while the browser is already on its way.
  // (Holding the jump back half a second would cost the tap its right to open the Spotify app.)
  menu.addEventListener("click", function (ev) {
    var a = ev.target.closest ? ev.target.closest("a.choice") : null;
    if (a && !busy) { setCursor(a); flash(a, null); setTimeout(rest, 4000); }
  });
  // Back on this page (or the link opened somewhere else): the picked button goes back to resting.
  function rest() { if (!busy && !sending && form.hidden) { unpick(); } }
  window.addEventListener("pageshow", rest);
  document.addEventListener("visibilitychange", function () { if (!document.hidden) { rest(); } });

  // ---------------------------------------------------------------- the email step: opens where the two buttons were
  var sending = false;

  function showForm() {
    setBox(eline, noteKey, false);
    email.hidden = false; field.hidden = false; button.hidden = false;
    form.hidden = false;
    resetCursor(form);
  }
  function hideMenu() {
    menu.hidden = true;
    lineBox.hidden = true;
    unpick();
  }
  function openForm() {
    if (busy || !form.hidden) { return; }
    setCursor(openBtn);
    if (touch) {
      // Phone: the field goes to the top of the stage and takes focus inside the tap itself,
      // so the keyboard comes up at once and cannot cover it. It stays up there until BACK.
      stage.classList.add("is-up");
      showForm();
      email.focus();
      flash(openBtn, hideMenu);
    } else {
      flash(openBtn, function () { hideMenu(); showForm(); email.focus(); });
    }
  }
  function closeForm(refocus) {
    form.hidden = true;
    stage.classList.remove("is-up");
    unpick();
    field.classList.remove("is-on");
    if (done) { openBtn.hidden = true; }
    menu.hidden = false;
    lineBox.hidden = !showLine;
    resetCursor(menu);
    if (refocus) {
      var list = items(menu);
      var to = !done && !openBtn.hidden ? openBtn : list[0];
      if (to) { to.focus(); }
    }
  }

  openBtn.addEventListener("click", openForm);
  backBtn.addEventListener("click", function () {
    if (busy || sending) { return; }
    flash(backBtn, function () { closeForm(true); });
  });

  email.addEventListener("focus", function () { field.classList.add("is-on"); if (touch) { stage.classList.add("is-up"); } });
  email.addEventListener("blur", function () { field.classList.remove("is-on"); });
  email.addEventListener("input", function () {
    if (email.getAttribute("aria-invalid") === "true") { email.removeAttribute("aria-invalid"); }
  });

  function looksLikeEmail(v) {
    return v.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
  }

  function send(value) {
    var endpoint = webUrl(cfg.signupEndpoint);
    if (!endpoint) {
      // Nothing is sent and nothing is kept. No fake success.
      if (mode === "pre") {
        setBox(lineBox, "soon", false);
        closeForm(true);
      } else {
        setBox(eline, "soon", false);
        unpick();
      }
      return;
    }

    sending = true;
    button.disabled = true; // stays cream while it sends
    button.setAttribute("aria-busy", "true");

    var ctrl = typeof AbortController === "function" ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, 12000) : null;

    fetch(endpoint, {
      method: "POST",
      mode: "cors",
      credentials: "omit",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: value,
        source: readSource(),
        ts: new Date().toISOString(),
        hp: trap ? trap.value : ""
      }),
      signal: ctrl ? ctrl.signal : undefined
    })
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (data) {
          return { status: res.status, ok: res.ok && data && data.ok === true };
        });
      })
      .then(function (r) {
        if (r.ok) {
          email.value = "";
          done = true;
          if (mode === "pre") {
            setBox(lineBox, "ok", false);
            closeForm(true);
          } else {
            // "out" mode has no line on the main screen, so the answer stays here with BACK.
            setBox(eline, "okNext", false);
            field.hidden = true; button.hidden = true;
            resetCursor(form);
            backBtn.focus();
          }
        } else if (r.status === 429) {
          setBox(eline, "busy", false);
        } else {
          setBox(eline, "failed", false);
        }
      })
      .catch(function () {
        setBox(eline, "offline", false);
      })
      .then(function () {
        if (timer) { clearTimeout(timer); }
        sending = false;
        button.disabled = false;
        button.removeAttribute("aria-busy");
        unpick();
      });
  }

  form.addEventListener("submit", function (ev) {
    ev.preventDefault();
    if (sending || busy) { return; }

    var value = email.value.trim();
    if (!looksLikeEmail(value)) {
      email.setAttribute("aria-invalid", "true");
      setBox(eline, "badEmail", false);
      email.focus();
      return;
    }
    email.removeAttribute("aria-invalid");
    setCursor(button);
    flash(button, function () { send(value); });
  });
})();
