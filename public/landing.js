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

  var nav = document.getElementById("nav");
  var menuBtn = document.getElementById("menuBtn");
  var mobileMenu = document.getElementById("mobileMenu");
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ── Nav: shadow once scrolled ────────────────────────────────
  function onScroll() { if (nav) nav.classList.toggle("scrolled", window.scrollY > 12); }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // ── Mobile menu ──────────────────────────────────────────────
  function setMenu(open) {
    if (!menuBtn || !mobileMenu) return;
    mobileMenu.classList.toggle("open", open);
    menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
    menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  }
  if (menuBtn && mobileMenu) {
    menuBtn.addEventListener("click", function () { setMenu(!mobileMenu.classList.contains("open")); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") setMenu(false); });
  }

  // ── In-page links: smooth scroll, close the menu ─────────────
  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener("click", function (event) {
      var href = link.getAttribute("href");
      if (!href || href.length < 2) return;
      var target = document.querySelector(href);
      if (!target) return;
      event.preventDefault();
      setMenu(false);
      if (href === "#top") window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
      else target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
      if (history.replaceState) history.replaceState(null, "", href === "#top" ? location.pathname : href);
    });
  });

  // ── Tour video: pause/play control, reduced motion, "watch" button ──
  var reel = document.getElementById("reel");
  var video = document.getElementById("tour");
  var toggle = document.getElementById("reelToggle");
  var tourBtn = document.getElementById("tourBtn");
  function syncToggle() {
    if (!reel || !video || !toggle) return;
    var paused = video.paused;
    reel.classList.toggle("paused", paused);
    toggle.setAttribute("aria-label", paused ? "Play the tour video" : "Pause the tour video");
  }
  function play() { if (!video) return; var p = video.play(); if (p && p.catch) p.catch(function () { syncToggle(); }); }
  if (video) {
    video.muted = true;
    if (reduceMotion) { video.removeAttribute("autoplay"); video.pause(); }
    video.addEventListener("play", syncToggle);
    video.addEventListener("pause", syncToggle);
    syncToggle();
    // Save data and CPU: pause while the video is off screen, resume when it's back (unless the visitor paused it).
    var userPaused = reduceMotion;
    if (toggle) toggle.addEventListener("click", function () {
      if (video.paused) { userPaused = false; play(); } else { userPaused = true; video.pause(); }
    });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) { if (!userPaused && video.paused) play(); }
          else if (!video.paused) video.pause();
        });
      }, { threshold: 0.25 }).observe(video);
    }
    if (tourBtn) tourBtn.addEventListener("click", function () {
      userPaused = false;
      try { video.currentTime = 0; } catch (e) { /* not seekable yet */ }
      play();
      var r = reel.getBoundingClientRect();
      if (r.top < 70 || r.bottom > window.innerHeight) reel.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
    });
  }

  // ── Balcony / Backyard / Farm tabs ───────────────────────────
  var tabs = Array.prototype.slice.call(document.querySelectorAll(".env-tab"));
  function selectTab(tab, focus) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute("aria-selected", on ? "true" : "false");
      t.tabIndex = on ? 0 : -1;
      var panel = document.getElementById(t.getAttribute("aria-controls"));
      if (panel) {
        panel.hidden = !on;
        if (on) panel.classList.add("visible");
      }
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

  // ── Reveal on scroll ─────────────────────────────────────────
  var reveals = document.querySelectorAll(".reveal");
  if (reduceMotion || !("IntersectionObserver" in window)) {
    reveals.forEach(function (el) { el.classList.add("visible"); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add("visible"); io.unobserve(entry.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    reveals.forEach(function (el) { io.observe(el); });
  }
})();
