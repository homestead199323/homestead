// Part 4: first harvest. Today -> harvest sheet -> First Harvest badge -> Progress shows the food logged.
const later = require('./later');
(async () => {
  const r = await later('episodes/ep4/frames'); const p = r.p; r.recording = true;
  r.mark('today'); await r.hold(1.2);
  await r.scroll(900, 2.2); await r.hold(0.9);
  r.mark('jobs');
  await r.tap(p.getByRole('button', { name: /Harvest Radish/ }).first()); await r.hold(1.0);
  r.mark('sheet');
  await r.tap(p.getByRole('button', { name: 'Harvest', exact: true }).first()); await r.hold(0.9);
  r.mark('badge'); await r.hold(1.4);
  if (await p.getByText('Tap anywhere to continue').count()) { await r.tap(p.getByText('Tap anywhere to continue')); } await r.hold(0.8);
  r.mark('zuc');
  await r.tap(p.getByRole('button', { name: 'Harvest', exact: true }).first()); await r.hold(0.9);
  if (await p.getByText('Tap anywhere to continue').count()) { await r.tap(p.getByText('Tap anywhere to continue')); await r.hold(0.6); }
  r.mark('both'); await r.hold(0.6);
  await r.tap(p.getByRole('button', { name: 'Close', exact: true })); await r.hold(0.7);
  await r.tap(p.getByRole('button', { name: /^Progress/ }).last()); await r.hold(0.3);
  await r.scroll(-3000, 0.9); await r.hold(1.8);
  r.mark('progress'); await r.scroll(520, 1.8); await r.hold(2.0);
  r.mark('end');
  console.log('done frames', r.n); await r.save();
})();
