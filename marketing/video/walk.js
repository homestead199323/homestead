// Completes the 3-stop morning walk (unrecorded when r.recording=false) so plants are sown.
module.exports = async function walk(r) {
  const p = r.p; const nxt = () => p.locator('[role=dialog] button', { hasText: /next|Done 1 job/ }).last();
  await r.tap('Start morning walk'); await r.hold(0.4); await r.tap('Begin my walk'); await r.hold(0.8);
  for (let i = 0; i < 3; i++) { await r.hold(0.7); await r.tap('Done'); await r.hold(0.5); await r.tap(nxt()); await r.hold(0.3); }
  await r.hold(0.8); await r.tap('Back to my farm'); await r.hold(0.6);
};
