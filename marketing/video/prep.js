// Builds the farm state after Parts 1-3 (onboarding, first sowing walk, chickens + first eggs) and saves it,
// so later episodes can start from it at any date.
const Rec = require('./rec'); const onboard = require('./onboard'); const walk = require('./walk'); const fs = require('fs');
(async () => {
  const r = await Rec.open({ out: 'out/prep' }); const p = r.p; r.recording = false;
  await onboard(r); await walk(r); r.recording = false;
  await r.tap('My Space'); await r.hold(0.4); await r.tap(p.getByRole('tab', { name: 'Animals' })); await r.hold(0.4);
  await r.tap('+ Add'); await r.hold(0.4);
  await p.locator('select').nth(1).selectOption({ label: 'Rhode Island Red' });
  await r.type(p.locator('input:not([type=number])').last(), 'Layer Flock');
  const cnt = p.locator('input[type=number]').first(); await cnt.fill(''); await r.type(cnt, '4');
  await r.tap(p.getByRole('button', { name: 'Add', exact: true })); await r.hold(0.8);
  await r.tap('Collect Eggs'); await r.hold(0.5); await r.tap(p.getByRole('button', { name: /Collect → Pantry/ })); await r.hold(1.0);
  await r.skip(1.0);
  const kv = await p.evaluate(() => { const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); o[k] = localStorage.getItem(k); } return o; });
  fs.mkdirSync('episodes', { recursive: true }); fs.writeFileSync('episodes/state_after_p3.json', JSON.stringify(kv));
  console.log('keys', Object.keys(kv).join(','), 'bytes', JSON.stringify(kv).length);
  await r.browser.close();
})();
