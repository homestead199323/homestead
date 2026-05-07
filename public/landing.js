var nav = document.getElementById("nav");
var navLinks = document.getElementById("navLinks");
var menuBtn = document.getElementById("menuBtn");
var scrollTopLink = document.querySelector("[data-scroll-top]");

window.addEventListener("scroll", function () {
  if (nav) nav.classList.toggle("scrolled", window.scrollY > 20);
});

document.querySelectorAll('a[href^="#"], [data-nav]').forEach(function (link) {
  link.addEventListener("click", function (event) {
    var href = this.getAttribute("href");
    if (!href || !href.startsWith("#")) return;

    var target = document.querySelector(href);
    if (!target) return;

    event.preventDefault();
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    if (navLinks) navLinks.classList.remove("mobile-nav-open");
  });
});

if (scrollTopLink) {
  scrollTopLink.addEventListener("click", function (event) {
    event.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

if (menuBtn && navLinks) {
  menuBtn.addEventListener("click", function () {
    navLinks.classList.toggle("mobile-nav-open");
  });
}

document.querySelectorAll("[data-launch-app]").forEach(function (button) {
  button.addEventListener("click", function () {
    window.location.href = "/app";
  });
});

var observer = new IntersectionObserver(function (entries) {
  entries.forEach(function (entry) {
    if (entry.isIntersecting) {
      entry.target.classList.add("visible");
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll(".fade-in").forEach(function (element) {
  observer.observe(element);
});
