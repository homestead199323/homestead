// Part 5: selling the surplus. Progress > Pantry > Sell > Record sale > Money.
const later = require('./later');
(async () => {
  const r = await later('episodes/ep5/frames'); const p = r.p;
  // unrecorded: harvest radish + zucchini so the pantry has stock (same as Part 4)
  await r.scroll(900, 0.6); await r.skip(0.4);
  await r.tap(p.getByRole('button', { name: /Harvest Radish/ }).first()); await r.skip(0.8);
  await r.tap(p.getByRole('button', { name: 'Harvest', exact: true }).first()); await r.skip(0.9);
  if (await p.getByText('Tap anywhere to continue').count()) { await r.tap(p.getByText('Tap anywhere to continue')); } await r.skip(1.0);
  await r.tap(p.getByRole('button', { name: 'Harvest', exact: true }).first()); await r.skip(0.9);
  if (await p.getByText('Tap anywhere to continue').count()) { await r.tap(p.getByText('Tap anywhere to continue')); await r.skip(0.6); }
  await r.tap(p.getByRole('button', { name: 'Close', exact: true })); await r.skip(0.6);
  await r.scroll(-1200, 0.5); await r.skip(0.5);
  r.recording = true;
  r.mark('today'); await r.hold(1.0);
  await r.tap(p.getByRole('button', { name: /^Progress/ }).last()); await r.hold(1.2);
  r.mark('progress');
  await r.tap(p.getByRole('tab', { name: 'Pantry' }).or(p.getByRole('button', { name: 'Pantry', exact: true })).first()); await r.hold(1.6);
  r.mark('pantry');
  await r.tap(p.getByRole('button', { name: 'Sell', exact: true }).nth(2)); await r.hold(1.0);
  r.mark('sell');
  const ins = p.locator('[role=dialog] input');
  const n = await ins.count(); console.log('dialog inputs', n);
  const qty = ins.nth(0); await qty.fill(''); await r.type(qty, '4'); await r.hold(0.4);
  const price = ins.nth(1); await price.fill(''); await r.type(price, '3.5'); await r.hold(0.4);
  const buyer = ins.nth(2); await r.type(buyer, 'Neighbour'); await r.hold(0.7);
  r.mark('filled');
  await r.tap(p.getByRole('button', { name: /Record sale/ })); await r.hold(1.4);
  r.mark('sold');
  await r.tap(p.getByRole('tab', { name: 'Money' }).or(p.getByRole('button', { name: 'Money', exact: true })).first()); await r.hold(1.8);
  r.mark('money'); await r.scroll(420, 1.6); await r.hold(1.8);
  r.mark('end');
  console.log('done frames', r.n); await r.save();
})();
