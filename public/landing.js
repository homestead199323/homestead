(function () {
  "use strict";
  // Email links (confirm sign-up, reset password) can come back to the Site URL
  // (this page) instead of /app. Forward the auth hash so the app can finish
  // signing the person in or let them choose a new password.
  if (/(^|[#&])(access_token|error_description|type)=/.test(location.hash)) {
    location.replace("/app" + location.hash);
    return;
  }
  document.documentElement.classList.add("js");

  var mm = function (q) { return window.matchMedia ? window.matchMedia(q) : { matches: false, addEventListener: function () {} }; };
  var reduceMotion = mm("(prefers-reduced-motion: reduce)").matches;
  var saveData = !!(navigator.connection && navigator.connection.saveData);
  var portrait = mm("(max-aspect-ratio: 4/5)");
  var hasIO = "IntersectionObserver" in window;

  // ── Nav: solid once scrolled (it sits on the dark hero at the top) ──
  var nav = document.getElementById("nav");
  function onScroll() { if (nav) nav.classList.toggle("scrolled", window.scrollY > 24); }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // ── Mobile menu ──
  var menuBtn = document.getElementById("menuBtn");
  var mobileMenu = document.getElementById("mobileMenu");
  function setMenu(open) {
    if (!menuBtn || !mobileMenu) return;
    mobileMenu.classList.toggle("open", open);
    if (nav) nav.classList.toggle("menu-open", open);
    menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
    menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  }
  if (menuBtn && mobileMenu) {
    menuBtn.addEventListener("click", function () { setMenu(!mobileMenu.classList.contains("open")); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") setMenu(false); });
  }

  // ── Hero: real 3D map footage behind the headline (poster only for reduced motion / data saver) ──
  var hero = document.getElementById("heroVideo");
  // MP4 (H.264) first, WebM (VP9) for browsers without H.264
  function setSources(video, v) {
    while (video.firstChild) video.removeChild(video.firstChild);
    [["data-" + v, "video/mp4"], ["data-" + v + "w", "video/webm"]].forEach(function (s) {
      var src = video.getAttribute(s[0]);
      if (!src) return;
      var el = document.createElement("source");
      el.src = src; el.type = s[1];
      video.appendChild(el);
    });
    video.load();
  }
  if (hero && !reduceMotion && !saveData) {
    hero.muted = true;
    hero.addEventListener("playing", function () { hero.classList.add("on"); });
    var heroWanted = true;
    var heroPlay = function () { var p = hero.play(); if (p && p.catch) p.catch(function () { /* autoplay refused: the poster stays */ }); };
    setSources(hero, portrait.matches ? "v" : "h");
    heroPlay();
    if (portrait.addEventListener) portrait.addEventListener("change", function () { hero.classList.remove("on"); setSources(hero, portrait.matches ? "v" : "h"); if (heroWanted) heroPlay(); });
    if (hasIO) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          heroWanted = entry.isIntersecting;
          if (heroWanted) heroPlay(); else hero.pause();
        });
      }, { threshold: 0.05 }).observe(hero.parentNode);
    }
  }

  // ── Tour video: vertical on portrait screens, loaded only when it's near, plays while in view ──
  var frame = document.getElementById("tourFrame");
  var tour = document.getElementById("tourVideo");
  var toggle = document.getElementById("tourToggle");
  var tourBtn = document.getElementById("tourBtn");
  var userPaused = reduceMotion, loadedFor = null;
  function sync() {
    if (!frame || !tour || !toggle) return;
    frame.classList.toggle("paused", tour.paused);
    toggle.setAttribute("aria-label", tour.paused ? "Play the tour video" : "Pause the tour video");
  }
  // The poster is set here, not in the HTML, so a phone downloads only the vertical one.
  function setPoster(v) {
    var src = tour.getAttribute(v === "v" ? "data-poster-v" : "data-poster-h");
    if (src && tour.getAttribute("poster") !== src) tour.setAttribute("poster", src);
  }
  function load() {
    var v = portrait.matches ? "v" : "h";
    if (loadedFor === v) return;
    loadedFor = v;
    setPoster(v);
    setSources(tour, v);
  }
  function play() { load(); var p = tour.play(); if (p && p.catch) p.catch(function () { sync(); }); }
  if (tour) {
    tour.muted = true;
    tour.addEventListener("play", sync);
    tour.addEventListener("pause", sync);
    // show the right poster before anything loads
    setPoster(portrait.matches ? "v" : "h");
    sync();
    if (toggle) toggle.addEventListener("click", function () {
      if (tour.paused) { userPaused = false; play(); } else { userPaused = true; tour.pause(); }
    });
    if (portrait.addEventListener) portrait.addEventListener("change", function () { var was = !tour.paused; loadedFor = null; setPoster(portrait.matches ? "v" : "h"); if (was) play(); });
    if (hasIO) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) { if (entry.isIntersecting) load(); });
      }, { rootMargin: "600px 0px" }).observe(tour);
      new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) { if (!userPaused && tour.paused) play(); }
          else if (!tour.paused) tour.pause();
        });
      }, { threshold: 0.45 }).observe(tour);
    } else { load(); }
  }
  if (tourBtn && tour) tourBtn.addEventListener("click", function () {
    userPaused = false;
    load();
    try { tour.currentTime = 0; } catch (e) { /* not seekable yet */ }
    play();
  });

  // ── In-page links: smooth scroll, close the menu ──
  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener("click", function (event) {
      var href = link.getAttribute("href");
      if (!href || href.length < 2) return;
      var target = document.querySelector(href);
      if (!target) return;
      event.preventDefault();
      setMenu(false);
      if (href === "#top") window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
      else target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: href === "#tour" ? "center" : "start" });
      if (history.replaceState) history.replaceState(null, "", href === "#top" ? location.pathname : href);
    });
  });

  // ── Balcony / Backyard / Farm tabs ──
  var tabs = Array.prototype.slice.call(document.querySelectorAll('[role="tab"]'));
  function selectTab(tab, focus) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute("aria-selected", on ? "true" : "false");
      t.tabIndex = on ? 0 : -1;
      var panel = document.getElementById(t.getAttribute("aria-controls"));
      if (panel) panel.hidden = !on;
    });
    if (focus) tab.focus();
  }
  tabs.forEach(function (tab, i) {
    tab.addEventListener("click", function () { selectTab(tab, false); });
    tab.addEventListener("keydown", function (e) {
      var next = null;
      if (e.key === "ArrowRight") next = tabs[(i + 1) % tabs.length];
      else if (e.key === "ArrowLeft") next = tabs[(i - 1 + tabs.length) % tabs.length];
      else if (e.key === "Home") next = tabs[0];
      else if (e.key === "End") next = tabs[tabs.length - 1];
      if (next) { e.preventDefault(); selectTab(next, true); }
    });
  });

  // ── Reveal on scroll ──
  var reveals = document.querySelectorAll(".reveal");
  if (reduceMotion || !hasIO) {
    reveals.forEach(function (el) { el.classList.add("visible"); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add("visible"); io.unobserve(entry.target); }
      });
    }, { threshold: 0, rootMargin: "0px 0px 10% 0px" });
    reveals.forEach(function (el) { io.observe(el); });
    // safety net for fast flings: anything that has reached the viewport stays revealed
    var sweeping = false;
    var sweep = function () {
      sweeping = false;
      var limit = window.innerHeight * 1.1;
      reveals.forEach(function (el) { if (!el.classList.contains("visible") && el.getBoundingClientRect().top < limit) el.classList.add("visible"); });
    };
    window.addEventListener("scroll", function () { if (!sweeping) { sweeping = true; requestAnimationFrame(sweep); } }, { passive: true });
  }
})();
