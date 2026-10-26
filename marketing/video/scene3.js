// Part 3: the chickens move in (add flock -> daily jobs appear -> collect eggs to pantry). All 2D, slow and steady.
const Rec = require('./rec'); const onboard = require('./onboard'); const walk = require('./walk');
(async () => {
  const r = await Rec.open({ out: 'episodes/ep3/frames' }); const p = r.p; const t0 = Date.now();
  await onboard(r); await walk(r); r.recording = true; console.log('onboarded', Math.round((Date.now() - t0) / 1000) + 's');
  r.mark('home'); await r.hold(1.0);
  await r.tap('My Space'); await r.hold(0.5);
  await r.tap(p.getByRole('tab', { name: 'Animals' })); await r.hold(0.8);
  r.mark('animals');
  await r.tap('+ Add'); await r.hold(0.9);
  r.mark('form');
  await p.locator('select').nth(1).selectOption({ label: 'Rhode Island Red' }); await r.hold(0.9);
  await r.type(p.locator('input:not([type=number])').last(), 'Layer Flock'); await r.hold(0.4);
  const cnt = p.locator('input[type=number]').first(); await cnt.fill(''); await r.type(cnt, '4'); await r.hold(0.6);
  r.mark('typed');
  await r.tap(p.getByRole('button', { name: 'Add', exact: true })); await r.hold(1.4);
  r.mark('added');
  await r.tap(p.getByRole('tab', { name: 'Today' }).or(p.getByRole('button', { name: /^Today/ }).last()).first()); await r.hold(1.0);
  r.mark('today'); await r.scroll(500, 1.6); await r.hold(0.5); await r.scroll(520, 1.6); await r.hold(1.8);
  r.mark('jobs_end'); await r.scroll(-1020, 1.6); await r.hold(0.3);
  await r.tap('My Space'); await r.hold(0.6);
  if (!(await p.getByRole('button', { name: 'Collect Eggs' }).count())) { await r.tap(p.getByRole('tab', { name: 'Animals' })); await r.hold(0.6); }
  r.mark('animals2');
  await r.tap('Collect Eggs'); await r.hold(1.2);
  r.mark('eggs_open');
  await r.tap(p.getByRole('button', { name: /Collect → Pantry/ })); await r.hold(1.6);
  r.mark('end');
  console.log('done frames', r.n); await r.save();
})();
