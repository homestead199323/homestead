if ("serviceWorker" in navigator) {
  window.addEventListener("load", function () {
    // updateViaCache:'none' — never let the HTTP cache mask a new sw.js;
    // the browser re-checks it on every navigation so deploys roll out fast.
    navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" });
  });
}
